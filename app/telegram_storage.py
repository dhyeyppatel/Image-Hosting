"""
Telegram storage service.
Uploads images to a private Telegram channel via Bot API.
All Telegram-specific logic is encapsulated here so the bot token
never leaks into any other part of the application.
"""
import io
import logging
from typing import Any

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)

# Telegram Bot API base URL - constructed at module level using the env token
_TELEGRAM_API_BASE = "https://api.telegram.org"


def _api_url(token: str, method: str) -> str:
    return f"{_TELEGRAM_API_BASE}/bot{token}/{method}"


def _file_url(token: str, file_path: str) -> str:
    return f"{_TELEGRAM_API_BASE}/file/bot{token}/{file_path}"


async def upload_to_telegram(
    file_bytes: bytes,
    filename: str,
    mime_type: str,
) -> dict[str, Any]:
    """
    Upload a file to the private Telegram storage channel.

    Returns a dict with:
      - file_id
      - file_unique_id
      - message_id
    """
    settings = get_settings()
    token = settings.bot_token
    channel_id = settings.storage_channel_id

    # Choose send method based on MIME type
    if mime_type.startswith("image/gif"):
        method = "sendAnimation"
        field_name = "animation"
    else:
        method = "sendPhoto"
        field_name = "photo"

    url = _api_url(token, method)

    async with httpx.AsyncClient(timeout=60.0) as client:
        files = {field_name: (filename, io.BytesIO(file_bytes), mime_type)}
        data = {"chat_id": channel_id}

        response = await client.post(url, data=data, files=files)
        response.raise_for_status()
        result = response.json()

    if not result.get("ok"):
        raise RuntimeError(f"Telegram API error: {result.get('description', 'Unknown error')}")

    message = result["result"]
    message_id = message["message_id"]

    # Extract photo/animation info
    if method == "sendPhoto":
        # Telegram returns multiple sizes; last one is the largest
        photo_sizes = message.get("photo", [])
        if not photo_sizes:
            raise RuntimeError("Telegram returned no photo sizes.")
        largest = photo_sizes[-1]
        file_id = largest["file_id"]
        file_unique_id = largest["file_unique_id"]
    else:
        anim = message.get("animation", {})
        file_id = anim["file_id"]
        file_unique_id = anim["file_unique_id"]

    logger.info(
        "Uploaded to Telegram: message_id=%s file_unique_id=%s",
        message_id,
        file_unique_id,
    )
    return {
        "file_id": file_id,
        "file_unique_id": file_unique_id,
        "message_id": message_id,
    }


async def delete_from_telegram(message_id: int) -> bool:
    """
    Delete a message (and its image) from the storage channel.
    Returns True on success, False otherwise.
    """
    settings = get_settings()
    token = settings.bot_token
    channel_id = settings.storage_channel_id

    url = _api_url(token, "deleteMessage")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            url, json={"chat_id": channel_id, "message_id": message_id}
        )
        result = resp.json()

    if result.get("ok"):
        logger.info("Deleted Telegram message_id=%s", message_id)
        return True
    logger.warning("Failed to delete Telegram message_id=%s: %s", message_id, result)
    return False


async def get_telegram_file_bytes(file_id: str) -> tuple[bytes, str]:
    """
    Fetch raw image bytes from Telegram for a given file_id.
    Returns (bytes, content_type).
    """
    settings = get_settings()
    token = settings.bot_token

    # Step 1: Get file path
    url = _api_url(token, "getFile")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json={"file_id": file_id})
        resp.raise_for_status()
        result = resp.json()

    if not result.get("ok"):
        raise RuntimeError(f"Telegram getFile error: {result.get('description')}")

    file_path = result["result"]["file_path"]

    # Step 2: Download file
    download_url = _file_url(token, file_path)
    async with httpx.AsyncClient(timeout=60.0) as client:
        dl_resp = await client.get(download_url)
        dl_resp.raise_for_status()
        content_type = dl_resp.headers.get("content-type", "image/jpeg")
        return dl_resp.content, content_type
