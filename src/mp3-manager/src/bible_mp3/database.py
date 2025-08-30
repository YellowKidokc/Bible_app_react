#!/usr/bin/env python3
"""
Database utilities for Bible MP3 management
Handles PostgreSQL operations and Bible-specific data structures
"""

import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Dict, List, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class BibleDatabase:
    """Database interface for Bible study system"""
    
    def __init__(self, postgres_url: str):
        self.db_conn = psycopg2.connect(postgres_url, cursor_factory=RealDictCursor)
    
    def get_book_id_by_name(self, book_name: str) -> Optional[int]:
        """Get book ID from book name"""
        try:
            with self.db_conn.cursor() as cursor:
                cursor.execute("SELECT id FROM books WHERE name = %s", (book_name,))
                result = cursor.fetchone()
                return result['id'] if result else None
        except Exception as e:
            logger.error(f"Failed to get book ID for {book_name}: {e}")
            return None
    
    def get_all_books(self) -> List[Dict]:
        """Get all books with their metadata"""
        try:
            with self.db_conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id, name, abbreviation, testament, book_order, chapter_count
                    FROM books 
                    ORDER BY book_order
                """)
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"Failed to get books: {e}")
            return []
    
    def get_verses_by_book(self, book_id: int) -> List[Dict]:
        """Get all verses for a specific book"""
        try:
            with self.db_conn.cursor() as cursor:
                cursor.execute("""
                    SELECT v.id, v.verse_number, c.chapter_number, v.text
                    FROM verses v
                    JOIN chapters c ON c.id = v.chapter_id
                    WHERE v.book_id = %s
                    ORDER BY c.chapter_number, v.verse_number
                """, (book_id,))
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"Failed to get verses for book {book_id}: {e}")
            return []
    
    def create_resource(self, 
                       resource_id: str,
                       title: str,
                       url: str,
                       resource_type: str = 'audio',
                       metadata: Dict = None) -> bool:
        """Create a new resource record"""
        try:
            with self.db_conn.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO resources (id, type, title, url, meta, created_at)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        url = EXCLUDED.url,
                        meta = EXCLUDED.meta
                """, (
                    resource_id,
                    resource_type,
                    title,
                    url,
                    psycopg2.extras.Json(metadata or {})
                ))
                self.db_conn.commit()
                return True
        except Exception as e:
            logger.error(f"Failed to create resource {resource_id}: {e}")
            self.db_conn.rollback()
            return False
    
    def link_resource_to_verses(self, 
                               resource_id: str,
                               verse_ids: List[int],
                               label: str = "Audio commentary",
                               relevance: float = 0.8) -> bool:
        """Link a resource to multiple verses"""
        try:
            with self.db_conn.cursor() as cursor:
                for verse_id in verse_ids:
                    cursor.execute("""
                        INSERT INTO verse_resource_link (verse_id, resource_id, label, relevance)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT DO NOTHING
                    """, (verse_id, resource_id, label, relevance))
                
                self.db_conn.commit()
                logger.info(f"Linked resource {resource_id} to {len(verse_ids)} verses")
                return True
        except Exception as e:
            logger.error(f"Failed to link resource {resource_id} to verses: {e}")
            self.db_conn.rollback()
            return False
    
    def get_audio_resources_by_book(self, book_name: str) -> List[Dict]:
        """Get all audio resources linked to a specific book"""
        try:
            with self.db_conn.cursor() as cursor:
                cursor.execute("""
                    SELECT DISTINCT r.id, r.title, r.url, r.meta, r.created_at
                    FROM resources r
                    JOIN verse_resource_link vrl ON vrl.resource_id = r.id
                    JOIN verses v ON v.id = vrl.verse_id
                    JOIN books b ON b.id = v.book_id
                    WHERE r.type = 'audio' AND b.name = %s
                    ORDER BY r.created_at
                """, (book_name,))
                return cursor.fetchall()
        except Exception as e:
            logger.error(f"Failed to get audio resources for book {book_name}: {e}")
            return []
    
    def get_database_stats(self) -> Dict:
        """Get statistics about the database content"""
        try:
            with self.db_conn.cursor() as cursor:
                stats = {}
                
                # Count books
                cursor.execute("SELECT COUNT(*) as count FROM books")
                stats['books'] = cursor.fetchone()['count']
                
                # Count verses
                cursor.execute("SELECT COUNT(*) as count FROM verses")
                stats['verses'] = cursor.fetchone()['count']
                
                # Count audio resources
                cursor.execute("SELECT COUNT(*) as count FROM resources WHERE type = 'audio'")
                stats['audio_resources'] = cursor.fetchone()['count']
                
                # Count verse-audio links
                cursor.execute("""
                    SELECT COUNT(*) as count 
                    FROM verse_resource_link vrl
                    JOIN resources r ON r.id = vrl.resource_id
                    WHERE r.type = 'audio'
                """)
                stats['verse_audio_links'] = cursor.fetchone()['count']
                
                return stats
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {}
    
    def __del__(self):
        """Cleanup database connection"""
        if hasattr(self, 'db_conn'):
            self.db_conn.close()
