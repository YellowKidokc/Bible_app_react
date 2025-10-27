# 📖 Commentary Import System Guide

This Bible app now supports importing Bible commentaries from TOML files, which are compiled into a SQLite database and bundled with your app!

## 🚀 Quick Start

### 1. Add Your Commentary Files

Place your commentary TOML files in the `commentaries/` folder, organized by book:

```
Bible_app_react/
├── commentaries/
│   ├── Genesis/
│   │   ├── metadata.toml
│   │   ├── 1_1.toml          (Genesis 1:1)
│   │   ├── 1_2-3.toml        (Genesis 1:2-3)
│   │   └── ...
│   ├── Exodus/
│   ├── 1 Timothy/
│   └── ...
```

### 2. Build the Database

Run the build command (commentaries are automatically built):

```bash
npm run build
```

Or build just the commentaries:

```bash
npm run build-commentaries
```

### 3. Deploy

The `commentaries.sqlite` file will be automatically created in `public/` and bundled with your app when you deploy to Cloudflare Pages!

---

## 📝 TOML File Format

### Single Verse Commentary

**Filename:** `{chapter}_{verse}.toml`
**Example:** `1_1.toml` for Genesis 1:1

```toml
author = "Matthew Henry"
source = "Matthew Henry's Concise Commentary"
text = """
In the beginning God created the heaven and the earth.
This verse teaches us about the sovereignty of God...
"""
```

### Verse Range Commentary

**Filename:** `{chapter}_{start_verse}-{end_verse}.toml`
**Example:** `1_1-3.toml` for Genesis 1:1-3

```toml
author = "John Gill"
source = "Gill's Exposition of the Entire Bible"
text = """
These opening verses describe the creation account...
"""
```

### Book Metadata

**Filename:** `metadata.toml` (in each book folder)

```toml
author = "Matthew Henry"
source = "Matthew Henry's Concise Commentary"
description = "A concise commentary on the entire Bible"
year = 1706
```

---

## 🔧 Available Fields

### Required
- `text` - The commentary text (can also use `commentary` or `content`)

### Optional
- `author` - Commentary author name
- `source` - Source/series name
- Any other metadata you want to include

---

## 📚 How It Works

### Build Process

1. **Scan** - Script scans `commentaries/` folder for TOML files
2. **Parse** - Each TOML file is parsed
3. **Extract** - Book, chapter, and verse info extracted from folder/filename
4. **Database** - All commentaries saved to `public/commentaries.sqlite`
5. **Index** - Full-text search index created for fast searching
6. **Bundle** - Database file included in your app deployment

### In the App

1. **Load** - `commentaries.sqlite` loaded with sql.js in browser
2. **Display** - Commentaries shown in "Imported Commentaries" section
3. **Search** - Full-text search available
4. **Filter** - Filter by author
5. **AI Access** - AI assistant can query commentaries

---

## 🔍 Example: Adding Your Commentaries

Let's say you have the `Commentaries-Database-master` folder with TOML files:

### Step 1: Copy to Project

```bash
# Windows
xcopy "C:\Path\To\Commentaries-Database-master\*" "Bible_app_react\commentaries\" /E /I

# Mac/Linux
cp -r /path/to/Commentaries-Database-master/* Bible_app_react/commentaries/
```

### Step 2: Verify Structure

```
Bible_app_react/
├── commentaries/
│   ├── 1 Timothy/
│   │   ├── Deuteronomy 25_4.toml
│   │   ├── metadata.toml
│   │   └── ...
│   └── ...
```

### Step 3: Build

```bash
npm run build-commentaries
```

You should see:

```
📖 Scanning commentary files...

📚 Processing: 1 Timothy
   ✅ 2 files processed

📊 Summary:
   Books: 1
   Commentaries: 1
```

### Step 4: Deploy

```bash
npm run build    # Full build
npm run preview  # Test locally
# Or deploy to Cloudflare Pages
```

---

## 🎯 Features

### In the Reader

- **Automatic Display** - Commentaries appear in "Imported Commentaries" section
- **Verse Context** - Only shows commentaries for current verse/chapter
- **Multiple Authors** - All authors shown together
- **Clean Format** - Author, source, and reference displayed clearly

### Database Queries

The following functions are available in `src/db/commentaries.js`:

```javascript
import {
  getCommentaries,        // Get commentaries for specific verse
  getChapterCommentaries, // Get all commentaries for chapter
  searchCommentaries,     // Full-text search
  getBookMetadata,        // Get book-level metadata
  getCommentaryAuthors,   // Get list of all authors
  getCommentaryStats      // Get statistics
} from './db/commentaries.js';

// Example usage
const comms = await getCommentaries('Genesis', 1, 1);
const results = await searchCommentaries('creation');
const stats = await getCommentaryStats();
```

---

## 💡 Tips

### File Naming

- Use underscores for verse numbers: `1_1.toml` not `1:1.toml`
- Use hyphens for ranges: `1_1-3.toml` for verses 1-3
- Book folders can have spaces: `1 Timothy/` is fine

### Text Formatting

Use triple quotes for multi-line text:

```toml
text = """
This is a long commentary
with multiple paragraphs.

It can span many lines.
"""
```

### Performance

- SQLite + sql.js runs in browser memory
- Full-text search is very fast
- Database size: ~1KB per commentary (approximate)
- Recommendation: Don't exceed 10MB total

---

## 🚀 Deployment to Cloudflare Pages

The commentary database is automatically included in your deployment:

1. **Build** - `npm run build` creates `dist/` folder
2. **Upload** - `dist/` contains your app + `commentaries.sqlite`
3. **Deploy** - Push to Cloudflare Pages
4. **Access** - Users download database on first load

### Size Considerations

- Cloudflare Pages free tier: 25MB limit per file
- Typical commentary database: 1-10MB
- If database is too large, consider:
  - Splitting by testament (OT/NT)
  - Hosting on R2 and loading dynamically
  - Using D1 instead (requires different setup)

---

## 🐛 Troubleshooting

### Commentaries Not Showing Up

1. Check `public/commentaries.sqlite` exists
2. Verify TOML files are valid (use online TOML validator)
3. Check browser console for errors
4. Ensure book names match exactly (e.g., "Genesis" not "Gen")

### Build Errors

```bash
# If build script fails
npm run build-commentaries

# Check for syntax errors in TOML files
# Each file should be valid TOML format
```

### Empty Database

If you see "Books: 0, Commentaries: 0", it means:
- `commentaries/` folder is empty or doesn't exist
- This is normal - place TOML files there and rebuild

---

## 📊 Database Schema

```sql
CREATE TABLE commentaries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book TEXT NOT NULL,
  chapter INTEGER,
  verse INTEGER,
  verse_end INTEGER,
  author TEXT,
  source TEXT,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commentary_metadata (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book TEXT NOT NULL,
  source TEXT,
  author TEXT,
  description TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Full-text search (FTS5)
CREATE VIRTUAL TABLE commentaries_fts USING fts5(
  book, chapter, verse, author, text
);
```

---

## 🎉 You're Ready!

Your Bible app now supports rich commentary integration. Add your TOML files, build, and deploy!

For questions or issues, check the browser console or review this guide.

**Happy studying!** 📖✨
