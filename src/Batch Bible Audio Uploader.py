#!/usr/bin/env python3
"""
Batch Bible Audio Uploader
Handles your specific directory structure and uploads to Cloudflare R2
Links audio to verses/books in your PostgreSQL Bible database
"""

import os
import json
import re
import subprocess
from pathlib import Path
from typing import List, Dict, Optional, Tuple
import psycopg2
import hashlib
from datetime import datetime

# Your paths
WORD_OF_PROMISE_PATH = r"C:\Users\Yellowkid\Proton Drive\eowokc28\Shared with me\Word of Promise"
GRACE_TO_YOU_PATH = r"D:\GraceToYouSermons\Downloads"

PG_CONFIG = {
    'host': '192.168.1.177',
    'port': 2665,
    'database': 'QSF',
    'user': 'root',
    'password': 'mariushostingroot'
}

# Book number to name mapping for Grace to You structure
BOOK_MAPPING = {
    '01': 'Genesis', '02': 'Exodus', '03': 'Leviticus', '04': 'Numbers', '05': 'Deuteronomy',
    '06': 'Joshua', '07': 'Judges', '08': 'Ruth', '09': '1 Samuel', '10': '2 Samuel',
    '11': '1 Kings', '12': '2 Kings', '13': '1 Chronicles', '14': '2 Chronicles', '15': 'Ezra',
    '16': 'Nehemiah', '17': 'Esther', '18': 'Job', '19': 'Psalms', '20': 'Proverbs',
    '21': 'Ecclesiastes', '22': 'Song of Solomon', '23': 'Isaiah', '24': 'Jeremiah', '25': 'Lamentations',
    '26': 'Ezekiel', '27': 'Daniel', '28': 'Hosea', '29': 'Joel', '30': 'Amos',
    '31': 'Obadiah', '32': 'Jonah', '33': 'Micah', '34': 'Nahum', '35': 'Habakkuk',
    '36': 'Zephaniah', '37': 'Haggai', '38': 'Zechariah', '39': 'Malachi', '40': 'Matthew',
    '41': 'Mark', '42': 'Luke', '43': 'John', '44': 'Acts', '45': 'Romans',
    '46': '1 Corinthians', '47': '2 Corinthians', '48': 'Galatians', '49': 'Ephesians', '50': 'Philippians',
    '51': 'Colossians', '52': '1 Thessalonians', '53': '2 Thessalonians', '54': '1 Timothy', '55': '2 Timothy',
    '56': 'Titus', '57': 'Philemon', '58': 'Hebrews', '59': 'James', '60': '1 Peter',
    '61': '2 Peter', '62': '1 John', '63': '2 John', '64': '3 John', '65': 'Jude', '66': 'Revelation'
}

class BibleAudioBatchUploader:
    """Handles batch upload of your Bible audio collections"""
    
    def __init__(self):
        self.pg_conn = None
        self.connect_postgres()
        self.book_ids = {}
        self.load_book_mappings()
    
    def connect_postgres(self) -> bool:
        """Connect to PostgreSQL database"""
        try:
            self.pg_conn = psycopg2.connect(**PG_CONFIG)
            self.pg_conn.autocommit = False
            print("Connected to PostgreSQL")
            return True
        except Exception as e:
            print(f"Failed to connect to PostgreSQL: {e}")
            return False
    
    def load_book_mappings(self):
        """Load book name to ID mappings from database"""
        if not self.pg_conn:
            return
        
        try:
            with self.pg_conn.cursor() as cur:
                cur.execute("SELECT id, name, abbreviation FROM books")
                for book_id, name, abbrev in cur.fetchall():
                    self.book_ids[name.lower()] = book_id
                    if abbrev:
                        self.book_ids[abbrev.lower()] = book_id
                print(f"Loaded {len(self.book_ids)} book mappings")
        except Exception as e:
            print(f"Error loading book mappings: {e}")
    
    def get_book_id(self, book_name: str) -> Optional[int]:
        """Get book ID from name, handling variations"""
        book_name = book_name.lower().strip()
        
        # Direct match
        if book_name in self.book_ids:
            return self.book_ids[book_name]
        
        # Try variations
        variations = [
            book_name.replace(' ', ''),  # "1samuel"
            book_name.replace('1 ', 'first '),  # "first samuel"  
            book_name.replace('2 ', 'second '),  # "second samuel"
            book_name.replace('3 ', 'third '),  # "third john"
        ]
        
        for variation in variations:
            if variation in self.book_ids:
                return self.book_ids[variation]
        
        return None
    
    def scan_word_of_promise_files(self) -> List[Dict]:
        """Scan Word of Promise directory for audio files"""
        files = []
        wop_path = Path(WORD_OF_PROMISE_PATH)
        
        if not wop_path.exists():
            print(f"Word of Promise path not found: {wop_path}")
            return files
        
        print(f"Scanning Word of Promise: {wop_path}")
        
        for audio_file in wop_path.rglob("*.mp3"):
            # Try to extract book name from filename
            filename = audio_file.stem
            
            # Common patterns in Bible audio filenames
            book_patterns = [
                r'^(\d*\s*[A-Za-z]+)',  # "1 Samuel" or "Genesis"
                r'(\d+[A-Za-z]+)',      # "1Samuel" 
                r'([A-Za-z]+)'          # Just the book name
            ]
            
            book_name = None
            for pattern in book_patterns:
                match = re.search(pattern, filename)
                if match:
                    potential_book = match.group(1).strip()
                    book_id = self.get_book_id(potential_book)
                    if book_id:
                        book_name = potential_book
                        break
            
            files.append({
                'path': str(audio_file),
                'filename': filename,
                'book_name': book_name,
                'book_id': self.get_book_id(book_name) if book_name else None,
                'size': audio_file.stat().st_size,
                'type': 'bible_reading',
                'source': 'Word of Promise',
                'speaker': 'Multiple'  # Word of Promise uses multiple actors
            })
        
        print(f"Found {len(files)} Word of Promise files")
        return files
    
    def scan_grace_to_you_files(self) -> List[Dict]:
        """Scan Grace to You sermon directories"""
        files = []
        gty_path = Path(GRACE_TO_YOU_PATH)
        
        if not gty_path.exists():
            print(f"Grace to You path not found: {gty_path}")
            return files
        
        print(f"Scanning Grace to You: {gty_path}")
        
        # Each directory is like "01_Genesis", "45_Romans", etc.
        for book_dir in gty_path.iterdir():
            if not book_dir.is_dir():
                continue
            
            # Extract book number and name from directory
            dir_match = re.match(r'^(\d+)_(.+)$', book_dir.name)
            if not dir_match:
                print(f"Skipping non-matching directory: {book_dir.name}")
                continue
            
            book_num, book_name = dir_match.groups()
            book_name = book_name.replace('_', ' ')
            
            # Get book ID
            book_id = self.get_book_id(book_name)
            if not book_id:
                print(f"No book ID found for: {book_name}")
                continue
            
            # Scan for audio files in this book directory
            book_files = []
            for audio_file in book_dir.rglob("*.mp3"):
                book_files.append({
                    'path': str(audio_file),
                    'filename': audio_file.stem,
                    'book_name': book_name,
                    'book_id': book_id,
                    'size': audio_file.stat().st_size,
                    'type': 'sermon',
                    'source': 'Grace to You',
                    'speaker': 'John MacArthur',
                    'book_number': book_num
                })
            
            files.extend(book_files)
            print(f"Found {len(book_files)} files in {book_name}")
        
        print(f"Total Grace to You files: {len(files)}")
        return files
    
    def create_r2_key(self, file_info: Dict) -> str:
        """Generate organized R2 key for file"""
        book_name = file_info.get('book_name', 'Unknown').lower()
        safe_book = re.sub(r'[^\w\-_]', '_', book_name)
        safe_filename = re.sub(r'[^\w\-_.]', '_', file_info['filename'])
        
        if file_info['type'] == 'bible_reading':
            return f"bible_reading/{safe_book}/{safe_filename}.mp3"
        else:  # sermon
            speaker = file_info.get('speaker', 'Unknown').lower().replace(' ', '_')
            return f"sermons/{speaker}/{safe_book}/{safe_filename}.mp3"
    
    def upload_to_r2(self, file_path: str, r2_key: str, metadata: Dict = None) -> bool:
        """Upload file to R2 using wrangler CLI"""
        try:
            cmd = [
                'npx', 'wrangler', 'r2', 'object', 'put',
                f"bible-audio-storage/{r2_key}",
                '--file', file_path,
                '--content-type', 'audio/mpeg'
            ]
            
            # Add metadata
            if metadata:
                for key, value in metadata.items():
                    cmd.extend(['--metadata', f"{key}:{str(value)}"])
            
            print(f"Uploading: {r2_key}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode == 0:
                print(f"✓ Uploaded: {r2_key}")
                return True
            else:
                print(f"✗ Upload failed: {result.stderr}")
                return False
                
        except subprocess.TimeoutExpired:
            print(f"✗ Upload timeout: {r2_key}")
            return False
        except Exception as e:
            print(f"✗ Upload error: {e}")
            return False
    
    def create_resource_record(self, file_info: Dict, r2_key: str) -> Optional[str]:
        """Create resource record in PostgreSQL"""
        if not self.pg_conn:
            return None
        
        try:
            # Generate resource ID
            resource_id = f"AUDIO-{hashlib.md5(r2_key.encode()).hexdigest()[:12].upper()}"
            
            # Build metadata
            metadata = {
                'r2_key': r2_key,
                'source': file_info['source'],
                'audio_type': file_info['type'],
                'original_path': file_info['path'],
                'file_size': file_info['size']
            }
            
            if file_info.get('speaker'):
                metadata['speaker'] = file_info['speaker']
            if file_info.get('book_number'):
                metadata['book_number'] = file_info['book_number']
            
            # Streaming URL (update with your actual worker URL)
            stream_url = f"https://bible-audio-streaming.your-subdomain.workers.dev/audio/{r2_key}"
            
            with self.pg_conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO resources (id, type, title, url, provider, 
                                         file_size, mime_type, meta, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        url = EXCLUDED.url,
                        meta = EXCLUDED.meta
                    RETURNING id
                """, (
                    resource_id, 'audio', 
                    f"{file_info['book_name']} - {file_info['filename']}",
                    stream_url, 'Cloudflare R2',
                    file_info['size'], 'audio/mpeg',
                    json.dumps(metadata), datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    self.pg_conn.commit()
                    return result[0]
                    
        except Exception as e:
            print(f"Database error: {e}")
            if self.pg_conn:
                self.pg_conn.rollback()
        
        return None
    
    def link_to_book_verses(self, resource_id: str, book_id: int, 
                           audio_type: str) -> int:
        """Link audio resource to all verses in a book"""
        if not self.pg_conn:
            return 0
        
        try:
            with self.pg_conn.cursor() as cur:
                # Get all verses for this book
                cur.execute("""
                    SELECT id FROM verses WHERE book_id = %s
                """, (book_id,))
                
                verse_ids = [row[0] for row in cur.fetchall()]
                
                if not verse_ids:
                    return 0
                
                links_created = 0
                for verse_id in verse_ids:
                    link_id = f"VRL-{hashlib.md5(f'{verse_id}-{resource_id}'.encode()).hexdigest()[:12]}"
                    
                    relevance = 0.9 if audio_type == 'bible_reading' else 0.7
                    label = f"{audio_type.replace('_', ' ').title()} audio"
                    
                    cur.execute("""
                        INSERT INTO verse_resource_link 
                        (id, verse_id, resource_id, label, relevance, meta)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (
                        link_id, verse_id, resource_id, label, relevance,
                        json.dumps({'batch_linked': True, 'audio_type': audio_type})
                    ))
                    
                    if cur.rowcount > 0:
                        links_created += 1
                
                self.pg_conn.commit()
                return links_created
                
        except Exception as e:
            print(f"Error linking to verses: {e}")
            if self.pg_conn:
                self.pg_conn.rollback()
            return 0
    
    def process_file_batch(self, files: List[Dict], max_files: int = None) -> Dict:
        """Process a batch of files"""
        stats = {
            'total': len(files),
            'uploaded': 0,
            'db_created': 0,
            'linked': 0,
            'errors': 0
        }
        
        if max_files:
            files = files[:max_files]
            print(f"Processing first {max_files} files only")
        
        for i, file_info in enumerate(files, 1):
            print(f"\n[{i}/{len(files)}] Processing: {file_info['filename']}")
            
            try:
                # Generate R2 key
                r2_key = self.create_r2_key(file_info)
                
                # Upload to R2
                metadata = {
                    'speaker': file_info.get('speaker', ''),
                    'source': file_info['source'],
                    'book': file_info.get('book_name', ''),
                    'type': file_info['type']
                }
                
                if self.upload_to_r2(file_info['path'], r2_key, metadata):
                    stats['uploaded'] += 1
                    
                    # Create database record
                    resource_id = self.create_resource_record(file_info, r2_key)
                    if resource_id:
                        stats['db_created'] += 1
                        
                        # Link to book verses if book ID available
                        if file_info.get('book_id'):
                            links = self.link_to_book_verses(
                                resource_id, file_info['book_id'], file_info['type']
                            )
                            stats['linked'] += links
                            print(f"  Linked to {links} verses")
                        
                        print(f"  ✓ Resource: {resource_id}")
                    else:
                        print(f"  ✗ Failed to create database record")
                        stats['errors'] += 1
                else:
                    print(f"  ✗ Upload failed")
                    stats['errors'] += 1
                    
            except Exception as e:
                print(f"  ✗ Error processing file: {e}")
                stats['errors'] += 1
        
        return stats
    
    def run_batch_upload(self, include_word_of_promise: bool = True, 
                        include_grace_to_you: bool = True, 
                        max_files_per_type: int = None):
        """Run the complete batch upload process"""
        
        print("="*60)
        print("BIBLE AUDIO BATCH UPLOADER")
        print("="*60)
        
        all_files = []
        
        # Scan Word of Promise
        if include_word_of_promise:
            wop_files = self.scan_word_of_promise_files()
            all_files.extend(wop_files)
        
        # Scan Grace to You
        if include_grace_to_you:
            gty_files = self.scan_grace_to_you_files()
            all_files.extend(gty_files)
        
        if not all_files:
            print("No audio files found to process")
            return
        
        # Show summary
        total_size = sum(f['size'] for f in all_files) / (1024**3)  # GB
        print(f"\nFound {len(all_files)} audio files ({total_size:.1f} GB total)")
        
        # Group by type for summary
        by_type = {}
        for f in all_files:
            t = f['type']
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(f)
        
        for audio_type, files in by_type.items():
            size_gb = sum(f['size'] for f in files) / (1024**3)
            print(f"  {audio_type}: {len(files)} files ({size_gb:.1f} GB)")
        
        # Confirm before proceeding
        response = input(f"\nProceed with upload? (y/N): ")
        if response.lower() != 'y':
            print("Upload cancelled")
            return
        
        # Process files
        print(f"\nStarting batch upload...")
        stats = self.process_file_batch(all_files, max_files_per_type)
        
        # Final summary
        print(f"\n" + "="*60)
        print("UPLOAD COMPLETE")
        print("="*60)
        print(f"Total files processed: {stats['total']}")
        print(f"Successfully uploaded: {stats['uploaded']}")
        print(f"Database records created: {stats['db_created']}")
        print(f"Verse links created: {stats['linked']}")
        print(f"Errors: {stats['errors']}")
        
        if stats['uploaded'] > 0:
            print(f"\nAudio files are now available via your Worker URL")
            print(f"Database contains metadata and verse linkings")


def main():
    """Main execution"""
    uploader = BibleAudioBatchUploader()
    
    # Test run with limited files first
    print("Starting with a small test batch...")
    uploader.run_batch_upload(
        include_word_of_promise=True,
        include_grace_to_you=True, 
        max_files_per_type=5  # Start with just 5 files for testing
    )

if __name__ == "__main__":
    main()