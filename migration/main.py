"""
EPG Merge Application - FastAPI Backend
Modular, maintainable architecture with proper separation of concerns
"""

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
import logging
from pathlib import Path
from contextlib import contextmanager
from typing import List, Optional

# Application modules
from config import Config
from database import Database
from services.source_service import SourceService
from services.channel_service import ChannelService
from services.merge_service import MergeService
from services.archive_service import ArchiveService
from services.settings_service import SettingsService
from utils.logger import setup_logging
from utils.errors import AppError, handle_exceptions

# Initialize logging
logger = setup_logging(__name__)

# Initialize configuration
config = Config()

# Initialize FastAPI app
app = FastAPI(
    title="EPG Merge API",
    description="TV feed merger with channel filtering",
    version="0.1.0"
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
static_path = Path(__file__).parent / "static"
if static_path.exists():
    app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

# Initialize services
db = Database(config.db_path)
source_service = SourceService(config)
channel_service = ChannelService(config)
merge_service = MergeService(config, db)
archive_service = ArchiveService(config, db)
settings_service = SettingsService(db)


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("🚀 Starting EPG Merge Application")
    db.initialize()
    logger.info("✅ Database initialized")
    logger.info(f"📁 Config: {config.config_dir}")
    logger.info(f"📦 Archives: {config.archive_dir}")
    logger.info(f"💾 Cache: {config.cache_dir}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down EPG Merge Application")
    db.close()


@app.get("/")
async def root():
    """Serve index.html"""
    static_index = Path(__file__).parent / "static" / "index.html"
    if static_index.exists():
        with open(static_index) as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>EPG Merge App</h1><p>Frontend loading...</p>")


# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@app.get("/api/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    try:
        db_status = db.health_check()
        return {
            "status": "healthy" if db_status else "unhealthy",
            "version": "0.1.0",
            "database": "ok" if db_status else "error",
            "timestamp": __import__("datetime").datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")


@app.get("/api/status", tags=["Health"])
async def get_status():
    """Get detailed application status"""
    try:
        return {
            "app": {
                "version": "0.1.0",
                "environment": config.environment
            },
            "storage": {
                "cache_dir": str(config.cache_dir),
                "archive_dir": str(config.archive_dir),
                "config_dir": str(config.config_dir)
            },
            "database": {
                "connected": db.health_check(),
                "tables": db.get_table_count()
            }
        }
    except Exception as e:
        logger.error(f"Status check failed: {e}")
        raise HTTPException(status_code=500, detail="Status check failed")


# ============================================================================
# SOURCES ENDPOINTS
# ============================================================================

@app.get("/api/sources/list", tags=["Sources"])
async def list_sources(
    timeframe: str = Query("3", regex="^(3|7|14)$"),
    feed_type: str = Query("iptv", regex="^(iptv|gracenote)$")
):
    """Fetch available XML files from share.jesmann.com"""
    try:
        logger.info(f"Fetching sources: timeframe={timeframe}, feed_type={feed_type}")
        result = await source_service.fetch_sources(timeframe, feed_type)
        logger.info(f"Found {len(result['sources'])} sources")
        return result
    except AppError as e:
        logger.error(f"App error: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Unexpected error fetching sources: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch sources")


@app.post("/api/sources/select", tags=["Sources"])
async def select_sources(data: dict):
    """Save selected sources"""
    try:
        sources = data.get("sources", [])
        if not isinstance(sources, list):
            raise AppError("sources must be a list", 400)
        
        settings_service.set("selected_sources", sources)
        logger.info(f"Saved {len(sources)} selected sources")
        return {"status": "saved", "count": len(sources)}
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error saving sources: {e}")
        raise HTTPException(status_code=500, detail="Failed to save sources")


# ============================================================================
# CHANNELS ENDPOINTS
# ============================================================================

@app.get("/api/channels/from-sources", tags=["Channels"])
async def get_channels_from_sources(sources: str = Query("")):
    """Get channel IDs from selected sources"""
    try:
        sources_list = [s.strip() for s in sources.split(',') if s.strip()]
        logger.info(f"Loading channels from {len(sources_list)} sources")
        channels = await channel_service.fetch_channels_from_sources(sources_list)
        logger.info(f"Loaded {len(channels)} unique channels")
        return {"channels": channels}
    except AppError as e:
        logger.error(f"App error: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error loading channels: {e}", exc_info=True)
        return {"channels": []}


@app.get("/api/channels/selected", tags=["Channels"])
async def get_selected_channels():
    """Get previously selected channels"""
    try:
        channels = channel_service.get_selected_channels()
        return {"channels": channels}
    except Exception as e:
        logger.error(f"Error getting selected channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to get selected channels")


@app.post("/api/channels/select", tags=["Channels"])
async def select_channels(data: dict):
    """Save selected channels"""
    try:
        channels = data.get("channels", [])
        if not isinstance(channels, list):
            raise AppError("channels must be a list", 400)
        
        channel_service.save_selected_channels(channels)
        logger.info(f"Saved {len(channels)} selected channels")
        return {"status": "saved", "count": len(channels)}
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error saving channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to save channels")


@app.post("/api/channels/export", tags=["Channels"])
async def export_channels():
    """Export selected channels as JSON"""
    try:
        export_data = channel_service.export_channels()
        logger.info(f"Exported {export_data['count']} channels")
        return export_data
    except Exception as e:
        logger.error(f"Error exporting channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to export channels")


@app.post("/api/channels/import", tags=["Channels"])
async def import_channels(data: dict):
    """Import channels from JSON backup"""
    try:
        channels = data.get("channels", [])
        if not isinstance(channels, list):
            raise AppError("channels must be a list", 400)
        
        channel_service.save_selected_channels(channels)
        logger.info(f"Imported {len(channels)} channels")
        return {"status": "success", "count": len(channels)}
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error importing channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to import channels")


# ============================================================================
# MERGE ENDPOINTS
# ============================================================================

@app.post("/api/merge/execute", tags=["Merge"])
async def execute_merge(data: dict):
    """Execute merge of selected sources with channel filtering"""
    try:
        result = await merge_service.execute_merge(data)
        logger.info(f"Merge completed: {result['channels_included']} channels, {result['programs_included']} programs")
        return result
    except AppError as e:
        logger.error(f"App error: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Merge error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Merge failed")


@app.get("/api/merge/current", tags=["Merge"])
async def get_current_merge():
    """Get current live merged file info"""
    try:
        return merge_service.get_current_merge_info()
    except Exception as e:
        logger.error(f"Error getting current merge: {e}")
        raise HTTPException(status_code=500, detail="Failed to get current merge info")


@app.post("/api/merge/save", tags=["Merge"])
async def save_merge(data: dict):
    """Save current merge and archive previous version"""
    try:
        result = merge_service.save_merge(data)
        logger.info(f"Merge saved: {result['current_file']}")
        return result
    except AppError as e:
        logger.error(f"App error: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error saving merge: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save merge")


# ============================================================================
# ARCHIVES ENDPOINTS
# ============================================================================

@app.get("/api/archives/list", tags=["Archives"])
async def list_archives():
    """List all archived and current merged files"""
    try:
        archives = archive_service.list_archives()
        logger.info(f"Listed {len(archives)} archives")
        return {"archives": archives}
    except Exception as e:
        logger.error(f"Error listing archives: {e}")
        raise HTTPException(status_code=500, detail="Failed to list archives")


@app.get("/api/archives/download/{filename}", tags=["Archives"])
async def download_archive(filename: str):
    """Download an archived or current XML file"""
    try:
        file_path = archive_service.get_archive_path(filename)
        if not file_path.exists():
            raise AppError("Archive not found", 404)
        
        logger.info(f"Downloading: {filename}")
        return FileResponse(file_path, media_type="application/gzip", filename=filename)
    except AppError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error downloading archive: {e}")
        raise HTTPException(status_code=500, detail="Failed to download archive")


# ============================================================================
# SETTINGS ENDPOINTS
# ============================================================================

@app.get("/api/settings/get", tags=["Settings"])
async def get_settings():
    """Get all settings"""
    try:
        settings = settings_service.get_all()
        return settings
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get settings")


@app.post("/api/settings/set", tags=["Settings"])
async def set_settings(data: dict):
    """Save settings"""
    try:
        for key, value in data.items():
            settings_service.set(key, value)
        logger.info(f"Saved {len(data)} settings")
        return {"status": "saved"}
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9193)