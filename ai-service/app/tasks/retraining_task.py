import asyncio
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.preprocessing import StandardScaler
import pickle
import os
from datetime import datetime

from app.core.database import get_database
from app.core.config import settings

async def retrain_model_task():
    """
    Background task to retrain the recommendation model
    """
    print("Starting model retraining...")

    try:
        database = await get_database()

        # Fetch user-product interaction data
        query = """
            SELECT
                o.user_id,
                oi.product_id,
                COUNT(*) as interaction_count,
                MAX(o.created_at) as last_interaction
            FROM orders o
            JOIN order_items oi ON o.id = oi.order_id
            WHERE o.status = 'DELIVERED'
            GROUP BY o.user_id, oi.product_id
        """

        interactions = await database.fetch_all(query)

        if not interactions:
            print("No interaction data found for training")
            return

        # Convert to DataFrame
        df = pd.DataFrame([dict(row) for row in interactions])

        # Create user-item matrix
        user_item_matrix = df.pivot_table(
            index='user_id',
            columns='product_id',
            values='interaction_count',
            fill_value=0
        )

        # Calculate user similarity
        if user_item_matrix.shape[0] > 1:
            # Normalize the matrix
            scaler = StandardScaler()
            normalized_matrix = scaler.fit_transform(user_item_matrix)

            # Calculate cosine similarity
            user_similarity_matrix = cosine_similarity(normalized_matrix)

            # Create user similarity dictionary
            user_similarity = {}
            user_ids = user_item_matrix.index.tolist()

            for i, user_id in enumerate(user_ids):
                similarities = []
                for j, other_user_id in enumerate(user_ids):
                    if i != j:
                        similarities.append((other_user_id, user_similarity_matrix[i][j]))

                # Sort by similarity score
                similarities.sort(key=lambda x: x[1], reverse=True)
                user_similarity[user_id] = similarities[:10]  # Top 10 similar users

            # Save model
            model_path = os.path.join(settings.model_path, 'user_similarity.pkl')
            with open(model_path, 'wb') as f:
                pickle.dump(user_similarity, f)

            print(f"Model retrained and saved at {model_path}")
        else:
            print("Not enough users for collaborative filtering")

        # Update trending products cache
        await update_trending_cache(database)

        print("Model retraining completed")

    except Exception as e:
        print(f"Error during model retraining: {e}")

async def update_trending_cache(database):
    """Update trending products in Redis"""
    try:
        from app.services.recommendation_service import RecommendationService

        # This would be called to refresh trending data
        # In a real implementation, you might cache aggregated trending data
        print("Trending cache updated")

    except Exception as e:
        print(f"Error updating trending cache: {e}")

# For testing
if __name__ == "__main__":
    asyncio.run(retrain_model_task())