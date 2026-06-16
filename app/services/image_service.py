"""
Image service — business logic layer sitting between routes and storage.
"""
import logging
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.models import ImageCreate, ImageDocument
from app.slug_generator import generate_unique_slug
from app.telegram_storage import upload_to_telegram, get_telegram_file_bytes, delete_from_telegram
from app.utils.file_validation import validate_upload
from app.config import get_settings

logger = logging.getLogger(__name__)


async def upload_image(
    db: AsyncIOMotorDatabase,
    file_bytes: bytes,
    filename: str,
    content_type: str | None,
) -> ImageDocument:
    """
    Validate, upload, and persist a new image.
    Returns the created ImageDocument.
    """
    settings = get_settings()

    # 1. Validate
    clean_name, mime_type = validate_upload(
        file_bytes, content_type, filename, settings.max_upload_size_bytes
    )

    # 2. Generate unique slug
    slug = await generate_unique_slug(db)

    # 3. Upload to Telegram
    tg_data = await upload_to_telegram(file_bytes, clean_name, mime_type)

    # 4. Persist metadata
    doc: dict = {
        "_id": slug,
        "file_id": tg_data["file_id"],
        "file_unique_id": tg_data["file_unique_id"],
        "message_id": tg_data["message_id"],
        "filename": clean_name,
        "mime_type": mime_type,
        "size": len(file_bytes),
        "views": 0,
        "created_at": datetime.now(timezone.utc),
    }
    await db["images"].insert_one(doc)
    logger.info("Image saved: slug=%s size=%d", slug, len(file_bytes))

    return ImageDocument(**doc)


async def get_image(db: AsyncIOMotorDatabase, slug: str) -> ImageDocument | None:
    """Fetch image metadata by slug (does NOT increment view count)."""
    doc = await db["images"].find_one({"_id": slug})
    if doc is None:
        return None
    return ImageDocument(**doc)


async def get_image_and_increment_views(
    db: AsyncIOMotorDatabase, slug: str
) -> ImageDocument | None:
    """Fetch image metadata and atomically increment view counter."""
    doc = await db["images"].find_one_and_update(
        {"_id": slug},
        {"$inc": {"views": 1}},
        return_document=True,  # motor uses True for ReturnDocument.AFTER
    )
    if doc is None:
        return None
    return ImageDocument(**doc)


async def stream_image(file_id: str) -> tuple[bytes, str]:
    """Fetch raw image bytes from Telegram. Returns (bytes, content_type)."""
    return await get_telegram_file_bytes(file_id)


async def delete_image(db: AsyncIOMotorDatabase, slug: str) -> bool:
    """Delete an image from Telegram and MongoDB. Returns True if deleted."""
    doc = await db["images"].find_one({"_id": slug})
    if not doc:
        return False
    await delete_from_telegram(doc["message_id"])
    await db["images"].delete_one({"_id": slug})
    logger.info("Deleted image: slug=%s", slug)
    return True
