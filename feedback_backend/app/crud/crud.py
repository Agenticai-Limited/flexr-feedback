from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from loguru import logger
from app.models.models import User, Feedback, QALogs, LowSimilarityQueries, NoResultLogs
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

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate user by verifying the password
    """
    try:
        user = get_user(db, username)
        if not user:
            logger.warning(f"User not found: {username}")
            return None

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
def get_qa_logs(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None
) -> List[QALogs]:
    """
    Get QA logs with optional search
    """
    try:
        query = db.query(QALogs)
        if search:
            query = query.filter(QALogs.query.ilike(f"%{search}%"))
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error in get_qa_logs: {str(e)}")
        raise

# Low Similarity Queries operations
def get_low_similarity_queries(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None
) -> List[LowSimilarityQueries]:
    """
    Get low similarity queries with optional score range filter
    """
    try:
        query = db.query(LowSimilarityQueries)
        if min_score is not None:
            query = query.filter(LowSimilarityQueries.similarity_score >= min_score)
        if max_score is not None:
            query = query.filter(LowSimilarityQueries.similarity_score <= max_score)
        return query.offset(skip).limit(limit).all()
    except Exception as e:
        logger.error(f"Error in get_low_similarity_queries: {str(e)}")
        raise

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