from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

class RecommendationResponse(BaseModel):
    product_id: str
    product_name: str
    shop_name: str
    price: float
    discount_price: Optional[float]
    image_url: Optional[str]
    score: float
    reason: str  # Why this product was recommended

class UserEventCreate(BaseModel):
    user_id: str
    event_type: str  # view, click, purchase, add_to_cart, etc
    event_data: Dict[str, Any]  # JSON data about the event

class TrendingProduct(BaseModel):
    product_id: str
    product_name: str
    shop_name: str
    view_count: int
    order_count: int

class PopularShop(BaseModel):
    shop_id: str
    shop_name: str
    order_count: int
    average_rating: float