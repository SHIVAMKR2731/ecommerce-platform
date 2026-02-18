from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import databases
from app.core.config import settings

# SQLAlchemy setup
DATABASE_URL = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(DATABASE_URL, echo=True)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

# Databases setup for simpler queries
database = databases.Database(DATABASE_URL)

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def create_tables():
    async with engine.begin() as conn:
        # Import all models here to ensure they are registered
        from app.models import user_events
        await conn.run_sync(Base.metadata.create_all)

async def get_database():
    return database