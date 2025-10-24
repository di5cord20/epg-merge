from fastapi import FastAPI, WebSocket, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import asyncio
import sqlite3
import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
import gzip
import copy
import shutil
from typing import List
import logging
import httpx
from xml.etree import ElementTree as ET
from email.utils import parsedate_to_datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="EPG Merge")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# Serve static files (React build)
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Configuration - Module level paths
CONFIG_DIR = Path("/config")
CONFIG_DIR.mkdir(exist_ok=True)
DB_PATH = CONFIG_DIR / "app.db"
ARCHIVE_DIR = CONFIG_DIR / "archives"
ARCHIVE_DIR.mkdir(exist_ok=True)
CACHE_DIR = CONFIG_DIR / "epg_cache"
CACHE_DIR.mkdir(exist_ok=True)

def init_db():
    """Initialize database tables"""
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('CREATE TABLE IF NOT EXISTS channels_selected (channel_name TEXT PRIMARY KEY)')
    c.execute('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)')
    c.execute('CREATE TABLE IF NOT EXISTS archives (filename TEXT PRIMARY KEY, created_at TEXT, channels INT, programs INT, days_included INT)')
    conn.commit()
    conn.close()
    logger.info("✅ Database initialized")

def get_db_value(key: str, default: str = "") -> str:
    """Get a value from the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT value FROM settings WHERE key = ?", (key,))
        row = c.fetchone()
        conn.close()
        return row[0] if row else default
    except Exception as e:
        logger.error(f"Error getting DB value: {e}")
        return default

def set_db_value(key: str, value: str):
    """Set a value in the database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
        conn.commit()
        conn.close()
    except Exception as e:
        logger.error(f"Error setting DB value: {e}")

@app.on_event("startup")
async def startup():
    """Initialize app on startup"""
    init_db()
    logger.info("🚀 Backend started on port 9193")

@app.get("/")
async def root():
    """Serve index.html"""
    static_index = Path(__file__).parent / "static" / "index.html"
    if static_index.exists():
        with open(static_index) as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>EPG Merge App</h1><p>Frontend loading...</p>")

@app.get("/api/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok", "version": "1.0.0", "timestamp": datetime.now().isoformat()}

@app.get("/api/sources/list")
async def list_sources(timeframe: str = Query("3"), feed_type: str = Query("iptv")):
    """Fetch available XML files from share.jesmann.com"""
    try:
        folder_map = {
            "3": {"iptv": "3dayiptv", "gracenote": "3daygracenote"},
            "7": {"iptv": "7dayiptv", "gracenote": "7daygracenote"},
            "14": {"iptv": "14dayiptv", "gracenote": "14daygracenote"}
        }
        folder = folder_map.get(timeframe, {}).get(feed_type, "3dayiptv")
        url = f"https://share.jesmann.com/{folder}/"
        
        logger.info(f"Fetching from: {url}")
        
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, verify=False) as client:
            response = await client.get(url)
            logger.info(f"Response status: {response.status_code}")
            response.raise_for_status()
            
            html = response.text
            
            pattern = r'href=["\']([^"\']*\.xml\.gz)["\']'
            matches = re.findall(pattern, html)
            
            if not matches:
                pattern = r'>([^<]*\.xml\.gz)<'
                matches = re.findall(pattern, html)
            
            files = []
            for match in matches:
                filename = match.split('/')[-1] if '/' in match else match
                if filename.endswith('.xml.gz'):
                    files.append(filename)
            
            unique_files = sorted(list(set(files)))
            logger.info(f"Found {len(unique_files)} unique files")
            
            return {
                "sources": unique_files,
                "total": len(unique_files),
                "folder": folder,
                "url": url
            }
    
    except Exception as e:
        logger.error(f"Error fetching sources: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sources/select")
async def select_sources(data: dict):
    """Save selected sources to database"""
    try:
        sources = data.get("sources", [])
        set_db_value("selected_sources", json.dumps(sources))
        return {"status": "saved", "count": len(sources)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/channels/from-sources")
async def get_channels_from_sources(sources: str = Query("")):
    """Get available channel IDs from source filenames (country names)"""
    try:
        sources_list = sources.split(',') if sources else []
        if not sources_list:
            return {"channels": []}
        
        unique_channels = set()
        
        for source in sources_list:
            source = source.strip()
            if not source or not source.endswith('.xml.gz'):
                continue
            
            # Extract country name from filename
            country = source.replace('.xml.gz', '')
            
            try:
                url = f"https://share.jesmann.com/IPTV_Channel_List/{country}_channel_list.txt"
                async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        channels = [ch.strip() for ch in response.text.split('\n') if ch.strip()]
                        unique_channels.update(channels)
                        logger.info(f"Loaded {len(channels)} channels for {country}")
            except Exception as e:
                logger.error(f"Error loading channels for {country}: {e}")
        
        sorted_channels = sorted(list(unique_channels))
        logger.info(f"Total unique channels: {len(sorted_channels)}")
        
        return {"channels": sorted_channels}
    
    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
        return {"channels": []}

@app.get("/api/channels/list")
async def get_channels_list(country: str = Query("")):
    """Fetch channel list for a specific country from channel_list.txt file"""
    try:
        if not country:
            return {"channels": []}
        
        url = f"https://share.jesmann.com/IPTV_Channel_List/{country}_channel_list.txt"
        
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            response = await client.get(url)
            if response.status_code == 200:
                channels = [ch.strip() for ch in response.text.split('\n') if ch.strip()]
                logger.info(f"Loaded {len(channels)} channels for {country}")
                return {"channels": channels}
            else:
                logger.warning(f"Channel list not found for {country}: HTTP {response.status_code}")
                return {"channels": []}
    except Exception as e:
        logger.error(f"Error fetching channels for {country}: {e}")
        return {"channels": []}

@app.post("/api/channels/select")
async def select_channels(data: dict):
    """Save selected channels to database"""
    try:
        channels = data.get("channels", [])
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("DELETE FROM channels_selected")
        for ch in channels:
            c.execute("INSERT INTO channels_selected (channel_name) VALUES (?)", (ch,))
        conn.commit()
        conn.close()
        return {"status": "saved", "count": len(channels)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/channels/selected")
async def get_selected_channels():
    """Get previously selected channels from database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT channel_name FROM channels_selected ORDER BY channel_name")
        channels = [row[0] for row in c.fetchall()]
        conn.close()
        return {"channels": channels}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/channels/export")
async def export_channels():
    """Export selected channels as JSON"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT channel_name FROM channels_selected ORDER BY channel_name")
        channels = [row[0] for row in c.fetchall()]
        conn.close()
        
        export_data = {
            "exported_at": datetime.now().isoformat(),
            "channel_count": len(channels),
            "channels": channels
        }
        
        return {
            "status": "success",
            "data": export_data,
            "filename": f"channels_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/channels/import")
async def import_channels(data: dict):
    """Import channels from JSON backup"""
    try:
        channels = data.get("channels", [])
        
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("DELETE FROM channels_selected")
        for ch in channels:
            c.execute("INSERT INTO channels_selected (channel_name) VALUES (?)", (ch,))
        conn.commit()
        conn.close()
        
        logger.info(f"Imported {len(channels)} channels")
        return {"status": "success", "count": len(channels)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/settings/get")
async def get_settings():
    """Get all settings from database"""
    try:
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT key, value FROM settings")
        settings = {row[0]: row[1] for row in c.fetchall()}
        conn.close()
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/settings/set")
async def set_settings(data: dict):
    """Save settings to database"""
    try:
        for key, value in data.items():
            set_db_value(key, str(value))
        return {"status": "saved"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/merge/current")
async def get_current_merge():
    """Get the current live merged.xml.gz file info"""
    try:
        current_merged = ARCHIVE_DIR / "merged.xml.gz"
        if current_merged.exists():
            stat = current_merged.stat()
            return {
                "filename": "merged.xml.gz",
                "exists": True,
                "size": f"{stat.st_size / (1024**2):.2f}MB",
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
        return {"filename": "merged.xml.gz", "exists": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/merge/save")
async def save_merge(data: dict):
    """Save current merged file and archive previous version"""
    try:
        filename = data.get('filename', 'merged.xml.gz')
        
        # Check if merged file exists
        merged_path = ARCHIVE_DIR / filename
        if not merged_path.exists():
            raise ValueError(f"File {filename} not found")
        
        # If a current merged.xml.gz exists, archive it first
        current_merged = ARCHIVE_DIR / "merged.xml.gz"
        if current_merged.exists() and current_merged != merged_path:
            creation_time = datetime.fromtimestamp(current_merged.stat().st_mtime)
            timestamp = creation_time.strftime("%Y%m%d_%H%M%S")
            archive_path = ARCHIVE_DIR / f"merged.xml.gz.{timestamp}"
            
            shutil.move(str(current_merged), str(archive_path))
            logger.info(f"Archived previous merge: {archive_path}")
        
        # If the new file isn't already named merged.xml.gz, copy it
        if filename != "merged.xml.gz":
            final_path = ARCHIVE_DIR / "merged.xml.gz"
            shutil.copy2(str(merged_path), str(final_path))
            logger.info(f"Saved {filename} as merged.xml.gz")
        
        return {
            "status": "success",
            "message": "Merge saved successfully",
            "current_file": "merged.xml.gz"
        }
    
    except Exception as e:
        logger.error(f"Error saving merge: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/archives/list")
async def list_archives():
    """List all archived and current merged XML files"""
    try:
        archives = []
        
        # Add current merged.xml.gz if it exists
        current_merged = ARCHIVE_DIR / "merged.xml.gz"
        if current_merged.exists():
            stat = current_merged.stat()
            archives.append({
                "filename": "merged.xml.gz",
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "channels": "N/A",
                "programs": "N/A",
                "size": f"{stat.st_size / (1024**2):.2f}MB",
                "days_left": "∞",
                "is_current": True
            })
        
        # Add all archived versions (with timestamps)
        for file in sorted(ARCHIVE_DIR.glob("*.xml.gz.*"), key=lambda x: x.stat().st_mtime, reverse=True):
            stat = file.stat()
            archives.append({
                "filename": file.name,
                "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "channels": "N/A",
                "programs": "N/A",
                "size": f"{stat.st_size / (1024**2):.2f}MB",
                "days_left": "N/A",
                "is_current": False
            })
        
        return {"archives": archives}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/archives/download/{filename}")
async def download_archive(filename: str):
    """Download an archived or current XML file"""
    try:
        file_path = ARCHIVE_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Not found")
        return FileResponse(file_path, media_type="application/gzip", filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/merge/execute")
async def execute_merge(data: dict):
    """Execute merge of selected XML sources with channel filtering"""
    try:
        sources = data.get('sources', [])
        channels = data.get('channels', [])
        output_filename = data.get('output_filename', 'merged.xml.gz')
        timeframe = data.get('timeframe', '3')
        feed_type = data.get('feed_type', 'iptv')
        
        if not sources or not channels:
            raise ValueError("Sources and channels required")
        
        folder_map = {
            "3": {"iptv": "3dayiptv", "gracenote": "3daygracenote"},
            "7": {"iptv": "7dayiptv", "gracenote": "7daygracenote"},
            "14": {"iptv": "14dayiptv", "gracenote": "14daygracenote"}
        }
        folder = folder_map.get(timeframe, {}).get(feed_type, "3dayiptv")
        base_url = f"https://share.jesmann.com/{folder}"
        
        logger.info(f"Starting merge: {len(sources)} sources, {len(channels)} channels")
        logger.info(f"Download folder: {base_url}")
        logger.info(f"Selected channel IDs: {channels[:5]}{'...' if len(channels) > 5 else ''}")
        
        # Download and cache XML files - check if cache is valid first
        downloaded_files = []
        for source in sources:
            try:
                url = f"{base_url}/{source}"
                cache_file = CACHE_DIR / source
                
                # Check if we need to download
                needs_download = True
                if cache_file.exists():
                    # Quick check: assume cache is valid if less than 24 hours old
                    cache_age_hours = (datetime.now() - datetime.fromtimestamp(cache_file.stat().st_mtime)).total_seconds() / 3600
                    if cache_age_hours < 24:
                        logger.info(f"Using recent cache for {source} (age: {cache_age_hours:.1f}h)")
                        downloaded_files.append(str(cache_file))
                        needs_download = False
                
                if needs_download:
                    logger.info(f"Downloading: {url}")
                    async with httpx.AsyncClient(timeout=120.0, verify=False) as client:
                        response = await client.get(url)
                        if response.status_code == 200:
                            cache_file.write_bytes(response.content)
                            logger.info(f"Cached: {source}")
                            downloaded_files.append(str(cache_file))
                        else:
                            logger.error(f"HTTP {response.status_code} for {url}")
            except Exception as e:
                logger.error(f"Error downloading {source}: {e}")
        
        if not downloaded_files:
            raise Exception("No files downloaded successfully")
        
        logger.info(f"Processing {len(downloaded_files)} files")
        
        # Merge XML files using streaming to save memory
        merged_root = ET.Element("tv")
        channels_seen = set()
        programmes_seen = set()
        total_channels = 0
        total_programs = 0
        keep_channels_set = set(channels)
        
        for filepath in downloaded_files:
            try:
                logger.info(f"Parsing {filepath}")
                
                # Use iterparse to stream XML and save memory
                if filepath.endswith('.gz'):
                    f = gzip.open(filepath, 'rt', encoding='utf-8', errors='ignore')
                else:
                    f = open(filepath, 'rt', encoding='utf-8', errors='ignore')
                
                with f:
                    for event, elem in ET.iterparse(f, events=('end',)):
                        if elem.tag == 'channel':
                            ch_id = elem.get('id')
                            
                            # Match by channel ID
                            if ch_id in keep_channels_set and ch_id not in channels_seen:
                                merged_root.append(copy.deepcopy(elem))
                                channels_seen.add(ch_id)
                                total_channels += 1
                                logger.info(f"  ✓ Added channel ID: {ch_id}")
                            
                            elem.clear()
                        
                        elif elem.tag == 'programme':
                            ch_id = elem.get('channel')
                            if ch_id in channels_seen:
                                start = elem.get('start', '')
                                title_elem = elem.find('title')
                                title = title_elem.text if title_elem is not None else ''
                                
                                key = (ch_id, start, title)
                                if key not in programmes_seen:
                                    merged_root.append(copy.deepcopy(elem))
                                    programmes_seen.add(key)
                                    total_programs += 1
                            
                            elem.clear()
                
                logger.info(f"  Matched {total_channels} channels, {total_programs} programs total so far")
            
            except Exception as e:
                logger.error(f"Error parsing {filepath}: {e}", exc_info=True)
        
        logger.info(f"Merge complete: {total_channels} channels, {total_programs} programs")
        
        # Write merged XML
        output_path = ARCHIVE_DIR / output_filename
        xml_bytes = ET.tostring(merged_root, encoding='utf-8', xml_declaration=True)
        with gzip.open(output_path, 'wb') as f:
            f.write(xml_bytes)
        
        file_size = output_path.stat().st_size
        file_size_mb = f"{file_size / (1024**2):.2f}MB"
        
        logger.info(f"Output file: {output_path}, Size: {file_size_mb}")
        
        return {
            "status": "success",
            "filename": output_filename,
            "channels_included": total_channels,
            "programs_included": total_programs,
            "file_size": file_size_mb
        }
    
    except Exception as e:
        logger.error(f"Merge error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9193)