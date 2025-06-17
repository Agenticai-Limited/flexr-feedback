from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import List, Optional
from loguru import logger
from app.models.models import User, Feedback, QALogs, NoResultLogs, LowRelevanceResults, RerankResults
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

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[User]:
    """
    Get all users.
    """
    try:
        return db.query(User).offset(skip).limit(limit).all()
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

        if not user.is_admin:
            logger.warning(f"Login attempt by non-admin user: {username}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin users can log in."
            )

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

def get_feedback_summary(db: Session, limit: int = 10) -> List[dict]:
    """
    Get feedback summary grouped by query
    """
    try:
        return db.query(
            QALogs.query,
            func.count(Feedback.id).filter(Feedback.liked == True).label("satisfied_count"),
            func.count(Feedback.id).filter(Feedback.liked == False).label("unsatisfied_count"),
            func.count(Feedback.id).label("total_count")
        ).join(
            Feedback,
            QALogs.task_id == Feedback.message_id
        ).group_by(
            QALogs.query
        ).order_by(
            desc("unsatisfied_count")
        ).limit(limit).all()
    except Exception as e:
        logger.error(f"Error in get_feedback_summary: {str(e)}")
        raise

# QA Logs operations
def create_qa_log(db: Session, qa_log: schemas.QALogCreate) -> QALogs:
    """
    Create a new QA log.
    """
    db_qa_log = QALogs(**qa_log.model_dump())
    db.add(db_qa_log)
    db.commit()
    db.refresh(db_qa_log)
    return db_qa_log

def get_qa_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
) -> List[QALogs]:
    """
    Get QA logs with optional search and rerank results.
    """
    try:
        query = db.query(QALogs).options(joinedload(QALogs.rerank_results))
        if search:
            query = query.filter(QALogs.query.ilike(f"%{search}%"))
        return query.order_by(desc(QALogs.created_at)).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error in get_qa_logs: {str(e)}")
        raise

# Low Relevance Results operations
def create_low_relevance_result(db: Session, low_relevance_result: schemas.LowRelevanceResultCreate) -> LowRelevanceResults:
    """
    Create a new low relevance result log.
    """
    db_log = LowRelevanceResults(**low_relevance_result.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

def get_low_relevance_results(
    db: Session,
    skip: int = 0,
    limit: int = 100
) -> List[dict]:
    """
    Get low relevance results summary, grouped by query, with nested details.
    """
    try:
        # Construct a JSON object for each detailed row
        detail_object = func.json_build_object(
            "id", LowRelevanceResults.id,
            "query", LowRelevanceResults.query,
            "original_index", LowRelevanceResults.original_index,
            "relevance_score", LowRelevanceResults.relevance_score,
            "content", LowRelevanceResults.content,
            "created_at", LowRelevanceResults.created_at
        )

        return db.query(
            LowRelevanceResults.query,
            func.count(LowRelevanceResults.id).label("count"),
            func.avg(LowRelevanceResults.relevance_score).label("avg_relevance_score"),
            func.json_agg(detail_object).label("results")
        ).group_by(
            LowRelevanceResults.query
        ).order_by(
            desc("count")
        ).offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error in get_low_relevance_results: {str(e)}")
        raise

# Rerank Results operations
def create_rerank_result(db: Session, rerank_result: schemas.RerankResultCreate) -> RerankResults:
    """
    Create a new rerank result.
    """
    db_rerank_result = RerankResults(**rerank_result.model_dump())
    db.add(db_rerank_result)
    db.commit()
    db.refresh(db_rerank_result)
    return db_rerank_result

# No Result Logs operations
def create_no_result_log(db: Session, no_result_log: schemas.NoResultLogCreate) -> NoResultLogs:
    """
    Create a new no result log.
    """
    db_log = NoResultLogs(**no_result_log.model_dump())
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

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