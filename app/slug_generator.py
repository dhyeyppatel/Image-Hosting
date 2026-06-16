"""
Slug generator — produces unique adjective-noun slugs.
Checks MongoDB to ensure uniqueness before returning.
"""
import logging
import random
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# Resolve word list paths relative to the project root
_BASE_DIR = Path(__file__).resolve().parent.parent
_ADJECTIVES_FILE = _BASE_DIR / "wordlists" / "adjectives.txt"
_NOUNS_FILE = _BASE_DIR / "wordlists" / "nouns.txt"


def _load_words(path: Path) -> list[str]:
    """Load words from a text file, one per line, stripping blanks."""
    with path.open("r", encoding="utf-8") as fh:
        return [line.strip().lower() for line in fh if line.strip()]


# Cache word lists at module level (loaded once on first use)
_adjectives: list[str] = []
_nouns: list[str] = []


def _ensure_loaded() -> None:
    global _adjectives, _nouns
    if not _adjectives:
        _adjectives = _load_words(_ADJECTIVES_FILE)
        logger.info("Loaded %d adjectives", len(_adjectives))
    if not _nouns:
        _nouns = _load_words(_NOUNS_FILE)
        logger.info("Loaded %d nouns", len(_nouns))


def _generate_candidate() -> str:
    """Generate a single random adjective-noun slug."""
    _ensure_loaded()
    adj = random.choice(_adjectives)
    noun = random.choice(_nouns)
    return f"{adj}-{noun}"


async def generate_unique_slug(db: AsyncIOMotorDatabase, max_attempts: int = 50) -> str:
    """
    Generate a slug that does not yet exist in the 'images' collection.
    Raises RuntimeError if a unique slug cannot be found within max_attempts.
    """
    collection = db["images"]
    for attempt in range(max_attempts):
        candidate = _generate_candidate()
        existing = await collection.find_one({"_id": candidate}, projection={"_id": 1})
        if existing is None:
            logger.debug("Slug '%s' chosen after %d attempt(s)", candidate, attempt + 1)
            return candidate
    raise RuntimeError(
        f"Could not generate a unique slug in {max_attempts} attempts. "
        "Consider expanding the word lists."
    )
