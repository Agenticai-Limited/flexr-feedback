from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, case
from typing import List, Optional
from loguru import logger
from datetime import datetime, timedelta
from app.models.models import User, Feedback, QALogs, NoResultLogs, LowRelevanceResults, RerankResults, OneNoteSyncLog, OneNotePageMetadata
from app.schemas import schemas
from app.core.security import verify_password
import bcrypt
from fastapi import HTTPException, status

# User operations
def get_user(db: Session, username: str) -> Optional[User]:
    """
    Get user by username
    """
    try:
        return db.query(User).filter(User.username == username).first()
    except Exception as e:
        logger.error(f"Error in get_user: {str(e)}")
        raise

def get_users(db: Session, skip: int = 0, limit: int = 100) -> dict:
    """
    Get all users with total count.
    """
    try:
        query_base = db.query(User)
        total = query_base.count()
        results = query_base.order_by(User.id).offset(skip).limit(limit).all()
        return {"total": total, "data": results}
    except Exception as e:
        logger.error(f"Error in get_users: {str(e)}")
        raise

def create_user(db: Session, user: schemas.UserCreate) -> User:
    """
    Create a new user.
    """
    db_user_exist = get_user(db, user.username)
    if db_user_exist:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    hashed_password = bcrypt.hashpw(user.password.encode('utf-8'), bcrypt.gensalt())
    db_user = User(
        username=user.username, 
        password=hashed_password.decode('utf-8'),
        full_name=user.full_name,
        is_admin=user.is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate user by verifying the password
    """
    try:
        user = get_user(db, username)
        if not user:
            logger.warning(f"User not found: {username}")
            return None

        # if not user.is_admin:
        #     logger.warning(f"Login attempt by non-admin user: {username}")
        #     raise HTTPException(
        #         status_code=status.HTTP_403_FORBIDDEN,
        #         detail="Only admin users can log in."
        #     )

        # Log the stored password hash for debugging
        logger.debug(f"Stored password hash: {user.password}")
        logger.debug(f"Password: {password}, password hashed: {bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())}")
        logger.debug(f"Compare password: {password.encode('utf-8')}, {user.password.strip().encode('utf-8')}")
        logger.debug(f"Is valid: {bcrypt.checkpw(password.encode('utf-8'), user.password.strip().encode('utf-8'))}")
        
        try:
            # Verify the password using bcrypt
            is_valid = bcrypt.checkpw(
                password.encode('utf-8'),
                user.password.strip().encode('utf-8')
            )
            if not is_valid:
                logger.warning(f"Invalid password for user: {username}")
                return None
            return user
        except ValueError as ve:
            logger.error(f"bcrypt validation error for user {username}: {str(ve)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Error validating password"
            )
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication error"
        )

# Feedback operations
def create_feedback(db: Session, feedback: schemas.FeedbackCreate) -> Feedback:
    """
    Create a new feedback entry.
    """
    db_feedback = Feedback(**feedback.model_dump())
    db.add(db_feedback)
    db.commit()
    db.refresh(db_feedback)
    return db_feedback

def get_feedback_list(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    liked: Optional[bool] = None
) -> dict:
    """
    Get a list of feedback entries with their corresponding queries,
    with optional filtering and total count.
    """
    try:
        query_base = db.query(
            QALogs.query,
            QALogs.response,
            Feedback.liked,
            Feedback.reason,
            Feedback.created_at
        ).join(
            Feedback,
            QALogs.task_id == Feedback.message_id
        )

        if liked is not None:
            query_base = query_base.filter(Feedback.liked == liked)
        
        total = query_base.count()

        results = query_base.order_by(
            desc(Feedback.created_at)
        ).offset(skip).limit(limit).all()
        
        return {"total": total, "data": results}

    except Exception as e:
        logger.error(f"Error in get_feedback_list: {str(e)}")
        raise

def get_feedback_dashboard_summary(db: Session, recent_limit: int = 5) -> dict:
    """
    Get a summary of feedback data for the dashboard.
    """
    try:
        total_feedback = db.query(Feedback).count()
        positive_feedback_count = db.query(Feedback).filter(Feedback.liked == True).count()
        negative_feedback_count = total_feedback - positive_feedback_count

        recent_feedback = db.query(
            Feedback.id,
            QALogs.query,
            Feedback.liked,
            Feedback.created_at
        ).join(
            QALogs,
            Feedback.message_id == QALogs.task_id
        ).distinct(QALogs.query).order_by(QALogs.query, desc(Feedback.created_at)).limit(recent_limit).all()

        return {
            "total_feedback": total_feedback,
            "positive_feedback_count": positive_feedback_count,
            "negative_feedback_count": negative_feedback_count,
            "recent_feedback": recent_feedback
        }
    except Exception as e:
        logger.error(f"Error in get_feedback_dashboard_summary: {str(e)}")
        raise

# QA Logs operations
def get_qa_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
) -> dict:
    """
    Get QA logs with optional search and rerank results, with total count.
    """
    try:
        query_base = db.query(QALogs)
        if search:
            query_base = query_base.filter(QALogs.query.ilike(f"%{search}%"))

        total = query_base.count()

        results = query_base.options(
            joinedload(QALogs.rerank_results)
        ).order_by(
            desc(QALogs.created_at)
        ).offset(skip).limit(limit).all()

        return {"total": total, "data": results}
    except Exception as e:
        logger.error(f"Error in get_qa_logs: {str(e)}")
        raise

# Low Relevance Results operations
def get_low_relevance_results(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> dict:
    """
    Get low relevance results summary, grouped by query, with nested details and total count.
    Results are sorted by the most recent occurrence in each group.
    """
    try:
        # Base query for filtering
        query_base = db.query(LowRelevanceResults)
        if start_date:
            query_base = query_base.filter(LowRelevanceResults.created_at >= start_date)
        if end_date:
            query_base = query_base.filter(LowRelevanceResults.created_at <= end_date)

        filtered_subquery = query_base.subquery()

        # Query for aggregation to get groups
        agg_query = db.query(
            filtered_subquery.c.query,
            func.count(filtered_subquery.c.id).label("count"),
            func.avg(filtered_subquery.c.relevance_score).label("avg_relevance_score"),
            func.max(filtered_subquery.c.created_at).label("latest_occurrence")
        ).group_by(filtered_subquery.c.query)

        # Get total count of groups
        total = agg_query.count()

        # Get paginated groups, sorted by the latest occurrence
        paginated_groups = agg_query.order_by(desc("latest_occurrence")).offset(skip).limit(limit).all()
        
        queries = [g.query for g in paginated_groups]

        if not queries:
            return {"total": total, "data": []}

        # Get all relevant detail rows for the queries in the current page
        details_query = query_base.filter(LowRelevanceResults.query.in_(queries)).order_by(desc(LowRelevanceResults.created_at)).all()

        # Map details to their respective query group
        details_map = {}
        for detail in details_query:
            if detail.query not in details_map:
                details_map[detail.query] = []
            details_map[detail.query].append(detail)

        # Combine groups with their details
        results = []
        for group in paginated_groups:
            results.append({
                "query": group.query,
                "count": group.count,
                "avg_relevance_score": group.avg_relevance_score,
                "results": details_map.get(group.query, [])
            })

        return {"total": total, "data": results}
    except Exception as e:
        logger.error(f"Error in get_low_relevance_results: {str(e)}")
        raise

# Rerank Results operations
def create_rerank_result(db: Session, rerank_result: schemas.RerankResultCreate) -> RerankResults:
    """
    Create a new rerank result.
    """
    data = rerank_result.model_dump()
    if 'similarity' in data:
        data.pop('similarity')
    db_rerank_result = RerankResults(**data)
    db.add(db_rerank_result)
    db.commit()
    db.refresh(db_rerank_result)
    return db_rerank_result

# No Result Logs operations
def get_no_result_summary(db: Session, limit: int = 10) -> List[dict]:
    """
    Get summary of no result queries
    """
    try:
        return db.query(
            NoResultLogs.query,
            func.count(NoResultLogs.id).label("count")
        ).group_by(
            NoResultLogs.query
        ).order_by(
            desc("count")
        ).limit(limit).all()
    except Exception as e:
        logger.error(f"Error in get_no_result_summary: {str(e)}")
        raise 

# OneNote Sync Log operations
def get_sync_stats(db: Session, page: int = 1, page_size: int = 20) -> dict:
    """
    Get paginated OneNote sync statistics, grouped by sync_run_id.
    """
    try:
        offset = (page - 1) * page_size

        # Subquery for grouping and counting actions
        action_subquery = db.query(
            OneNoteSyncLog.sync_run_id,
            func.sum(case((OneNoteSyncLog.action_type == 'CREATED', 1), else_=0)).label('created_count'),
            func.sum(case((OneNoteSyncLog.action_type == 'UPDATED', 1), else_=0)).label('updated_count'),
            func.sum(case((OneNoteSyncLog.action_type == 'DELETED', 1), else_=0)).label('deleted_count'),
            func.min(OneNoteSyncLog.log_timestamp).label('sync_date')
        ).group_by(OneNoteSyncLog.sync_run_id).subquery()

        # Main query for pagination and ordering
        query = db.query(action_subquery).order_by(desc(action_subquery.c.sync_run_id))
        
        total = query.count()
        paginated_results = query.offset(offset).limit(page_size).all()

        # Formatting the date part
        results = [
            {
                "sync_run_id": r.sync_run_id,
                "sync_date": r.sync_date.strftime('%Y-%m-%d'),
                "created_count": r.created_count,
                "updated_count": r.updated_count,
                "deleted_count": r.deleted_count
            } for r in paginated_results
        ]

        return {
            "total": total,
            "page": page,
            "pageSize": page_size,
            "data": results
        }
    except Exception as e:
        logger.error(f"Error in get_sync_stats: {str(e)}")
        raise

def get_sync_run_details(db: Session, sync_run_id: str) -> dict:
    """
    Get detailed page change information for a specific sync_run_id.
    """
    try:
        # Get all logs for the given sync_run_id
        logs = (
            db.query(OneNoteSyncLog.page_id, OneNoteSyncLog.action_type)
            .filter(OneNoteSyncLog.sync_run_id == sync_run_id)
            .all()
        )

        page_ids = [log.page_id for log in logs]
        
        # Get metadata for all affected pages
        metadata_query = (
            db.query(OneNotePageMetadata)
            .filter(OneNotePageMetadata.page_id.in_(page_ids))
            .all()
        )
        metadata_map = {meta.page_id: meta for meta in metadata_query}

        # Organize pages by action type
        result = {
            "sync_run_id": sync_run_id,
            "created_pages": [],
            "updated_pages": [],
            "deleted_pages": []
        }

        for log in logs:
            meta = metadata_map.get(log.page_id)
            page_detail = {
                "page_id": log.page_id,
                "section_name": meta.section_name if meta else "N/A",
                "title": meta.title if meta else "Info unavailable"
            }
            
            if log.action_type == 'CREATED':
                result["created_pages"].append(page_detail)
            elif log.action_type == 'UPDATED':
                result["updated_pages"].append(page_detail)
            elif log.action_type == 'DELETED':
                result["deleted_pages"].append(page_detail)
        
        return result
    except Exception as e:
        logger.error(f"Error in get_sync_run_details for sync_run_id {sync_run_id}: {str(e)}")
        raise 