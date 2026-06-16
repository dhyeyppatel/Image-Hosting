"""
Image delivery routes.

GET /img/{slug}      — stream raw image (for embedding)
GET /download/{slug} — force-download with original filename
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response, StreamingResponse

from app.database import get_db
from app.services.image_service import get_image, stream_image

logger = logging.getLogger(__name__)
router = APIRouter()

# Simple in-memory LRU-style cache to avoid hammering Telegram on repeated views
# For production at scale, replace with Redis.
_cache: dict[str, tuple[bytes, str]] = {}
_CACHE_MAX = 100


async def _get_cached(file_id: str) -> tuple[bytes, str]:
    if file_id in _cache:
        return _cache[file_id]
    data, ct = await stream_image(file_id)
    # Evict oldest if cache is full
    if len(_cache) >= _CACHE_MAX:
        oldest_key = next(iter(_cache))
        del _cache[oldest_key]
    _cache[file_id] = (data, ct)
    return data, ct


@router.get("/img/{slug}")
async def serve_image(slug: str, request: Request) -> Response:
    """
    Serve the raw image — supports HTML img tags, Markdown embeds,
    Discord/Telegram unfurls, etc.
    """
    db = get_db()
    image = await get_image(db, slug)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        data, content_type = await _get_cached(image.file_id)
    except Exception as exc:
        logger.exception("Failed to fetch image from Telegram: %s", exc)
        raise HTTPException(status_code=502, detail="Could not retrieve image.")

    return Response(
        content=data,
        media_type=image.mime_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.get("/download/{slug}")
async def download_image(slug: str) -> Response:
    """Force-download the image with its original filename."""
    db = get_db()
    image = await get_image(db, slug)
    if image is None:
        raise HTTPException(status_code=404, detail="Image not found.")

    try:
        data, content_type = await _get_cached(image.file_id)
    except Exception as exc:
        logger.exception("Failed to fetch image from Telegram: %s", exc)
        raise HTTPException(status_code=502, detail="Could not retrieve image.")

    return Response(
        content=data,
        media_type=image.mime_type,
        headers={
            "Content-Disposition": f'attachment; filename="{image.filename}"',
            "Cache-Control": "private, max-age=86400",
        },
    )
