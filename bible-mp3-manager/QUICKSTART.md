# Quick Start Guide - Bible MP3 Manager

## Installation

1. **Copy environment template:**
   ```bash
   cp .env.template .env
   ```

2. **Edit `.env` file with your credentials:**
   - Get your Cloudflare Account ID from the dashboard
   - Create R2 API tokens in Cloudflare dashboard
   - Your PostgreSQL URL is already in the template

3. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run setup validation:**
   ```bash
   python setup.py
   ```

## Usage

### Test Upload (Recommended First Step)
```bash
python scripts/upload_audio_collection.py --test-mode
```
This uploads only 5 files to verify everything works.

### Process Grace to You Sermons
```bash
python scripts/upload_audio_collection.py --collection grace-to-you
```

### Process Word of Promise Audio Bible
```bash
python scripts/upload_audio_collection.py --collection word-of-promise
```

### Process Both Collections
```bash
python scripts/upload_audio_collection.py --collection both
```

## Deploy Cloudflare Worker

1. **Install Wrangler CLI:**
   ```bash
   npm install -g wrangler
   ```

2. **Deploy the worker:**
   ```bash
   cd worker
   wrangler deploy
   ```

3. **Test streaming:**
   ```bash
   python scripts/test_streaming.py
   ```

## Project Structure

```
bible-mp3-manager/
├── src/bible_mp3/           # Main Python package
│   ├── uploader.py          # R2 upload & database linking
│   ├── database.py          # PostgreSQL operations
│   └── utils.py             # Utility functions
├── scripts/                 # Command-line scripts
├── worker/                  # Cloudflare Worker code
├── config/                  # Configuration files
└── setup.py                 # Environment validation
```

## What It Does

1. **Scans** your Grace to You directories (01_Genesis, 02_Exodus, etc.)
2. **Uploads** MP3 files to Cloudflare R2 storage
3. **Links** audio files to all verses in the corresponding Bible book
4. **Stores** metadata in PostgreSQL with streaming URLs
5. **Enables** streaming via Cloudflare Worker with range request support

## File Organization in R2

```
bible-audio-storage/
├── sermons/john_macarthur/
│   ├── genesis/
│   │   ├── sermon_1.mp3
│   │   └── sermon_2.mp3
│   └── romans/
│       └── romans_study.mp3
└── bible_reading/
    └── genesis/
        └── genesis_audio.mp3
```

## Database Integration

The package links audio to your existing Bible database:
- `resources` table stores MP3 metadata and streaming URLs
- `verse_resource_link` connects verses to audio files
- Compatible with your existing verses/books/chapters schema

## Cost Estimate

For your ~73GB collection:
- **R2 Storage:** ~$1.10/month
- **R2 Operations:** ~$0.50 for initial upload
- **Streaming:** $0 (zero egress fees)
- **Worker compute:** Covered by your $5/month plan

**Total ongoing cost: ~$1.10/month**

## Troubleshooting

- Run `python setup.py` to validate configuration
- Check logs in `bible_mp3_upload.log`
- Use `--test-mode` for small batches
- Test streaming with `scripts/test_streaming.py`
