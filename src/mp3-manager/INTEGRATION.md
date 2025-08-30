# MP3 Manager Integration Guide

## Move Files from Standalone Package

Copy from: `C:\Users\Yellowkid\Desktop\bible-mp3-manager\`
Copy to: `C:\Users\Yellowkid\Desktop\Bible REACT\bible-hollow\src\mp3-manager\`

### Files to copy:
- `src/` (Python bible_mp3 package)
- `scripts/` (CLI upload tools)  
- `worker/` (Cloudflare Worker)
- `config/` (wrangler.toml)
- `requirements.txt`
- `.env.template`

## After copying files:

1. **Configure environment:**
   ```bash
   cd "C:\Users\Yellowkid\Desktop\Bible REACT\bible-hollow\src\mp3-manager"
   cp .env.template .env
   # Edit .env with your Cloudflare credentials
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Test upload (5 files only):**
   ```bash
   python scripts/upload_audio_collection.py --test-mode
   ```

4. **Deploy Cloudflare Worker:**
   ```bash
   cd worker
   wrangler deploy
   ```

## Integration Benefits

- Everything in one repository
- React app can import MP3 metadata from your PostgreSQL database
- Python scripts handle the bulk upload independently  
- Cloudflare Worker provides streaming URLs for your React components
- All gets pushed to GitHub together

The Python scripts run independently but store audio metadata in the same PostgreSQL database your React app uses, so your Bible study interface can display linked audio resources.
