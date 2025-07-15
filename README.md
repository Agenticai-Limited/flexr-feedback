# Feedback Center for FlexR Nova

A feedback and logging analysis system for FlexR, featuring a **React + Vite frontend** and a **FastAPI backend**. This system allows for efficient querying and analysis of application logs and user feedback, providing valuable insights without modifying underlying data.

---

## Core Features

* **User Feedback Analysis:** Provides summaries and analyses of user feedback to help understand user experience.
* **QA Log Querying:** Easily query QA-related logs with search functionality.
* **Low Similarity Query Analysis:** Identifies and analyzes low-similarity queries to optimize search or matching algorithms.
* **No Result Query Analysis:** Gains insights into user queries that yielded no results, aiding content or feature improvements.
* **Read-Only Data Access:** All backend operations are for querying and analyzing existing data; **no database content is modified**.

---

## Tech Stack

### Frontend

* **React:** JavaScript library for building user interfaces.
* **Vite:** Fast development server and build tool, offering an exceptional development experience for React apps.

### Backend

* **FastAPI:** Modern, fast (high-performance) web framework for building APIs.
* **SQLAlchemy:** Powerful Python ORM (Object-Relational Mapper) for database interaction.
* **PostgreSQL:** Stable and reliable enterprise-grade relational database.
* **JWT authentication:** JSON Web Tokens for secure authentication.
* **Pydantic:** Python library for data validation and settings management.

---

## Prerequisites

* Python 3.8+
* PostgreSQL
* uv (Python package installer)

---

## Installation

1.  Navigate to your project's root directory.
2.  Create and activate a virtual environment, then install dependencies:

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: .\venv\Scripts\activate
    uv venv
    uv pip install -r requirements.txt
    ```

3.  Set up environment variables:

    ```env
	DATABASE_URL=
    SECRET_KEY=your-secret-key
    ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=120
    ```

---

## Running the Application

### Starting the Frontend

In the frontend project directory:

```bash
# Install frontend dependencies (if not already installed)
npm install

# For development mode
npm run dev

# For production build
npm run build
```

### Starting the Backend

In the project's root directory:

```bash
uvicorn app.main:app --host 0.0.0.0 --reload
```

---

## Docker

To run the backend in a Docker container, follow these steps:

1.  **Navigate to the backend directory**:
    ```bash
    cd feedback_backend
    ```

2.  **Build the Docker image**:
    ```bash
    docker build -t feedback-backend .
    ```

3.  **Run the Docker container**:
    ```bash
    docker run -d -p 8001:8001 --name feedback-backend-container --env-file .env feedback-backend
    ```
    - **-d**: Runs the container in detached mode.
    - **-p 8001:8001**: Maps port 8001 of the container to port 8001 on your host.
    - **--name**: Assigns a name to your container.
    - **--env-file .env**: Loads environment variables from your `.env` file. Make sure your `.env` file is in the `feedback_backend` directory.

---

## Security

* All backend endpoints (except login) require **JWT authentication**.
* Sensitive data is configured via environment variables.
* Database access is limited to read-only operations.

---

## Note

This is a read-only application that connects to an existing database. It does not modify any data in the database. All endpoints are designed solely for querying and analyzing existing data.
