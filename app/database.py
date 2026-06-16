"""
MongoDB database connection and helpers.
"""
import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: AsyncIOMotorClient | None = None
_db: AsyncIOMotorDatabase | None = None


async def connect_db() -> None:
    """Open MongoDB connection and create indexes."""
    global _client, _db
    settings = get_settings()
    logger.info("Connecting to MongoDB...")
    _client = AsyncIOMotorClient(settings.mongo_uri)
    _db = _client["dhyey_space"]

    # Create indexes
    images_col = _db["images"]
    await images_col.create_index([("created_at", DESCENDING)])
    await images_col.create_index([("file_unique_id", ASCENDING)])
    logger.info("MongoDB connected and indexes created.")


async def close_db() -> None:
    """Close MongoDB connection."""
    global _client
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")


def get_db() -> AsyncIOMotorDatabase:
    """Return the active database instance."""
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db
