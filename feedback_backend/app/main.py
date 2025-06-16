from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, ResponseValidationError
import traceback
from loguru import logger

from app.api.endpoints import router
from app.core.config import settings
from app.core.logger import setup_logging

# Initialize logging
setup_logging(env="dev")  # You can change this based on your environment

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  
    max_age=3600,  
)

def error_response(status_code: int, message: str, details: dict = None):
    response = {
        "success": False,
        "error": {
            "code": status_code,
            "message": message
        }
    }
    if details:
        response["error"]["details"] = details
    return response

# # HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    error_msg = f"HTTP exception handler caught: {str(exc)}\nStatus code: {exc.status_code}"
    if exc.status_code >= 500:
        logger.error(error_msg)
    elif exc.status_code >= 400:
        logger.warning(error_msg)
    else:
        logger.info(error_msg)
    
    headers = getattr(exc, 'headers', None)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(exc.status_code, str(exc.detail)),
        headers=headers
    )

# # Validation exception handler
@app.exception_handler(RequestValidationError)
@app.exception_handler(ResponseValidationError)
async def validation_exception_handler(request: Request, exc: Exception):
    error_msg = f"Validation error: {str(exc)}"
    logger.warning(error_msg)
    return JSONResponse(
        status_code=422,
        content=error_response(
            422,
            "Validation Error",
            {"errors": exc.errors() if hasattr(exc, 'errors') else str(exc)}
        )
    )

# Global exception handler for all other exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    error_msg = f"Global exception handler caught: {str(exc)}\n{traceback.format_exc()}"
    logger.error(error_msg)

    return JSONResponse(
        status_code=500,
        content=error_response(
            500,
            "Internal Server Errorddddd",
            {"traceback": traceback.format_exc()}
        )
    )

# Include API router
app.include_router(router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    """
    Root endpoint
    """
    return {
        "message": "Welcome to Admin System API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    } 