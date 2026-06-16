"""
Utility helpers — file validation, MIME detection, sanitization.
"""
import logging
import mimetypes
import re
from pathlib import Path

logger = logging.getLogger(__name__)

# Allowed MIME types and their canonical extensions
ALLOWED_MIME_TYPES: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

# Magic byte signatures for each MIME type
_MAGIC_BYTES: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", "image/jpeg"),                          # JPEG
    (b"\x89PNG\r\n\x1a\n", "image/png"),                    # PNG
    (b"RIFF", "image/webp"),                                  # WEBP (further check)
    (b"GIF87a", "image/gif"),                                 # GIF87
    (b"GIF89a", "image/gif"),                                 # GIF89
]


def detect_mime_type(data: bytes) -> str | None:
    """
    Detect MIME type by inspecting file magic bytes.
    Returns the MIME string if recognised, None otherwise.
    """
    for magic, mime in _MAGIC_BYTES:
        if data[:len(magic)] == magic:
            # Extra check for WEBP: bytes 8-12 must be "WEBP"
            if mime == "image/webp":
                if len(data) >= 12 and data[8:12] == b"WEBP":
                    return mime
                continue  # false positive RIFF
            return mime
    return None


def sanitize_filename(filename: str) -> str:
    """
    Remove path traversal characters and other dangerous sequences.
    Returns a clean, lowercase filename.
    """
    # Strip directory components
    filename = Path(filename).name
    # Keep only safe characters
    filename = re.sub(r"[^\w.\-]", "_", filename)
    # Collapse multiple underscores/dots
    filename = re.sub(r"_+", "_", filename)
    return filename.lower()


def validate_upload(
    file_bytes: bytes,
    content_type: str | None,
    filename: str,
    max_size_bytes: int,
) -> tuple[str, str]:
    """
    Validate an uploaded file.

    Returns (sanitized_filename, actual_mime_type) on success.
    Raises ValueError with a human-readable message on failure.
    """
    # Size check
    if len(file_bytes) == 0:
        raise ValueError("Uploaded file is empty.")
    if len(file_bytes) > max_size_bytes:
        max_mb = max_size_bytes // (1024 * 1024)
        raise ValueError(f"File exceeds the {max_mb} MB size limit.")

    # Magic byte detection (never trust the client content-type)
    actual_mime = detect_mime_type(file_bytes)
    if actual_mime is None or actual_mime not in ALLOWED_MIME_TYPES:
        raise ValueError(
            "Unsupported file type. Allowed formats: JPG, PNG, WEBP, GIF."
        )

    clean_name = sanitize_filename(filename)
    # Ensure the extension matches the detected MIME
    ext = ALLOWED_MIME_TYPES[actual_mime]
    stem = Path(clean_name).stem or "image"
    clean_name = f"{stem}{ext}"

    return clean_name, actual_mime
