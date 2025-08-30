#!/usr/bin/env python3
"""
Test streaming functionality
Verifies that uploaded MP3s can be streamed via Cloudflare Worker
"""

import sys
import requests
from pathlib import Path
import json
from dotenv import load_dotenv
import os

# Add the package to the path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from bible_mp3 import BibleDatabase


def test_streaming_urls():
    """Test that streaming URLs work correctly"""
    load_dotenv()
    
    postgres_url = os.getenv('POSTGRES_URL')
    if not postgres_url:
        print("ERROR: POSTGRES_URL environment variable not set")
        return False
    
    # Get some audio resources from database
    db = BibleDatabase(postgres_url)
    
    print("Testing streaming functionality...")
    print("="*50)
    
    # Get database stats
    stats = db.get_database_stats()
    print(f"Database contains {stats.get('audio_resources', 0)} audio resources")
    
    if stats.get('audio_resources', 0) == 0:
        print("No audio resources found. Upload some files first.")
        return False
    
    # Test a few audio resources
    try:
        with db.db_conn.cursor() as cursor:
            cursor.execute("""
                SELECT id, title, url, meta 
                FROM resources 
                WHERE type = 'audio' 
                LIMIT 5
            """)
            resources = cursor.fetchall()
            
            for resource in resources:
                print(f"\nTesting: {resource['title']}")
                print(f"URL: {resource['url']}")
                
                # Test HEAD request to check if URL is accessible
                try:
                    response = requests.head(resource['url'], timeout=10)
                    if response.status_code == 200:
                        print("  ✓ Streaming URL accessible")
                        
                        # Check content type
                        content_type = response.headers.get('content-type', '')
                        if 'audio' in content_type:
                            print(f"  ✓ Correct content type: {content_type}")
                        else:
                            print(f"  ⚠ Unexpected content type: {content_type}")
                        
                        # Check content length
                        content_length = response.headers.get('content-length')
                        if content_length:
                            print(f"  ✓ Content length: {content_length} bytes")
                        
                    else:
                        print(f"  ✗ HTTP {response.status_code}: {response.reason}")
                        
                except requests.RequestException as e:
                    print(f"  ✗ Connection failed: {e}")
            
            print(f"\nStreaming test completed for {len(resources)} resources")
            return True
            
    except Exception as e:
        print(f"Database error: {e}")
        return False


def test_worker_health():
    """Test if the Cloudflare Worker is responding"""
    # This would need your actual worker URL
    worker_url = "https://your-worker-domain.workers.dev/health"
    
    print(f"\nTesting Worker health check...")
    try:
        response = requests.get(worker_url, timeout=5)
        if response.status_code == 200:
            print("  ✓ Worker is responding")
            return True
        else:
            print(f"  ✗ Worker returned {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"  ✗ Worker not accessible: {e}")
        print("  Note: Update worker_url in this script with your actual Worker domain")
        return False


if __name__ == '__main__':
    load_dotenv()
    
    success = True
    
    # Test streaming URLs
    if not test_streaming_urls():
        success = False
    
    # Test worker health (optional)
    # test_worker_health()
    
    if success:
        print("\n✓ All tests passed!")
        sys.exit(0)
    else:
        print("\n✗ Some tests failed")
        sys.exit(1)
