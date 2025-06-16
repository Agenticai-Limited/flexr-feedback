from sqlalchemy import Column, Integer, String, Boolean, Text, Float, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.sql import func
from app.core.database import Base

class User(Base):
    """
    User model for authentication
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Feedback(Base):
    """
    User feedback model
    """
    __tablename__ = "feedback"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String, nullable=False, index=True)
    liked = Column(Boolean, nullable=False)
    reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index('ix_feedback_message_id_liked', 'message_id', 'liked'),
    )

class QALogs(Base):
    """
    Question and Answer logs model
    """
    __tablename__ = "qa_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, nullable=False, index=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index('ix_qa_logs_query_text', 'query', postgresql_using='gin'),
    )

class LowSimilarityQueries(Base):
    """
    Low similarity queries log model
    """
    __tablename__ = "low_similarity_queries"

    id = Column(Integer, primary_key=True, index=True)
    query_type = Column(Integer, nullable=False)
    col = Column(String, nullable=False)
    query_content = Column(Text, nullable=False)
    similarity_score = Column(Float, nullable=False, index=True)
    metric_type = Column(String, nullable=False)
    results = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        CheckConstraint('query_type IN (0, 1)', name='check_query_type'),
        Index('ix_low_similarity_queries_score_type', 'similarity_score', 'query_type'),
    )

class NoResultLogs(Base):
    """
    No result queries log model
    """
    __tablename__ = "no_result_logs"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(Text, nullable=False)
    username = Column(String, nullable=False, index=True)
    task_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index('ix_no_result_logs_query_text', 'query', postgresql_using='gin'),
    ) 