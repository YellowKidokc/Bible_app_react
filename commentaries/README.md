# Bible Commentaries

This folder contains Bible commentaries in TOML format that will be compiled into a SQLite database and bundled with the app.

## 📁 Folder Structure

```
commentaries/
├── Genesis/
│   ├── metadata.toml
│   ├── 1_1.toml          (Genesis 1:1)
│   ├── 1_2-3.toml        (Genesis 1:2-3)
│   └── ...
├── Exodus/
│   ├── metadata.toml
│   └── ...
└── ...
```

## 📝 TOML File Format

### Verse Commentary File

Example: `1_1.toml` for a single verse or `1_1-3.toml` for verse range

```toml
author = "Matthew Henry"
source = "Matthew Henry's Concise Commentary"
text = """
In the beginning God created the heaven and the earth. This verse teaches us...
"""
```

### Metadata File

Example: `metadata.toml` in each book folder

```toml
author = "Matthew Henry"
source = "Matthew Henry's Concise Commentary"
description = "A concise commentary on the entire Bible"
year = 1706
```

## 🔨 Building the Database

When you run `npm run build`, the build script will:

1. Scan all TOML files in this folder
2. Parse the commentary data
3. Create `public/commentaries.sqlite`
4. Enable full-text search
5. Bundle with your app

You can also manually build just the commentaries:

```bash
npm run build-commentaries
```

## ✅ Supported Fields

### Required Fields
- `text` or `commentary` or `content` - The commentary text

### Optional Fields
- `author` - Commentary author
- `source` - Source/series name
- `chapter` - Chapter number (can be auto-detected from filename)
- `verse` - Verse number (can be auto-detected from filename)
- `verse_end` - End verse for ranges (auto-detected from filename like `1_1-3.toml`)

## 📖 Adding Your Commentaries

1. Create a folder for each Bible book (e.g., `Genesis`, `1 Timothy`, etc.)
2. Add `metadata.toml` with book-level information
3. Add commentary files named: `{chapter}_{verse}.toml` or `{chapter}_{verse}-{verse_end}.toml`
4. Run `npm run build-commentaries`
5. The commentaries will be available in your app!

## 🔍 Querying in the App

The commentaries will be available through the database adapter:

```javascript
// Get commentaries for a specific verse
const commentaries = await getCommentaries('Genesis', 1, 1);

// Search commentaries
const results = await searchCommentaries('creation');
```

## 📦 Deployment

The generated `commentaries.sqlite` file will be bundled with your app and deployed to Cloudflare Pages. No additional configuration needed!
