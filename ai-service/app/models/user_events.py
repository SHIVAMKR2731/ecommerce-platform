from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.sql import func
from app.core.database import Base

class UserEvent(Base):
    __tablename__ = "user_events"

    id = Column(String, primary_key=True)
    user_id = Column(String, nullable=False, index=True)
    event_type = Column(String, nullable=False, index=True)  # view, click, purchase, etc
    event_data = Column(Text, nullable=False)  # JSON string
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)