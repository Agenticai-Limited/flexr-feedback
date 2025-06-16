from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Feedback schemas
class FeedbackBase(BaseModel):
    message_id: str
    liked: bool
    reason: Optional[str] = None

class FeedbackCreate(FeedbackBase):
    pass

class Feedback(FeedbackBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# QA Logs schemas
class QALogBase(BaseModel):
    task_id: str
    query: str
    response: str

class QALogCreate(QALogBase):
    pass

class QALog(QALogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Low Similarity Queries schemas
class LowSimilarityQueryBase(BaseModel):
    query_type: int = Field(..., ge=0, le=1)
    col: str
    query_content: str
    similarity_score: float
    metric_type: str
    results: Optional[str] = None

class LowSimilarityQueryCreate(LowSimilarityQueryBase):
    pass

class LowSimilarityQuery(LowSimilarityQueryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# No Result Logs schemas
class NoResultLogBase(BaseModel):
    query: str
    username: str
    task_id: str

class NoResultLogCreate(NoResultLogBase):
    pass

class NoResultLog(NoResultLogBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Summary schemas
class FeedbackSummary(BaseModel):
    query: str
    satisfied_count: int
    unsatisfied_count: int
    total_count: int

class NoResultSummary(BaseModel):
    query: str
    count: int 