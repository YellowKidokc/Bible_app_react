"""
Bible MP3 Manager Package
For managing Bible audio collections with Cloudflare R2 and PostgreSQL
"""

__version__ = "1.0.0"
__author__ = "David Lowe"

from .uploader import AudioUploader
from .database import BibleDatabase
from .utils import extract_book_from_filename, get_audio_metadata

__all__ = ["AudioUploader", "BibleDatabase", "extract_book_from_filename", "get_audio_metadata"]
