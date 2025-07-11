from sqlalchemy import Column, Integer, String, Boolean, Text, Float, DateTime, ForeignKey, CheckConstraint, Index, desc
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
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
    full_name = Column(Text, nullable=True)
    is_admin = Column(Boolean, nullable=False, server_default='false')
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

class RerankResults(Base):
    """
    Rerank results model
    """
    __tablename__ = "rerank_results"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, ForeignKey("qa_logs.task_id"), nullable=False, index=True)
    original_index = Column(Integer, nullable=False)
    content = Column(Text)
    relevance = Column(Float, nullable=False)
    metadata_ = Column("metadata", JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    qa_log = relationship("QALogs", back_populates="rerank_results")

class QALogs(Base):
    """
    Question and Answer logs model
    """
    __tablename__ = "qa_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String, nullable=False, index=True, unique=True)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    rerank_results = relationship(RerankResults, back_populates="qa_log", order_by=desc(RerankResults.relevance))

    __table_args__ = (
        Index('ix_qa_logs_query_text', 'query', postgresql_using='gin'),
    )

class LowRelevanceResults(Base):
    """
    Low relevance results log model
    """
    __tablename__ = "low_relevance_results"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(Text, nullable=False)
    original_index = Column(Integer, nullable=False)
    relevance_score = Column(Float, nullable=False, index=True)
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class NoResultLogs(Base):
    """
    No result queries log model
    """
    __tablename__ = "no_result_logs"

    id = Column(Integer, primary_key=True, index=True)
    query = Column(Text, nullable=False)
    task_id = Column(String, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index('ix_no_result_logs_query_text', 'query', postgresql_using='gin'),
    )

class OneNoteSyncLog(Base):
    """
    OneNote sync log model
    """
    __tablename__ = "onenote_sync_log"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    sync_run_id = Column(Text, nullable=False, index=True)
    page_id = Column(Text, nullable=False, index=True)
    action_type = Column(Text, nullable=False)
    log_timestamp = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        CheckConstraint(action_type.in_(['CREATED', 'UPDATED', 'DELETED'])),
        Index('ix_onenote_sync_log_run_id', 'sync_run_id'),
        Index('ix_onenote_sync_log_page_id', 'page_id'),
    )

class OneNotePageMetadata(Base):
    """
    OneNote page metadata model
    """
    __tablename__ = "onenote_pages_metadata"

    page_id = Column(Text, primary_key=True)
    last_modified_time = Column(DateTime(timezone=True))
    title = Column(Text)
    section_name = Column(Text) 