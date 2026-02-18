from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

from app.api.routes import router
from app.core.config import settings
from app.core.database import create_tables
from app.services.recommendation_service import RecommendationService
from app.tasks.retraining_task import retrain_model_task

load_dotenv()

app = FastAPI(
    title="BazaarLink AI Recommendation Service",
    description="AI-powered product recommendation engine for hyperlocal e-commerce",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router, prefix="/api/v1")

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-service"}

# Startup event
@app.on_event("startup")
async def startup_event():
    # Create database tables
    await create_tables()

    # Initialize recommendation service
    recommendation_service = RecommendationService()
    app.state.recommendation_service = recommendation_service

    print("AI Service started successfully")

# Retraining endpoint (admin only)
@app.post("/admin/retrain-model")
async def retrain_model(background_tasks: BackgroundTasks):
    # In production, add authentication here
    background_tasks.add_task(retrain_model_task)
    return {"message": "Model retraining started in background"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True if os.getenv("ENVIRONMENT") == "development" else False,
    )