#!/usr/bin/env python3
"""
Utility functions for Bible MP3 management
File parsing, book name extraction, and metadata helpers
"""

import re
from pathlib import Path
from typing import Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


def extract_book_from_filename(filename: str) -> Optional[str]:
    """Extract Bible book name from filename"""
    # Common patterns for book names in filenames
    patterns = [
        # Pattern: "01 Genesis" or "01_Genesis"
        r'(\d{1,2})[_\s]*(.+?)(?:\.\w+)?$',
        # Pattern: "Genesis 01" or "Genesis_01" 
        r'^(.+?)[_\s]*(\d{1,2})(?:\.\w+)?$',
        # Pattern: just book name
        r'^([a-zA-Z\s]+)(?:\d+)?(?:\.\w+)?$'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, filename, re.IGNORECASE)
        if match:
            # Try to identify which group is the book name
            groups = match.groups()
            for group in groups:
                if group and not group.isdigit():
                    # Clean up the book name
                    book_name = group.strip('_- ').title()
                    return normalize_book_name(book_name)
    
    return None


def normalize_book_name(book_name: str) -> str:
    """Normalize book name to standard format"""
    # Dictionary to handle common variations
    name_mappings = {
        '1st Corinthians': '1 Corinthians',
        '2nd Corinthians': '2 Corinthians',
        '1st John': '1 John',
        '2nd John': '2 John',
        '3rd John': '3 John',
        '1st Peter': '1 Peter',
        '2nd Peter': '2 Peter',
        '1st Samuel': '1 Samuel',
        '2nd Samuel': '2 Samuel',
        '1st Kings': '1 Kings',
        '2nd Kings': '2 Kings',
        '1st Chronicles': '1 Chronicles',
        '2nd Chronicles': '2 Chronicles',
        '1st Timothy': '1 Timothy',
        '2nd Timothy': '2 Timothy',
        '1st Thessalonians': '1 Thessalonians',
        '2nd Thessalonians': '2 Thessalonians',
        'Song Of Songs': 'Song of Solomon',
        'Ecclesiast': 'Ecclesiastes',
        'Phil': 'Philippians',
        'Col': 'Colossians',
        'Thess': 'Thessalonians',
        'Tim': 'Timothy',
        'Philem': 'Philemon',
        'Heb': 'Hebrews',
        'Rev': 'Revelation'
    }
    
    # Check for exact matches first
    if book_name in name_mappings:
        return name_mappings[book_name]
    
    # Check for partial matches
    for variant, standard in name_mappings.items():
        if variant.lower() in book_name.lower():
            return standard
    
    return book_name


def get_audio_metadata(file_path: Path) -> Dict:
    """Extract audio metadata from file"""
    try:
        from mutagen import File as MutagenFile
        
        audio = MutagenFile(file_path)
        if audio is None:
            return {}
        
        metadata = {
            'duration': getattr(audio.info, 'length', 0),
            'bitrate': getattr(audio.info, 'bitrate', 0),
            'file_size': file_path.stat().st_size,
            'format': file_path.suffix.lower()
        }
        
        # Add ID3 tags if available
        if hasattr(audio, 'tags') and audio.tags:
            tags = audio.tags
            metadata.update({
                'title': str(tags.get('TIT2', [''])[0]) if 'TIT2' in tags else '',
                'artist': str(tags.get('TPE1', [''])[0]) if 'TPE1' in tags else '',
                'album': str(tags.get('TALB', [''])[0]) if 'TALB' in tags else '',
            })
        
        return metadata
        
    except ImportError:
        logger.warning("Mutagen not installed, skipping audio metadata extraction")
        return {'file_size': file_path.stat().st_size}
    except Exception as e:
        logger.error(f"Failed to extract metadata from {file_path}: {e}")
        return {'file_size': file_path.stat().st_size}


def parse_directory_name(dir_name: str) -> Tuple[Optional[str], Optional[int]]:
    """Parse directory name to extract book name and order"""
    # Pattern for "01_Genesis" style directories
    match = re.match(r'(\d{1,2})_(.+)', dir_name)
    if match:
        book_order = int(match.group(1))
        book_name = normalize_book_name(match.group(2).replace('_', ' '))
        return book_name, book_order
    
    return None, None


def generate_r2_key(audio_type: str, speaker: str, book_name: str, filename: str) -> str:
    """Generate R2 storage key for audio file"""
    # Sanitize components for URL safety
    def sanitize(text: str) -> str:
        return re.sub(r'[^a-zA-Z0-9_-]', '_', text.lower())
    
    sanitized_speaker = sanitize(speaker)
    sanitized_book = sanitize(book_name)
    sanitized_filename = sanitize(Path(filename).stem) + Path(filename).suffix.lower()
    
    return f"{audio_type}/{sanitized_speaker}/{sanitized_book}/{sanitized_filename}"


def validate_mp3_file(file_path: Path) -> bool:
    """Validate that file is a valid MP3"""
    if not file_path.exists():
        return False
    
    if file_path.suffix.lower() != '.mp3':
        return False
    
    # Basic file size check (minimum 1KB)
    if file_path.stat().st_size < 1024:
        return False
    
    # Try to read MP3 header
    try:
        with open(file_path, 'rb') as f:
            header = f.read(3)
            # Check for MP3 magic bytes (ID3 tag or MP3 frame header)
            if header.startswith(b'ID3') or header.startswith(b'\xff\xfb'):
                return True
    except Exception:
        pass
    
    return False


def format_duration(seconds: float) -> str:
    """Format duration from seconds to human readable format"""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours}h {minutes}m"


def calculate_file_hash(file_path: Path) -> str:
    """Calculate SHA256 hash of file for deduplication"""
    import hashlib
    
    hash_sha256 = hashlib.sha256()
    try:
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_sha256.update(chunk)
        return hash_sha256.hexdigest()
    except Exception as e:
        logger.error(f"Failed to calculate hash for {file_path}: {e}")
        return ""
