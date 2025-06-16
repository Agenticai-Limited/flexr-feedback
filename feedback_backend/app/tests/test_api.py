from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest
from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_password_hash

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_create_user(test_db):
    response = client.post(
        "/api/v1/users",
        json={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert "id" in data

def test_create_duplicate_user(test_db):
    # Create first user
    client.post(
        "/api/v1/users",
        json={"username": "testuser", "password": "testpassword"}
    )
    
    # Try to create duplicate user
    response = client.post(
        "/api/v1/users",
        json={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]

def test_login(test_db):
    # Create user
    client.post(
        "/api/v1/users",
        json={"username": "testuser", "password": "testpassword"}
    )
    
    # Login
    response = client.post(
        "/api/v1/login",
        data={"username": "testuser", "password": "testpassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_wrong_password(test_db):
    # Create user
    client.post(
        "/api/v1/users",
        json={"username": "testuser", "password": "testpassword"}
    )
    
    # Try to login with wrong password
    response = client.post(
        "/api/v1/login",
        data={"username": "testuser", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]

def test_create_feedback_unauthorized():
    response = client.post(
        "/api/v1/feedback",
        json={
            "message_id": "test_id",
            "liked": True,
            "reason": "Great response"
        }
    )
    assert response.status_code == 401

def test_get_feedback_summary_unauthorized():
    response = client.get("/api/v1/feedback/summary")
    assert response.status_code == 401

def test_create_qa_log_unauthorized():
    response = client.post(
        "/api/v1/qa-logs",
        json={
            "task_id": "test_id",
            "query": "test query",
            "response": "test response"
        }
    )
    assert response.status_code == 401

def test_get_qa_logs_unauthorized():
    response = client.get("/api/v1/qa-logs")
    assert response.status_code == 401 