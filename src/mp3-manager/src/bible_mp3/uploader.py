#!/usr/bin/env python3
"""
Audio Uploader - Core MP3 management functionality
Handles upload to Cloudflare R2 and PostgreSQL metadata storage
"""

import os
import json
import hashlib
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import boto3
from botocore.config import Config
import psycopg2
from psycopg2.extras import RealDictCursor
from mutagen import File as MutagenFile
from mutagen.id3 import ID3NoHeaderError
import logging

logger = logging.getLogger(__name__)


class AudioUploader:
    """Handles MP3 uploads to Cloudflare R2 and database linking"""
    
    def __init__(self, 
                 account_id: str,
                 access_key: str, 
                 secret_key: str,
                 bucket_name: str,
                 postgres_url: str):
        
        # Initialize R2 client
        self.r2_client = boto3.client(
            's3',
            endpoint_url=f'https://{account_id}.r2.cloudflarestorage.com',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=Config(signature_version='s3v4')
        )
        self.bucket_name = bucket_name
        
        # Initialize database connection
        self.db_conn = psycopg2.connect(postgres_url)
        
        # Book name mappings for directory parsing
        self.book_mappings = {
            "01_Genesis": ("Genesis", 1),
            "02_Exodus": ("Exodus", 2),
            "03_Leviticus": ("Leviticus", 3),
            "04_Numbers": ("Numbers", 4),
            "05_Deuteronomy": ("Deuteronomy", 5),
            "06_Joshua": ("Joshua", 6),
            "07_Judges": ("Judges", 7),
            "08_Ruth": ("Ruth", 8),
            "09_1 Samuel": ("1 Samuel", 9),
            "10_2 Samuel": ("2 Samuel", 10),
            "11_1 Kings": ("1 Kings", 11),
            "12_2 Kings": ("2 Kings", 12),
            "13_1 Chronicles": ("1 Chronicles", 13),
            "14_2 Chronicles": ("2 Chronicles", 14),
            "15_Ezra": ("Ezra", 15),
            "16_Nehemiah": ("Nehemiah", 16),
            "17_Esther": ("Esther", 17),
            "18_Job": ("Job", 18),
            "19_Psalms": ("Psalms", 19),
            "20_Proverbs": ("Proverbs", 20),
            "21_Ecclesiastes": ("Ecclesiastes", 21),
            "22_Song of Solomon": ("Song of Solomon", 22),
            "23_Isaiah": ("Isaiah", 23),
            "24_Jeremiah": ("Jeremiah", 24),
            "25_Lamentations": ("Lamentations", 25),
            "26_Ezekiel": ("Ezekiel", 26),
            "27_Daniel": ("Daniel", 27),
            "28_Hosea": ("Hosea", 28),
            "29_Joel": ("Joel", 29),
            "30_Amos": ("Amos", 30),
            "31_Obadiah": ("Obadiah", 31),
            "32_Jonah": ("Jonah", 32),
            "33_Micah": ("Micah", 33),
            "34_Nahum": ("Nahum", 34),
            "35_Habakkuk": ("Habakkuk", 35),
            "36_Zephaniah": ("Zephaniah", 36),
            "37_Haggai": ("Haggai", 37),
            "38_Zechariah": ("Zechariah", 38),
            "39_Malachi": ("Malachi", 39),
            "40_Matthew": ("Matthew", 40),
            "41_Mark": ("Mark", 41),
            "42_Luke": ("Luke", 42),
            "43_John": ("John", 43),
            "44_Acts": ("Acts", 44),
            "45_Romans": ("Romans", 45),
            "46_1 Corinthians": ("1 Corinthians", 46),
            "47_2 Corinthians": ("2 Corinthians", 47),
            "48_Galatians": ("Galatians", 48),
            "49_Ephesians": ("Ephesians", 49),
            "50_Philippians": ("Philippians", 50),
            "51_Colossians": ("Colossians", 51),
            "52_1 Thessalonians": ("1 Thessalonians", 52),
            "53_2 Thessalonians": ("2 Thessalonians", 53),
            "54_1 Timothy": ("1 Timothy", 54),
            "55_2 Timothy": ("2 Timothy", 55),
            "56_Titus": ("Titus", 56),
            "57_Philemon": ("Philemon", 57),
            "58_Hebrews": ("Hebrews", 58),
            "59_James": ("James", 59),
            "60_1 Peter": ("1 Peter", 60),
            "61_2 Peter": ("2 Peter", 61),
            "62_1 John": ("1 John", 62),
            "63_2 John": ("2 John", 63),
            "64_3 John": ("3 John", 64),
            "65_Jude": ("Jude", 65),
            "66_Revelation": ("Revelation", 66)
        }
    
    def get_audio_metadata(self, file_path: Path) -> Dict:
        """Extract metadata from MP3 file"""
        try:
            audio_file = MutagenFile(file_path)
            if audio_file is None:
                return {}
                
            metadata = {
                'duration': getattr(audio_file.info, 'length', 0),
                'bitrate': getattr(audio_file.info, 'bitrate', 0),
                'sample_rate': getattr(audio_file.info, 'sample_rate', 0),
                'title': '',
                'artist': '',
                'album': '',
                'track': ''
            }
            
            # Extract ID3 tags if available
            if hasattr(audio_file, 'tags') and audio_file.tags:
                tags = audio_file.tags
                metadata.update({
                    'title': str(tags.get('TIT2', [''])[0]) if 'TIT2' in tags else '',
                    'artist': str(tags.get('TPE1', [''])[0]) if 'TPE1' in tags else '',
                    'album': str(tags.get('TALB', [''])[0]) if 'TALB' in tags else '',
                    'track': str(tags.get('TRCK', [''])[0]) if 'TRCK' in tags else ''
                })
            
            return metadata
            
        except (ID3NoHeaderError, Exception) as e:
            logger.warning(f"Could not extract metadata from {file_path}: {e}")
            return {}
    
    def upload_to_r2(self, file_path: Path, r2_key: str) -> Tuple[bool, str]:
        """Upload MP3 file to Cloudflare R2"""
        try:
            with open(file_path, 'rb') as f:
                self.r2_client.upload_fileobj(
                    f, 
                    self.bucket_name, 
                    r2_key,
                    ExtraArgs={'ContentType': 'audio/mpeg'}
                )
            
            # Generate streaming URL
            streaming_url = f"https://your-worker-domain.workers.dev/audio/{r2_key}"
            return True, streaming_url
            
        except Exception as e:
            logger.error(f"Failed to upload {file_path} to R2: {e}")
            return False, str(e)
    
    def store_audio_metadata(self, 
                           file_path: Path,
                           r2_key: str, 
                           streaming_url: str,
                           book_name: str,
                           audio_type: str = "sermon",
                           speaker: str = "John MacArthur") -> Optional[str]:
        """Store audio metadata in PostgreSQL"""
        try:
            metadata = self.get_audio_metadata(file_path)
            file_size = file_path.stat().st_size
            
            # Create resource record
            resource_id = hashlib.md5(r2_key.encode()).hexdigest()[:16]
            
            with self.db_conn.cursor() as cursor:
                # Insert into resources table
                cursor.execute("""
                    INSERT INTO resources (id, type, title, url, local_path, file_size, mime_type, meta)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET 
                        title = EXCLUDED.title,
                        url = EXCLUDED.url,
                        file_size = EXCLUDED.file_size,
                        meta = EXCLUDED.meta
                """, (
                    resource_id,
                    'audio',
                    file_path.name,
                    streaming_url,
                    r2_key,
                    file_size,
                    'audio/mpeg',
                    json.dumps({
                        'duration': metadata.get('duration', 0),
                        'bitrate': metadata.get('bitrate', 0),
                        'audio_type': audio_type,
                        'speaker': speaker,
                        'book_name': book_name,
                        **metadata
                    })
                ))
                
                self.db_conn.commit()
                logger.info(f"Stored metadata for {file_path.name} as resource {resource_id}")
                return resource_id
                
        except Exception as e:
            logger.error(f"Failed to store metadata for {file_path}: {e}")
            self.db_conn.rollback()
            return None
    
    def link_audio_to_book(self, resource_id: str, book_name: str) -> bool:
        """Link audio resource to all verses in a book"""
        try:
            with self.db_conn.cursor() as cursor:
                # Get book ID
                cursor.execute("SELECT id FROM books WHERE name = %s", (book_name,))
                book_result = cursor.fetchone()
                
                if not book_result:
                    logger.warning(f"Book '{book_name}' not found in database")
                    return False
                
                book_id = book_result[0]
                
                # Get all verses for this book
                cursor.execute("SELECT id FROM verses WHERE book_id = %s", (book_id,))
                verse_ids = [row[0] for row in cursor.fetchall()]
                
                if not verse_ids:
                    logger.warning(f"No verses found for book '{book_name}'")
                    return False
                
                # Link resource to all verses in the book
                for verse_id in verse_ids:
                    cursor.execute("""
                        INSERT INTO verse_resource_link (verse_id, resource_id, label, relevance)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (verse_id, resource_id, f"Audio commentary", 0.85))
                
                self.db_conn.commit()
                logger.info(f"Linked resource {resource_id} to {len(verse_ids)} verses in {book_name}")
                return True
                
        except Exception as e:
            logger.error(f"Failed to link resource {resource_id} to book {book_name}: {e}")
            self.db_conn.rollback()
            return False
    
    def process_grace_to_you_directory(self, base_dir: Path, test_mode: bool = True) -> Dict:
        """Process Grace to You sermon directories"""
        results = {"processed": [], "errors": [], "skipped": []}
        
        # Find numbered book directories
        book_dirs = [d for d in base_dir.iterdir() 
                    if d.is_dir() and any(d.name.startswith(f"{i:02d}_") for i in range(1, 67))]
        
        for book_dir in sorted(book_dirs):
            if book_dir.name not in self.book_mappings:
                logger.warning(f"Unknown book directory: {book_dir.name}")
                continue
            
            book_name, book_order = self.book_mappings[book_dir.name]
            logger.info(f"Processing {book_name} from {book_dir}")
            
            # Find MP3 files
            mp3_files = list(book_dir.glob("*.mp3"))
            
            if test_mode and len(results["processed"]) >= 5:
                logger.info("Test mode: Stopping after 5 files")
                break
            
            for mp3_file in mp3_files:
                try:
                    # Generate R2 key
                    r2_key = f"sermons/john_macarthur/{book_name.lower().replace(' ', '_')}/{mp3_file.name}"
                    
                    # Upload to R2
                    success, streaming_url = self.upload_to_r2(mp3_file, r2_key)
                    if not success:
                        results["errors"].append(f"Upload failed: {mp3_file} - {streaming_url}")
                        continue
                    
                    # Store metadata
                    resource_id = self.store_audio_metadata(
                        mp3_file, r2_key, streaming_url, book_name, "sermon", "John MacArthur"
                    )
                    
                    if resource_id:
                        # Link to book verses
                        if self.link_audio_to_book(resource_id, book_name):
                            results["processed"].append({
                                "file": str(mp3_file),
                                "book": book_name,
                                "resource_id": resource_id,
                                "streaming_url": streaming_url
                            })
                        else:
                            results["errors"].append(f"Linking failed: {mp3_file}")
                    else:
                        results["errors"].append(f"Metadata storage failed: {mp3_file}")
                    
                    if test_mode and len(results["processed"]) >= 5:
                        break
                        
                except Exception as e:
                    results["errors"].append(f"Processing failed: {mp3_file} - {e}")
                    logger.error(f"Failed to process {mp3_file}: {e}")
        
        return results
    
    def __del__(self):
        """Cleanup database connection"""
        if hasattr(self, 'db_conn'):
            self.db_conn.close()
