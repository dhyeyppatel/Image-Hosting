"""
Upload API route.
POST /upload — accepts multipart form data, validates, stores, returns URLs.
"""
import logging
from fastapi import APIRouter, File, Request, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings
from app.database import get_db
from app.services.image_service import upload_image

logger = logging.getLogger(__name__)
router = APIRouter()

limiter = Limiter(key_func=get_remote_address)


@router.post("/upload")
@limiter.limit("{rate}/minute".format(rate=get_settings().rate_limit_uploads_per_minute))
async def upload(request: Request, file: UploadFile = File(...)) -> JSONResponse:
    """
    Upload an image.
    Returns JSON with slug, page_url, and direct_url.
    """
    settings = get_settings()
    db = get_db()

    # Read file bytes (respect max size early to avoid loading huge files)
    contents = await file.read(settings.max_upload_size_bytes + 1)
    if len(contents) > settings.max_upload_size_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds the {settings.max_upload_size_mb} MB size limit.",
        )

    try:
        image = await upload_image(
            db=db,
            file_bytes=contents,
            filename=file.filename or "upload",
            content_type=file.content_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("Upload failed: %s", exc)
        raise HTTPException(status_code=500, detail="Upload failed. Please try again.")

    base = settings.base_url.rstrip("/")
    return JSONResponse(
        {
            "success": True,
            "slug": image.id,
            "page_url": f"{base}/i/{image.id}",
            "direct_url": f"{base}/img/{image.id}",
        }
    )
