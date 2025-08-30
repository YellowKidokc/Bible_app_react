#!/usr/bin/env python3
"""
Setup script for Bible MP3 Manager
Initializes the environment and validates configuration
"""

import os
import sys
from pathlib import Path
import subprocess
import json

def print_header(text):
    print(f"\n{'='*60}")
    print(f"{text:^60}")
    print(f"{'='*60}")

def check_dependencies():
    """Check if required Python packages are installed"""
    print("Checking dependencies...")
    
    required_packages = [
        'boto3', 'psycopg2', 'python-dotenv', 
        'mutagen', 'requests', 'tqdm', 'pydantic', 'click'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"  ✓ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"  ✗ {package} - MISSING")
    
    if missing_packages:
        print(f"\nInstall missing packages with:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def validate_environment():
    """Validate environment variables"""
    print("Validating environment configuration...")
    
    env_file = Path('.env')
    if not env_file.exists():
        print("  ✗ .env file not found")
        print("  Copy .env.template to .env and fill in your values")
        return False
    
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    required_vars = [
        'CLOUDFLARE_ACCOUNT_ID',
        'CLOUDFLARE_R2_ACCESS_KEY',
        'CLOUDFLARE_R2_SECRET_KEY',
        'POSTGRES_URL'
    ]
    
    missing_vars = []
    for var in required_vars:
        value = os.getenv(var)
        if value:
            # Mask sensitive values for display
            if 'KEY' in var or 'URL' in var:
                display_value = value[:8] + '...' if len(value) > 8 else '***'
            else:
                display_value = value
            print(f"  ✓ {var}: {display_value}")
        else:
            missing_vars.append(var)
            print(f"  ✗ {var}: NOT SET")
    
    if missing_vars:
        print(f"\nSet these environment variables in your .env file:")
        for var in missing_vars:
            print(f"  {var}=your_value_here")
        return False
    
    return True

def test_database_connection():
    """Test PostgreSQL database connection"""
    print("Testing database connection...")
    
    try:
        import psycopg2
        from dotenv import load_dotenv
        load_dotenv()
        
        postgres_url = os.getenv('POSTGRES_URL')
        conn = psycopg2.connect(postgres_url)
        
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM books")
            book_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM verses")  
            verse_count = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM resources WHERE type = 'audio'")
            audio_count = cursor.fetchone()[0]
        
        conn.close()
        
        print(f"  ✓ Database connection successful")
        print(f"  ✓ Books: {book_count}")
        print(f"  ✓ Verses: {verse_count}")
        print(f"  ✓ Audio resources: {audio_count}")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Database connection failed: {e}")
        return False

def test_cloudflare_connection():
    """Test Cloudflare R2 connection"""
    print("Testing Cloudflare R2 connection...")
    
    try:
        import boto3
        from botocore.config import Config
        from dotenv import load_dotenv
        load_dotenv()
        
        # Initialize R2 client
        r2_client = boto3.client(
            's3',
            endpoint_url=f"https://{os.getenv('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com",
            aws_access_key_id=os.getenv('CLOUDFLARE_R2_ACCESS_KEY'),
            aws_secret_access_key=os.getenv('CLOUDFLARE_R2_SECRET_KEY'),
            config=Config(signature_version='s3v4')
        )
        
        # List buckets to test connection
        response = r2_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response.get('Buckets', [])]
        
        print(f"  ✓ R2 connection successful")
        print(f"  ✓ Available buckets: {buckets}")
        
        # Check if bible-audio-storage bucket exists
        if 'bible-audio-storage' in buckets:
            print(f"  ✓ bible-audio-storage bucket found")
        else:
            print(f"  ⚠ bible-audio-storage bucket not found (will be created automatically)")
        
        return True
        
    except Exception as e:
        print(f"  ✗ R2 connection failed: {e}")
        return False

def check_audio_directories():
    """Check if audio directories exist"""
    print("Checking audio directories...")
    
    directories = {
        'Grace to You Sermons': r'D:\GraceToYouSermons\Downloads',
        'Word of Promise': r'C:\Users\Yellowkid\Proton Drive\eowokc28\Shared with me\Word of Promise'
    }
    
    found_dirs = []
    
    for name, path in directories.items():
        path_obj = Path(path)
        if path_obj.exists():
            mp3_count = len(list(path_obj.rglob('*.mp3')))
            print(f"  ✓ {name}: {path} ({mp3_count} MP3 files)")
            found_dirs.append(name)
        else:
            print(f"  ✗ {name}: {path} (not found)")
    
    return len(found_dirs) > 0

def create_gitignore():
    """Create .gitignore file"""
    gitignore_content = """# Environment variables
.env

# Python cache
__pycache__/
*.py[cod]
*$py.class
*.so

# Virtual environments
venv/
env/
ENV/

# Logs
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Node modules (for Worker)
node_modules/

# Wrangler
.wrangler/
"""
    
    with open('.gitignore', 'w') as f:
        f.write(gitignore_content)
    
    print("  ✓ Created .gitignore")

def main():
    print_header("Bible MP3 Manager Setup")
    
    # Change to the package directory
    os.chdir(Path(__file__).parent)
    
    all_good = True
    
    # Check dependencies
    if not check_dependencies():
        all_good = False
    
    # Validate environment
    if not validate_environment():
        all_good = False
    
    # Test database connection
    if not test_database_connection():
        all_good = False
    
    # Test Cloudflare connection
    if not test_cloudflare_connection():
        all_good = False
    
    # Check audio directories
    if not check_audio_directories():
        print("  ⚠ No audio directories found - you can still test with other MP3 files")
    
    # Create additional files
    create_gitignore()
    
    print_header("Setup Summary")
    
    if all_good:
        print("✓ Setup completed successfully!")
        print("\nNext steps:")
        print("1. Run a test upload:")
        print("   python scripts/upload_audio_collection.py --test-mode")
        print("\n2. Deploy the Cloudflare Worker:")
        print("   cd worker && wrangler deploy")
        print("\n3. Process your full collection:")
        print("   python scripts/upload_audio_collection.py")
    else:
        print("✗ Setup incomplete - please fix the issues above")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
