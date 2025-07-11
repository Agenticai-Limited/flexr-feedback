from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta, datetime
from loguru import logger

from app.core.config import settings
from app.core.security import create_access_token, get_current_user
from app.core.database import get_db
from app.crud import crud
from app.schemas import schemas

router = APIRouter()

# Define a consistent success response format
def success_response(data):
    return {
        "success": True,
        "data": data
    }

# User endpoints
@router.post("/users", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
async def create_user(
    user: schemas.UserCreate, 
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Create new user.
    """
    db_user = crud.get_user(db, current_user.username)
    if not db_user or not db_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resource."
        )
    return crud.create_user(db=db, user=user)

@router.get("/users", response_model=schemas.UserResponse)
async def get_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get a list of users. Only for admin users.
    """
    db_user = crud.get_user(db, current_user.username)
    if not db_user or not db_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this resource."
        )
    return crud.get_users(db=db, skip=skip, limit=limit)

# Authentication endpoints
@router.get("/me")
async def get_current_user_info(
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get current user information endpoint
    Returns user info if token is valid, 401 if not
    """
    user = crud.get_user(db, current_user.username)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return success_response({
        "full_name": user.full_name,
        "username": user.username,
        "is_admin": user.is_admin,
        "is_authenticated": True
    })

@router.post("/logout")
async def logout(current_user: schemas.TokenData = Depends(get_current_user)):
    """
    Logout endpoint
    This endpoint mainly serves as a way for the client to validate their logout action
    The actual token invalidation should be handled by the client by removing the token
    """
    return success_response({
        "message": "Successfully logged out",
        "username": current_user.username
    })

@router.post("/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Login endpoint for user authentication
    """
    logger.debug(f"Login attempt for user: {username}")
    
    user = crud.authenticate_user(db, username, password)
    if not user:
        logger.warning(f"Authentication failed for user: {username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    logger.info(f"User successfully logged in: {username}")
    return success_response({"access_token": access_token, "token_type": "bearer"})

# Feedback endpoints
@router.get("/feedback", response_model=schemas.FeedbackResponse)
async def get_feedback_list(
    skip: int = 0,
    limit: int = 100,
    liked: Optional[bool] = None,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get a list of feedback entries with their corresponding queries.
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip value cannot be negative"
        )
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100"
        )
    return crud.get_feedback_list(db=db, skip=skip, limit=limit, liked=liked)

@router.get("/feedback/dashboard-summary", response_model=schemas.FeedbackDashboardSummary)
async def get_feedback_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get a summary of feedback data for the dashboard.
    """
    return crud.get_feedback_dashboard_summary(db=db)

# QA Logs endpoints
@router.get("/qa-logs", response_model=schemas.QALogResponse)
async def get_qa_logs(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get QA logs endpoint
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip value cannot be negative"
        )
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100"
        )
    return crud.get_qa_logs(db=db, skip=skip, limit=limit, search=search)

@router.get("/low-relevance-results", response_model=schemas.LowRelevanceResultResponse)
async def get_low_relevance_results(
    skip: int = 0,
    limit: int = 100,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get low relevance results summary, grouped by query.
    """
    if skip < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Skip value cannot be negative"
        )
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100"
        )
    return crud.get_low_relevance_results(
        db=db,
        skip=skip,
        limit=limit,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/no-result/summary", response_model=List[schemas.NoResultSummary])
async def get_no_result_summary(
    limit: int = 10,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get no result queries summary endpoint
    """
    if limit < 1 or limit > 1000: # Increased limit for exports
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 1000"
        )
    return crud.get_no_result_summary(db=db, limit=limit, start_date=start_date, end_date=end_date)

# OneNote Sync Log endpoints
@router.get("/onenote-sync/stats", response_model=schemas.OneNoteSyncStatsResponse)
async def get_onenote_sync_stats(
    page: int = 1,
    pageSize: int = 20,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get OneNote sync statistics, paginated.
    """
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be greater than 0")
    if pageSize < 1 or pageSize > 100:
        raise HTTPException(status_code=400, detail="PageSize must be between 1 and 100")
    
    return crud.get_sync_stats(db=db, page=page, page_size=pageSize)

@router.get("/onenote-sync/stats/{sync_run_id}", response_model=schemas.OneNoteSyncRunDetail)
async def get_onenote_sync_run_details(
    sync_run_id: str,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get details for a specific OneNote sync run.
    """
    details = crud.get_sync_run_details(db=db, sync_run_id=sync_run_id)
    if not details["created_pages"] and not details["updated_pages"] and not details["deleted_pages"]:
        raise HTTPException(status_code=404, detail="Sync run not found or has no logs")
        
    return details
