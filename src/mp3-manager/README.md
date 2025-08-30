# Bible MP3 Manager

A Python package for managing Bible audio collections with Cloudflare R2 storage and PostgreSQL semantic linking.

## Features

- Upload MP3 files to Cloudflare R2 storage
- Link audio files to specific Bible verses, books, and chapters
- Support for Grace to You sermons and Word of Promise audio Bible
- Metadata extraction and storage in PostgreSQL
- Streaming URL generation for web/mobile apps
- Batch processing with progress tracking

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export CLOUDFLARE_ACCOUNT_ID="your_account_id"
export CLOUDFLARE_R2_ACCESS_KEY="your_access_key"
export CLOUDFLARE_R2_SECRET_KEY="your_secret_key"
export POSTGRES_URL="postgresql://user:pass@host:port/db"
```

3. Run the uploader:
```bash
python scripts/upload_audio_collection.py
```

## Directory Structure

```
bible-mp3-manager/
├── src/
│   ├── bible_mp3/
│   │   ├── __init__.py
│   │   ├── uploader.py      # Main upload functionality
│   │   ├── database.py      # PostgreSQL integration
│   │   └── utils.py         # Utility functions
├── scripts/
│   ├── upload_audio_collection.py  # Batch upload script
│   └── test_streaming.py           # Test audio streaming
├── config/
│   └── wrangler.toml               # Cloudflare Worker config
└── requirements.txt
```

## Audio Collection Support

### Grace to You Sermons
- Automatically processes numbered directories (01_Genesis, 02_Exodus, etc.)
- Links sermons to all verses in the corresponding book
- Organizes files as: `sermons/john_macarthur/{book}/{filename}.mp3`

### Word of Promise Audio Bible
- Processes complete Bible audio narration
- Links to verse ranges based on filename analysis
- Organizes files as: `bible_reading/{book}/{filename}.mp3`

## Database Schema

The package integrates with your existing PostgreSQL Bible database and adds:
- `resources` table for audio file metadata
- `verse_resource_link` table for verse-audio relationships
- `entity_resource_link` table for semantic connections

## Configuration

Edit `config/settings.json` to customize:
- Audio quality settings
- R2 bucket organization
- Database connection parameters
- Batch processing limits

## Development

To extend the package:
1. Add new audio source parsers in `src/bible_mp3/parsers/`
2. Create custom linking logic in `src/bible_mp3/linkers/`
3. Add streaming optimizations in `src/bible_mp3/streaming/`
