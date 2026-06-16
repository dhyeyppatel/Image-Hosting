"""
Page routes — serve HTML pages using Jinja2 templates.

GET /        — home (upload) page
GET /i/{slug} — image info page
"""
import logging
from datetime import timezone

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import get_settings
from app.database import get_db
from app.services.image_service import get_image_and_increment_views

logger = logging.getLogger(__name__)
router = APIRouter()

templates = Jinja2Templates(directory="templates")


@router.get("/", response_class=HTMLResponse)
async def home(request: Request) -> HTMLResponse:
    """Render the upload homepage."""
    settings = get_settings()
    return templates.TemplateResponse(
        request=request,
        name="home.html",
        context={
            "base_url": settings.base_url,
            "max_upload_size_mb": settings.max_upload_size_mb,
        },
    )


@router.get("/i/{slug}", response_class=HTMLResponse)
async def image_page(slug: str, request: Request) -> HTMLResponse:
    """Render the image info/share page and bump view counter."""
    settings = get_settings()
    db = get_db()

    image = await get_image_and_increment_views(db, slug)
    if image is None:
        return templates.TemplateResponse(
            request=request,
            name="404.html",
            context={"base_url": settings.base_url},
            status_code=404,
        )

    base = settings.base_url.rstrip("/")
    page_url = f"{base}/i/{slug}"
    direct_url = f"{base}/img/{slug}"
    download_url = f"{base}/download/{slug}"

    # Format created_at for display (UTC → readable string)
    created_str = image.created_at.strftime("%B %d, %Y at %H:%M UTC")

    # Human-readable file size
    size_bytes = image.size
    if size_bytes >= 1_048_576:
        size_human = f"{size_bytes / 1_048_576:.1f} MB"
    elif size_bytes >= 1_024:
        size_human = f"{size_bytes / 1_024:.1f} KB"
    else:
        size_human = f"{size_bytes} B"

    return templates.TemplateResponse(
        request=request,
        name="image.html",
        context={
            "image": image,
            "slug": slug,
            "page_url": page_url,
            "direct_url": direct_url,
            "download_url": download_url,
            "created_str": created_str,
            "size_human": size_human,
            "base_url": settings.base_url,
        },
    )
