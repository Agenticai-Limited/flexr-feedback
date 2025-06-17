from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

# User schemas
class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None

class UserCreate(UserBase):
    password: str
    is_admin: bool = False

class User(UserBase):
    id: int
    is_admin: bool
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

# RerankResult schemas
class RerankResultBase(BaseModel):
    task_id: str
    original_index: int
    content: Optional[str] = None
    similarity: float
    relevance: float
    metadata_: Optional[Any] = None

class RerankResultCreate(RerankResultBase):
    pass

class RerankResult(RerankResultBase):
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
    rerank_results: List[RerankResult] = []

    class Config:
        from_attributes = True

# Low Relevance Results schemas
class LowRelevanceResultBase(BaseModel):
    query: str
    original_index: int
    relevance_score: float
    content: Optional[str] = None

class LowRelevanceResultCreate(LowRelevanceResultBase):
    pass

class LowRelevanceResult(LowRelevanceResultBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# No Result Logs schemas
class NoResultLogBase(BaseModel):
    query: str
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

class LowRelevanceResultSummary(BaseModel):
    query: str
    count: int
    avg_relevance_score: float
    results: List[LowRelevanceResult] 