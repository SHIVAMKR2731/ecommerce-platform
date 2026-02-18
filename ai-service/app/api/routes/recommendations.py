from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import json

from app.core.database import get_db
from app.services.recommendation_service import RecommendationService
from app.schemas.recommendation import RecommendationResponse, UserEventCreate

router = APIRouter()

@router.get("/recommendations/{user_id}", response_model=List[RecommendationResponse])
async def get_recommendations(
    user_id: str,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Get personalized product recommendations for a user
    """
    try:
        recommendation_service = RecommendationService()
        recommendations = await recommendation_service.get_recommendations(
            user_id=user_id,
            latitude=latitude,
            longitude=longitude,
            limit=limit,
            db=db
        )
        return recommendations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get recommendations: {str(e)}")

@router.post("/events")
async def track_user_event(
    event: UserEventCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Track user events for recommendation learning
    """
    try:
        recommendation_service = RecommendationService()
        await recommendation_service.track_event(event, db)
        return {"message": "Event tracked successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track event: {str(e)}")

@router.get("/trending/{latitude}/{longitude}")
async def get_trending_products(
    latitude: float,
    longitude: float,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Get trending products in user's area
    """
    try:
        recommendation_service = RecommendationService()
        trending = await recommendation_service.get_trending_products(
            latitude=latitude,
            longitude=longitude,
            limit=limit,
            db=db
        )
        return trending
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get trending products: {str(e)}")

@router.get("/popular-shops/{latitude}/{longitude}")
async def get_popular_shops(
    latitude: float,
    longitude: float,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Get popular shops in user's area
    """
    try:
        recommendation_service = RecommendationService()
        popular = await recommendation_service.get_popular_shops(
            latitude=latitude,
            longitude=longitude,
            limit=limit,
            db=db
        )
        return popular
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get popular shops: {str(e)}")