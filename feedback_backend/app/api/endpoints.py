from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
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

# Authentication endpoints
@router.get("/me")
async def get_current_user_info(
    current_user: schemas.TokenData = Depends(get_current_user),
    db: Session = Depends(get_db)
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
        "username": user.username,
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
@router.get("/feedback/summary", response_model=List[schemas.FeedbackSummary])
async def get_feedback_summary(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get feedback summary endpoint
    """
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100"
        )
    return crud.get_feedback_summary(db=db, limit=limit)

# QA Logs endpoints
@router.get("/qa-logs", response_model=List[schemas.QALog])
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

# Low Similarity Queries endpoints
@router.get("/low-similarity", response_model=List[schemas.LowSimilarityQuery])
async def get_low_similarity_queries(
    skip: int = 0,
    limit: int = 100,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get low similarity queries endpoint
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
    if min_score is not None and (min_score < 0 or min_score > 1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum score must be between 0 and 1"
        )
    if max_score is not None and (max_score < 0 or max_score > 1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum score must be between 0 and 1"
        )
    if min_score is not None and max_score is not None and min_score > max_score:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum score cannot be greater than maximum score"
        )
    return crud.get_low_similarity_queries(
        db=db,
        skip=skip,
        limit=limit,
        min_score=min_score,
        max_score=max_score
    )

# No Result Logs endpoints
@router.get("/no-result/summary", response_model=List[schemas.NoResultSummary])
async def get_no_result_summary(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: schemas.TokenData = Depends(get_current_user)
):
    """
    Get no result queries summary endpoint
    """
    if limit < 1 or limit > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Limit must be between 1 and 100"
        )
    return crud.get_no_result_summary(db=db, limit=limit) 