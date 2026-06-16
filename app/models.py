"""
Pydantic models / schemas for the application.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class ImageDocument(BaseModel):
    """Represents a stored image document in MongoDB."""
    id: str = Field(..., alias="_id")           # slug, e.g. "silent-bucket"
    file_id: str                                 # Telegram file_id
    file_unique_id: str                          # Telegram file_unique_id
    message_id: int                              # Telegram message_id
    filename: str                                # original filename
    mime_type: str
    size: int                                    # bytes
    views: int = 0
    created_at: datetime

    class Config:
        populate_by_name = True


class ImageCreate(BaseModel):
    """Input model when inserting a new image."""
    slug: str
    file_id: str
    file_unique_id: str
    message_id: int
    filename: str
    mime_type: str
    size: int


class UploadResponse(BaseModel):
    """Response returned after a successful upload."""
    success: bool = True
    slug: str
    page_url: str
    direct_url: str


class HealthResponse(BaseModel):
    status: str = "ok"
