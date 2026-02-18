import redis
import json
import numpy as np
import pandas as pd
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import os
import pickle
from datetime import datetime, timedelta

from app.core.config import settings
from app.schemas.recommendation import (
    RecommendationResponse,
    UserEventCreate,
    TrendingProduct,
    PopularShop
)

class RecommendationService:
    def __init__(self):
        self.redis_client = redis.Redis.from_url(settings.redis_url)
        self.model_path = settings.model_path
        os.makedirs(self.model_path, exist_ok=True)

    async def get_recommendations(
        self,
        user_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        limit: int = 10,
        db: AsyncSession = None
    ) -> List[RecommendationResponse]:
        """
        Get hybrid recommendations for a user
        Score = 0.4 × Collaborative Filtering + 0.3 × Content Similarity + 0.2 × Location Boost + 0.1 × Trending Score
        """
        try:
            # Check cache first
            cache_key = f"recommendations:{user_id}:{latitude or 0}:{longitude or 0}:{limit}"
            cached_result = self.redis_client.get(cache_key)
            if cached_result:
                return json.loads(cached_result)

            recommendations = []

            # Get user preferences and history
            user_profile = await self._get_user_profile(user_id, db)

            # Get collaborative filtering recommendations
            cf_recommendations = await self._get_collaborative_recommendations(user_id, db)

            # Get content-based recommendations
            content_recommendations = await self._get_content_recommendations(user_profile, db)

            # Get location-based recommendations
            location_recommendations = await self._get_location_recommendations(
                latitude, longitude, limit * 2, db
            )

            # Get trending products
            trending_recommendations = await self._get_trending_recommendations(limit * 2, db)

            # Combine and score all recommendations
            all_candidates = self._combine_recommendations(
                cf_recommendations,
                content_recommendations,
                location_recommendations,
                trending_recommendations
            )

            # Sort by score and limit
            sorted_candidates = sorted(all_candidates.items(), key=lambda x: x[1]['score'], reverse=True)
            top_candidates = sorted_candidates[:limit]

            # Format response
            for product_id, data in top_candidates:
                product_info = await self._get_product_info(product_id, db)
                if product_info:
                    recommendations.append(RecommendationResponse(
                        product_id=product_id,
                        product_name=product_info['name'],
                        shop_name=product_info['shop_name'],
                        price=product_info['price'],
                        discount_price=product_info.get('discount_price'),
                        image_url=product_info.get('image_url'),
                        score=round(data['score'], 3),
                        reason=data['reason']
                    ))

            # Cache for 30 minutes
            self.redis_client.setex(cache_key, 1800, json.dumps([r.dict() for r in recommendations]))

            return recommendations

        except Exception as e:
            print(f"Error getting recommendations: {e}")
            # Return location-based recommendations as fallback
            return await self._get_location_recommendations(latitude, longitude, limit, db)

    async def _get_user_profile(self, user_id: str, db: AsyncSession) -> Dict[str, Any]:
        """Get user profile including preferences and purchase history"""
        query = text("""
            SELECT
                u.latitude, u.longitude,
                array_agg(DISTINCT p.category) as preferred_categories,
                array_agg(DISTINCT p.id) as purchased_products,
                COUNT(o.id) as total_orders
            FROM users u
            LEFT JOIN orders o ON u.id = o.user_id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE u.id = :user_id
            GROUP BY u.id, u.latitude, u.longitude
        """)

        result = await db.execute(query, {"user_id": user_id})
        row = result.fetchone()

        if row:
            return {
                'latitude': row[0],
                'longitude': row[1],
                'preferred_categories': row[2] or [],
                'purchased_products': row[3] or [],
                'total_orders': row[4] or 0
            }

        return {
            'latitude': None,
            'longitude': None,
            'preferred_categories': [],
            'purchased_products': [],
            'total_orders': 0
        }

    async def _get_collaborative_recommendations(self, user_id: str, db: AsyncSession) -> Dict[str, Dict]:
        """Get collaborative filtering recommendations"""
        # Load pre-computed similarity matrix if available
        model_file = os.path.join(self.model_path, 'user_similarity.pkl')
        if os.path.exists(model_file):
            with open(model_file, 'rb') as f:
                user_similarity = pickle.load(f)

            # Find similar users and their purchases
            if user_id in user_similarity:
                similar_users = user_similarity[user_id][:5]  # Top 5 similar users

                recommendations = {}
                for similar_user, score in similar_users:
                    # Get products purchased by similar user but not by current user
                    query = text("""
                        SELECT DISTINCT p.id, p.name, :score as similarity_score
                        FROM orders o
                        JOIN order_items oi ON o.id = oi.order_id
                        JOIN products p ON oi.product_id = p.id
                        WHERE o.user_id = :similar_user
                        AND p.id NOT IN (
                            SELECT p2.id
                            FROM orders o2
                            JOIN order_items oi2 ON o2.id = oi2.order_id
                            JOIN products p2 ON oi2.product_id = p2.id
                            WHERE o2.user_id = :user_id
                        )
                        LIMIT 20
                    """)

                    result = await db.execute(query, {
                        "similar_user": similar_user,
                        "user_id": user_id,
                        "score": score
                    })

                    for row in result:
                        product_id = row[0]
                        recommendations[product_id] = {
                            'score': score * 0.4,  # 40% weight
                            'reason': f"Users similar to you purchased this"
                        }

                return recommendations

        return {}

    async def _get_content_recommendations(self, user_profile: Dict, db: AsyncSession) -> Dict[str, Dict]:
        """Get content-based recommendations based on user's preferred categories"""
        recommendations = {}

        if user_profile['preferred_categories']:
            categories = user_profile['preferred_categories']
            purchased_products = user_profile['purchased_products']

            # Find products in same categories, excluding already purchased
            query = text("""
                SELECT p.id, p.name, p.category,
                       CASE WHEN p.category = ANY(:categories) THEN 0.8 ELSE 0.3 END as category_score
                FROM products p
                WHERE p.category = ANY(:categories)
                AND p.id != ALL(:purchased_products)
                AND p.is_active = true
                ORDER BY category_score DESC, p.average_rating DESC
                LIMIT 30
            """)

            result = await db.execute(query, {
                "categories": categories,
                "purchased_products": purchased_products or []
            })

            for row in result:
                product_id = row[0]
                category_score = row[3]
                recommendations[product_id] = {
                    'score': category_score * 0.3,  # 30% weight
                    'reason': f"Based on your interest in {row[2]}"
                }

        return recommendations

    async def _get_location_recommendations(
        self,
        latitude: Optional[float],
        longitude: Optional[float],
        limit: int,
        db: AsyncSession
    ) -> Dict[str, Dict]:
        """Get location-based recommendations"""
        recommendations = {}

        if latitude and longitude:
            # Find products from shops within 5km
            query = text("""
                SELECT p.id, p.name,
                       ST_Distance(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) as distance
                FROM products p
                JOIN shops s ON p.shop_id = s.id
                WHERE ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 5000)
                AND p.is_active = true
                AND s.is_open = true
                ORDER BY distance ASC, p.average_rating DESC
                LIMIT :limit
            """)

            result = await db.execute(query, {
                "lat": latitude,
                "lng": longitude,
                "limit": limit
            })

            for row in result:
                product_id = row[0]
                distance = row[2]
                # Convert distance to score (closer = higher score)
                distance_score = max(0, 1 - (distance / 5000))  # 0-1 score based on 5km range

                recommendations[product_id] = {
                    'score': distance_score * 0.2,  # 20% weight
                    'reason': f"Available at a nearby shop ({int(distance)}m away)"
                }

        return recommendations

    async def _get_trending_recommendations(self, limit: int, db: AsyncSession) -> Dict[str, Dict]:
        """Get trending products based on recent activity"""
        recommendations = {}

        # Get products with high activity in last 7 days
        query = text("""
            SELECT p.id, p.name,
                   COUNT(ue.id) as event_count,
                   COUNT(DISTINCT CASE WHEN ue.event_type = 'purchase' THEN ue.user_id END) as purchase_count
            FROM products p
            LEFT JOIN user_events ue ON ue.event_data::json->>'product_id' = p.id
            WHERE ue.created_at >= NOW() - INTERVAL '7 days'
            AND p.is_active = true
            GROUP BY p.id, p.name
            ORDER BY (COUNT(ue.id) + COUNT(DISTINCT CASE WHEN ue.event_type = 'purchase' THEN ue.user_id END) * 5) DESC
            LIMIT :limit
        """)

        result = await db.execute(query, {"limit": limit})

        for row in result:
            product_id = row[0]
            event_count = row[2]
            purchase_count = row[3]

            # Calculate trending score
            trending_score = min(1.0, (event_count + purchase_count * 5) / 100)  # Normalize

            recommendations[product_id] = {
                'score': trending_score * 0.1,  # 10% weight
                'reason': "Trending product in your area"
            }

        return recommendations

    def _combine_recommendations(self, *recommendation_dicts) -> Dict[str, Dict]:
        """Combine multiple recommendation sources"""
        combined = {}

        for rec_dict in recommendation_dicts:
            for product_id, data in rec_dict.items():
                if product_id not in combined:
                    combined[product_id] = {'score': 0, 'reason': data['reason']}
                combined[product_id]['score'] += data['score']

        return combined

    async def _get_product_info(self, product_id: str, db: AsyncSession) -> Optional[Dict]:
        """Get product information"""
        query = text("""
            SELECT p.name, s.name as shop_name, p.price, p.discount_price, p.image_url
            FROM products p
            JOIN shops s ON p.shop_id = s.id
            WHERE p.id = :product_id
        """)

        result = await db.execute(query, {"product_id": product_id})
        row = result.fetchone()

        if row:
            return {
                'name': row[0],
                'shop_name': row[1],
                'price': float(row[2]),
                'discount_price': float(row[3]) if row[3] else None,
                'image_url': row[4]
            }

        return None

    async def track_event(self, event: UserEventCreate, db: AsyncSession):
        """Track user event for learning"""
        from app.models.user_events import UserEvent
        import uuid

        user_event = UserEvent(
            id=str(uuid.uuid4()),
            user_id=event.user_id,
            event_type=event.event_type,
            event_data=json.dumps(event.event_data)
        )

        db.add(user_event)
        await db.commit()

        # Invalidate cache
        cache_key_pattern = f"recommendations:{event.user_id}:*"
        # Note: In production, use SCAN for better performance
        for key in self.redis_client.keys(cache_key_pattern):
            self.redis_client.delete(key)

    async def get_trending_products(
        self,
        latitude: float,
        longitude: float,
        limit: int,
        db: AsyncSession
    ) -> List[TrendingProduct]:
        """Get trending products in area"""
        query = text("""
            SELECT p.id, p.name, s.name as shop_name,
                   COUNT(ue.id) as view_count,
                   COUNT(DISTINCT CASE WHEN ue.event_type = 'purchase' THEN ue.user_id END) as order_count
            FROM products p
            JOIN shops s ON p.shop_id = s.id
            LEFT JOIN user_events ue ON ue.event_data::json->>'product_id' = p.id
            WHERE ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 5000)
            AND ue.created_at >= NOW() - INTERVAL '7 days'
            AND p.is_active = true
            GROUP BY p.id, p.name, s.name
            ORDER BY (COUNT(ue.id) + COUNT(DISTINCT CASE WHEN ue.event_type = 'purchase' THEN ue.user_id END) * 3) DESC
            LIMIT :limit
        """)

        result = await db.execute(query, {
            "lat": latitude,
            "lng": longitude,
            "limit": limit
        })

        trending = []
        for row in result:
            trending.append(TrendingProduct(
                product_id=row[0],
                product_name=row[1],
                shop_name=row[2],
                view_count=row[3],
                order_count=row[4]
            ))

        return trending

    async def get_popular_shops(
        self,
        latitude: float,
        longitude: float,
        limit: int,
        db: AsyncSession
    ) -> List[PopularShop]:
        """Get popular shops in area"""
        query = text("""
            SELECT s.id, s.name,
                   COUNT(o.id) as order_count,
                   COALESCE(s.average_rating, 0) as average_rating
            FROM shops s
            LEFT JOIN orders o ON s.id = o.shop_id AND o.created_at >= NOW() - INTERVAL '30 days'
            WHERE ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 5000)
            AND s.is_open = true
            GROUP BY s.id, s.name, s.average_rating
            ORDER BY order_count DESC, average_rating DESC
            LIMIT :limit
        """)

        result = await db.execute(query, {
            "lat": latitude,
            "lng": longitude,
            "limit": limit
        })

        popular = []
        for row in result:
            popular.append(PopularShop(
                shop_id=row[0],
                shop_name=row[1],
                order_count=row[2],
                average_rating=float(row[3])
            ))

        return popular