"""
EPG Merge Application - FastAPI Backend
Modular, maintainable architecture with proper separation of concerns
"""

import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from datetime import datetime

# Application imports
from config import Config
from database import Database
from utils.logger import setup_logging
from utils.errors import AppError

from services.source_service import SourceService
from services.channel_service import ChannelService
from services.merge_service import MergeService
from services.archive_service import ArchiveService
from services.settings_service import SettingsService
from services.job_service import ScheduledJobService

from version import get_version

app = FastAPI(
    title="EPG Merge API",
    version=get_version()
)

# Initialize logging
logger = setup_logging(__name__)

# Initialize configuration
config = Config()

# Initialize FastAPI app
app = FastAPI(
    title="EPG Merge API",
    description="TV feed merger with channel filtering",
    version="0.3.0"
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

# Initialize database
db = Database(config.db_path)
source_service = SourceService(config)
channel_service = ChannelService(config, db)
merge_service = MergeService(config, db)
archive_service = ArchiveService(config, db)
settings_service = SettingsService(db)
job_service = ScheduledJobService(
    config, db, merge_service, channel_service, 
    source_service, settings_service
)

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("🚀 Starting EPG Merge Application")
    db.initialize()
    logger.info("✅ Database initialized")

    # Initialize job service
    job_service.init_job_history_table()
    logger.info("✅ Job history initialized")

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
    from version import get_version
    try:
        db_status = db.health_check()
        return {
            "status": "healthy" if db_status else "unhealthy",
            "version": get_version(),
            "database": "ok" if db_status else "error",
            "timestamp": datetime.now().isoformat()
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
                "version": "0.3.0",
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
    """Fetch available XML files from share.jesmann.com
    
    Args:
        timeframe: Days (3, 7, or 14)
        feed_type: Feed type (iptv or gracenote)
    
    Returns:
        Dictionary with available sources
    """
    try:
        logger.info(f"Fetching sources: timeframe={timeframe}, feed_type={feed_type}")
        result = await source_service.fetch_sources(timeframe, feed_type)
        logger.info(f"Found {len(result['sources'])} sources")
        return result
    except Exception as e:
        logger.error(f"Error fetching sources: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch sources")


@app.post("/api/sources/select", tags=["Sources"])
async def select_sources(data: dict):
    """Save selected sources
    
    Args:
        data: Dictionary with 'sources' list
    
    Returns:
        Status message with count
    """
    try:
        sources = data.get("sources", [])
        if not isinstance(sources, list):
            raise ValueError("sources must be a list")
        
        # FIX: Use json.dumps() to store as proper JSON, not str()
        import json
        db.set_setting("selected_sources", json.dumps(sources))
        logger.info(f"Saved {len(sources)} selected sources")
        return {"status": "saved", "count": len(sources)}
    except Exception as e:
        logger.error(f"Error saving sources: {e}")
        raise HTTPException(status_code=500, detail="Failed to save sources")

# ============================================================================
# CHANNELS ENDPOINTS
# ============================================================================

@app.get("/api/channels/from-sources", tags=["Channels"])
async def get_channels_from_sources(sources: str = Query("")):
    """Get channel IDs from selected sources
    
    Args:
        sources: Comma-separated list of source filenames
    
    Returns:
        Dictionary with channels list
    """
    try:
        sources_list = [s.strip() for s in sources.split(',') if s.strip()]
        logger.info(f"Loading channels from {len(sources_list)} sources")
        channels = await channel_service.fetch_channels_from_sources(sources_list)
        logger.info(f"Loaded {len(channels)} unique channels")
        return {"channels": channels}
    except Exception as e:
        logger.error(f"Error loading channels: {e}", exc_info=True)
        return {"channels": []}


@app.post("/api/channels/select", tags=["Channels"])
async def select_channels(data: dict):
    """Save selected channels
    
    Args:
        data: Dictionary with 'channels' list
    
    Returns:
        Status message with count
    """
    try:
        channels = data.get("channels", [])
        if not isinstance(channels, list):
            raise ValueError("channels must be a list")
        
        # FIX: Use json.dumps() to store as proper JSON, not str()
        import json
        channel_service.save_selected_channels(channels)
        db.set_setting("selected_channels", json.dumps(channels))
        logger.info(f"Saved {len(channels)} selected channels")
        return {"status": "saved", "count": len(channels)}
    except Exception as e:
        logger.error(f"Error saving channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to save channels")


@app.get("/api/channels/selected", tags=["Channels"])
async def get_selected_channels():
    """Get previously selected channels"""
    try:
        channels = channel_service.get_selected_channels()
        return {"channels": channels}
    except Exception as e:
        logger.error(f"Error getting selected channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to get selected channels")


@app.post("/api/channels/export", tags=["Channels"])
async def export_channels():
    """Export selected channels as JSON
    
    Returns:
        Export data with filename
    """
    try:
        export_data = channel_service.export_channels()
        logger.info(f"Exported {export_data['data']['channel_count']} channels")
        return export_data
    except Exception as e:
        logger.error(f"Error exporting channels: {e}")
        raise HTTPException(status_code=500, detail="Failed to export channels")


@app.post("/api/channels/import", tags=["Channels"])
async def import_channels(data: dict):
    """Import channels from JSON backup
    
    Args:
        data: Dictionary with 'channels' list
    
    Returns:
        Status message with count
    """
    try:
        channels = data.get("channels", [])
        if not isinstance(channels, list):
            raise ValueError("channels must be a list")
        
        channel_service.save_selected_channels(channels)
        logger.info(f"Imported {len(channels)} channels")
        return {"status": "success", "count": len(channels)}
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
        logger.info(f"🔄 Starting merge execution...")
        logger.info(f"  Sources: {len(data.get('sources', []))}")
        logger.info(f"  Channels: {len(data.get('channels', []))}")
        
        result = await merge_service.execute_merge(data)
        
        logger.info(f"✅ Merge completed: {result['channels_included']} channels, {result['programs_included']} programs")
        logger.info(f"   File: {result['filename']} ({result['file_size']})")
        
        # Save archive metadata to database
        try:
            archive_service.save_archive_metadata(
                result['filename'],
                result['channels_included'],
                result['programs_included'],
                result.get('days_included', 0)
            )
        except Exception as e:
            logger.warning(f"Could not save archive metadata: {e}")
        
        return result
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Merge error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Merge failed")


@app.get("/api/merge/current", tags=["Merge"])
async def get_current_merge():
    """Get current live merged file info
    
    Returns:
        Dictionary with current merge file information
    """
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
        
        # Save metadata for the current file with days_included
        try:
            archive_service.save_archive_metadata(
                'merged.xml.gz',
                result.get('channels'),
                result.get('programs'),
                result.get('days_included', 0)
            )
        except Exception as e:
            logger.warning(f"Could not save metadata for current file: {e}")
        
        return result
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error saving merge: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to save merge")


@app.get("/api/merge/download/{filename}", tags=["Merge"])
async def download_merge(filename: str):
    """Download temporary merged file from /data/tmp/
    
    Args:
        filename: Name of temporary merge file to download
    
    Returns:
        File response with gzip content
    """
    try:
        # Prevent path traversal
        if ".." in filename or "/" in filename:
            raise ValueError("Invalid filename")
        
        file_path = config.tmp_dir / filename
        
        if not file_path.exists():
            raise FileNotFoundError(f"Merge file not found: {filename}")
        
        logger.info(f"Downloading merge file: {filename}")
        return FileResponse(file_path, media_type="application/gzip", filename=filename)
    
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        logger.error(f"Invalid filename: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error downloading merge: {e}")
        raise HTTPException(status_code=500, detail="Failed to download merge")


# ============================================================================
# ARCHIVES ENDPOINTS
# ============================================================================

@app.get("/api/archives/list", tags=["Archives"])
async def list_archives():
    """List all archived and current merged files
    
    Returns:
        Dictionary with archives list
    """
    try:
        archives = archive_service.list_archives()
        logger.info(f"Listed {len(archives)} archives")
        return {"archives": archives}
    except Exception as e:
        logger.error(f"Error listing archives: {e}")
        raise HTTPException(status_code=500, detail="Failed to list archives")


@app.get("/api/archives/download/{filename}", tags=["Archives"])
async def download_archive(filename: str):
    """Download an archived or current XML file
    
    Args:
        filename: Name of archive file to download
    
    Returns:
        File response with gzip content
    """
    try:
        file_path = archive_service.get_archive_path(filename)
        if not file_path.exists():
            raise FileNotFoundError(f"Archive not found: {filename}")
        
        logger.info(f"Downloading: {filename}")
        from fastapi.responses import FileResponse
        return FileResponse(file_path, media_type="application/gzip", filename=filename)
    except FileNotFoundError as e:
        logger.error(f"File not found: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error downloading archive: {e}")
        raise HTTPException(status_code=500, detail="Failed to download archive")
    
@app.post("/api/archives/cleanup", tags=["Archives"])
async def cleanup_archives():
    """Trigger archive cleanup based on retention policy"""
    try:
        retention = int(settings_service.get("archive_retention", "30"))
        result = archive_service.cleanup_old_archives(retention)
        logger.info(f"Archive cleanup triggered: {result['deleted']} deleted")
        return result
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
        raise HTTPException(status_code=500, detail="Cleanup failed")

@app.delete("/api/archives/delete/{filename}", tags=["Archives"])
async def delete_archive(filename: str):
    """Delete an archived file (cannot delete current merged.xml.gz)"""
    try:
        # Prevent deletion of current live file
        if filename == "merged.xml.gz":
            raise AppError("Cannot delete current live file", 400)
        
        file_path = archive_service.get_archive_path(filename)
        
        if not file_path.exists():
            raise AppError("Archive not found", 404)
        
        # Delete the file
        file_path.unlink()
        logger.info(f"Deleted archive: {filename}")
        
        # Delete metadata from database if exists
        if db:
            try:
                db.execute(f"DELETE FROM archives WHERE filename = ?", (filename,))
            except Exception as e:
                logger.warning(f"Could not delete archive metadata from DB: {e}")
        
        return {"status": "success", "message": f"Deleted {filename}"}
    
    except AppError as e:
        logger.error(f"App error: {e.message}")
        raise HTTPException(status_code=e.status_code, detail=e.message)
    except Exception as e:
        logger.error(f"Error deleting archive: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete archive")

# ============================================================================
# SETTINGS ENDPOINTS
# ============================================================================

@app.get("/api/settings/get", tags=["Settings"])
async def get_settings():
    """Get all settings
    
    Returns:
        Dictionary of all settings
    """
    try:
        settings = settings_service.get_all()
        return settings
    except Exception as e:
        logger.error(f"Error getting settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to get settings")


@app.post("/api/settings/set", tags=["Settings"])
async def set_settings(data: dict):
    """Save settings
    
    Args:
        data: Dictionary of settings to save
    
    Returns:
        Status message
    """
    try:
        for key, value in data.items():
            settings_service.set(key, value)
        logger.info(f"Saved {len(data)} settings")
        return {"status": "saved"}
    except Exception as e:
        logger.error(f"Error saving settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save settings")

# ============================================================================
# SCHEDULED JOB ENDPOINTS
# ============================================================================

@app.post("/api/merge/execute", tags=["Merge"])
async def execute_merge(data: dict):
    """Execute merge of selected sources with channel filtering
    
    Args:
        data: Dictionary with:
            - sources: List of source files
            - channels: List of channel IDs to filter
            - timeframe: Days (3, 7, 14)
            - feed_type: Feed type (iptv or gracenote)
            - output_filename: (optional) Configured output filename from settings
    
    Returns:
        Merge result with temporary filename and statistics
    """
    try:
        logger.info(f"🔄 Starting merge execution...")
        logger.info(f"  Sources: {len(data.get('sources', []))}")
        logger.info(f"  Channels: {len(data.get('channels', []))}")
        
        result = await merge_service.execute_merge(data)
        
        logger.info(f"✅ Merge completed: {result['channels_included']} channels, {result['programs_included']} programs")
        logger.info(f"   File: {result['filename']} ({result['file_size']})")
        
        # Save archive metadata to database
        try:
            archive_service.save_archive_metadata(
                result['filename'],
                result['channels_included'],
                result['programs_included'],
                result.get('days_included', 0)
            )
        except Exception as e:
            logger.warning(f"Could not save archive metadata: {e}")
        
        return result
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Merge error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Merge failed")


@app.post("/api/merge/clear-temp", tags=["Merge"])
async def clear_temp_files():
    """Clear all temporary merge files from /data/tmp/
    
    Called when user clears merge log or wants to start fresh
    
    Returns:
        Cleanup statistics
    """
    try:
        logger.info("Clearing temporary merge files...")
        result = merge_service.clear_temp_files()
        logger.info(f"Temp files cleared: {result['deleted']} files, {result['freed_mb']}MB freed")
        return result
    except Exception as e:
        logger.error(f"Error clearing temp files: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear temporary files")


@app.get("/api/jobs/history", tags=["Scheduled Jobs"])
async def get_job_history(limit: int = 50):
    """Get job execution history
    
    Args:
        limit: Maximum number of records (default 50)
    
    Returns:
        List of job history records
    
    Example curl:
        curl http://localhost:9193/api/jobs/history?limit=10
    """
    try:
        history = job_service.get_job_history(limit)
        logger.info(f"Retrieved {len(history)} job history records")
        return {"jobs": history, "count": len(history)}
    except Exception as e:
        logger.error(f"Error retrieving job history: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve job history")


@app.get("/api/jobs/latest", tags=["Scheduled Jobs"])
async def get_latest_job():
    """Get most recent job execution record
    
    Returns:
        Latest job record or null if none
    
    Example curl:
        curl http://localhost:9193/api/jobs/latest
    """
    try:
        latest = job_service.get_latest_job()
        return {"job": latest}
    except Exception as e:
        logger.error(f"Error retrieving latest job: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve latest job")


@app.get("/api/jobs/status", tags=["Scheduled Jobs"])
async def get_job_status():
    """Get current job status and next scheduled run
    
    Returns:
        Current job status and timing information
    
    Example curl:
        curl http://localhost:9193/api/jobs/status
    """
    try:
        latest = job_service.get_latest_job()
        next_run = job_service.get_next_run_time()
        
        status = {
            "is_running": job_service.is_job_running,
            "latest_job": latest,
            "next_scheduled_run": next_run
        }
        
        return status
    except Exception as e:
        logger.error(f"Error getting job status: {e}")
        raise HTTPException(status_code=500, detail="Failed to get job status")


@app.post("/api/jobs/cancel", tags=["Scheduled Jobs"])
async def cancel_running_job():
    """Cancel currently running scheduled merge job
    
    Returns:
        Cancellation status
    
    Example curl:
        curl -X POST http://localhost:9193/api/jobs/cancel
    """
    try:
        if not job_service.is_job_running or not job_service.current_job_task:
            return {
                "status": "no_job",
                "message": "No job currently running"
            }
        
        logger.warning("Cancelling running job")
        job_service.current_job_task.cancel()
        
        return {
            "status": "cancelled",
            "message": "Job cancellation requested"
        }
    except Exception as e:
        logger.error(f"Error cancelling job: {e}")
        raise HTTPException(status_code=500, detail="Failed to cancel job")

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(AppError)
async def app_error_handler(request, exc):
    """Handle application errors"""
    logger.error(f"App error: {exc.message}")
    return HTTPException(status_code=exc.status_code, detail=exc.message)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.port)