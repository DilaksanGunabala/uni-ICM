from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import settings
from app.api.v1 import auth, marks, users, departments, subjects, enrollments, assessments, audit_logs

# Create FastAPI application
app = FastAPI(
    title="University In-Course Marks Management System",
    description="Backend API for managing university in-course assessment marks with role-based access control",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
(uploads_dir / "avatars").mkdir(exist_ok=True)

# Mount static files for serving uploaded content
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include API routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["Departments"])
app.include_router(subjects.router, prefix="/api/v1/subjects", tags=["Subjects"])
app.include_router(enrollments.router, prefix="/api/v1/enrollments", tags=["Enrollments"])
app.include_router(assessments.router, prefix="/api/v1/assessments", tags=["Assessments"])
app.include_router(marks.router, prefix="/api/v1/marks", tags=["Marks"])
app.include_router(audit_logs.router, prefix="/api/v1/audit-logs", tags=["Audit Logs"])

# TODO: Add reports router
# app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "University In-Course Marks Management System API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "uni-marks-api"
    }


@app.get("/api/v1", tags=["API Info"])
async def api_info():
    """API version information"""
    return {
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "departments": "/api/v1/departments",
            "subjects": "/api/v1/subjects",
            "enrollments": "/api/v1/enrollments",
            "assessments": "/api/v1/assessments",
            "marks": "/api/v1/marks",
            "audit_logs": "/api/v1/audit-logs",
            "reports": "/api/v1/reports (TODO)"
        },
        "documentation": "/api/docs"
    }


if __name__ == "__main__":
    import uvicorn
    import multiprocessing

    workers = multiprocessing.cpu_count() * 2 + 1

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        workers=workers,
        log_level="info",
        access_log=True,
    )
