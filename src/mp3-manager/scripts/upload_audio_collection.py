#!/usr/bin/env python3
"""
Bible Audio Collection Uploader
Batch processes your Grace to You sermons and Word of Promise audio
"""

import os
import sys
from pathlib import Path
import argparse
import logging
from dotenv import load_dotenv
import json
from tqdm import tqdm

# Add the package to the path
sys.path.insert(0, str(Path(__file__).parent.parent / 'src'))

from bible_mp3 import AudioUploader, BibleDatabase


def setup_logging(verbose: bool = False):
    """Configure logging"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('bible_mp3_upload.log'),
            logging.StreamHandler()
        ]
    )


def load_config():
    """Load configuration from environment variables"""
    load_dotenv()
    
    required_vars = [
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_R2_ACCESS_KEY', 
        'CLOUDFLARE_R2_SECRET_KEY',
        'POSTGRES_URL'
    ]
    
    config = {}
    missing_vars = []
    
    for var in required_vars:
        value = os.getenv(var)
        if not value:
            missing_vars.append(var)
        else:
            config[var.lower()] = value
    
    if missing_vars:
        print("Missing required environment variables:")
        for var in missing_vars:
            print(f"  {var}")
        print("\nCreate a .env file with these variables or set them in your environment.")
        sys.exit(1)
    
    return config


def main():
    parser = argparse.ArgumentParser(description='Upload Bible audio collections to Cloudflare R2')
    parser.add_argument('--grace-to-you-path', 
                       default=r'D:\GraceToYouSermons\Downloads',
                       help='Path to Grace to You sermon directories')
    parser.add_argument('--word-of-promise-path',
                       default=r'C:\Users\Yellowkid\Proton Drive\eowokc28\Shared with me\Word of Promise',
                       help='Path to Word of Promise audio Bible')
    parser.add_argument('--test-mode', action='store_true',
                       help='Test mode - process only 5 files')
    parser.add_argument('--collection', choices=['grace-to-you', 'word-of-promise', 'both'],
                       default='grace-to-you',
                       help='Which collection to process')
    parser.add_argument('--bucket-name', default='bible-audio-storage',
                       help='R2 bucket name')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose logging')
    
    args = parser.parse_args()
    
    # Setup
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    # Load configuration
    try:
        config = load_config()
    except SystemExit:
        return 1
    
    # Initialize uploader
    try:
        uploader = AudioUploader(
            account_id=config['cloudflare_account_id'],
            access_key=config['cloudflare_r2_access_key'],
            secret_key=config['cloudflare_r2_secret_key'],
            bucket_name=args.bucket_name,
            postgres_url=config['postgres_url']
        )
        
        db = BibleDatabase(config['postgres_url'])
        
    except Exception as e:
        logger.error(f"Failed to initialize uploader: {e}")
        return 1
    
    # Show database stats
    stats = db.get_database_stats()
    logger.info(f"Database stats: {json.dumps(stats, indent=2)}")
    
    results = {"processed": [], "errors": [], "skipped": []}
    
    # Process Grace to You sermons
    if args.collection in ['grace-to-you', 'both']:
        grace_path = Path(args.grace_to_you_path)
        if grace_path.exists():
            logger.info(f"Processing Grace to You sermons from: {grace_path}")
            grace_results = uploader.process_grace_to_you_directory(grace_path, args.test_mode)
            
            # Merge results
            results["processed"].extend(grace_results["processed"])
            results["errors"].extend(grace_results["errors"])
            results["skipped"].extend(grace_results["skipped"])
        else:
            logger.warning(f"Grace to You directory not found: {grace_path}")
    
    # Process Word of Promise (placeholder for now)
    if args.collection in ['word-of-promise', 'both']:
        wop_path = Path(args.word_of_promise_path)
        if wop_path.exists():
            logger.info(f"Word of Promise directory found: {wop_path}")
            logger.info("Word of Promise processing not implemented yet")
            # TODO: Implement Word of Promise processing
        else:
            logger.warning(f"Word of Promise directory not found: {wop_path}")
    
    # Results summary
    print("\n" + "="*60)
    print("UPLOAD RESULTS")
    print("="*60)
    print(f"Successfully processed: {len(results['processed'])} files")
    print(f"Errors: {len(results['errors'])} files")
    print(f"Skipped: {len(results['skipped'])} files")
    
    if results['processed']:
        print("\nSuccessfully uploaded files:")
        for item in results['processed']:
            print(f"  ✓ {Path(item['file']).name} -> {item['book']}")
    
    if results['errors']:
        print("\nErrors encountered:")
        for error in results['errors']:
            print(f"  ✗ {error}")
    
    # Updated database stats
    final_stats = db.get_database_stats()
    print(f"\nFinal database stats:")
    print(f"  Audio resources: {final_stats.get('audio_resources', 0)}")
    print(f"  Verse-audio links: {final_stats.get('verse_audio_links', 0)}")
    
    if args.test_mode:
        print("\n[TEST MODE] - Only 5 files processed for testing")
        print("Remove --test-mode to process full collection")
    
    return 0 if not results['errors'] else 1


if __name__ == '__main__':
    sys.exit(main())
