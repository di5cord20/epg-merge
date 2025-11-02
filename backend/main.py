"""
EPG Merge Application - FastAPI Backend
Modular, maintainable architecture with proper separation of concerns
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path

# Application imports
from config import Config
from database import Database
from utils.logger import setup_logging
from utils.errors import AppError

# Services
from services.source_service import SourceService
from services.channel_service import ChannelService
from services.merge_service import MergeService
from services.archive_service import ArchiveService
from services.settings_service import SettingsService
from services.job_service import ScheduledJobService

# Routers
from routers import health, sources, channels, merge, archives, settings, jobs
from version import get_version

# Initialize configuration
config = Config()

# Initialize FastAPI app with version from backend/version.py
app = FastAPI(
    title="EPG Merge API",
    description="TV feed merger with channel filtering",
    version=get_version()
)

# Initialize logging
logger = setup_logging(__name__)

# ============================================================================
# MIDDLEWARE & STATIC FILES
# ============================================================================

# CORS Middleware
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

# ============================================================================
# INITIALIZE SERVICES
# ============================================================================

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

# ============================================================================
# REGISTER ROUTERS
# ============================================================================

# Health & Status
health.init_health_routes(db, config)
app.include_router(health.router)

# Sources
sources.init_sources_routes(source_service, db)
app.include_router(sources.router)

# Channels
channels.init_channels_routes(channel_service, db)
app.include_router(channels.router)

# Merge
merge.init_merge_routes(merge_service, archive_service, config)
app.include_router(merge.router)

# Archives
archives.init_archives_routes(archive_service, settings_service, db)
app.include_router(archives.router)

# Settings
settings.init_settings_routes(settings_service)
app.include_router(settings.router)

# Jobs
jobs.init_jobs_routes(job_service)
app.include_router(jobs.router)

# ============================================================================
# ROOT & LIFECYCLE
# ============================================================================

@app.get("/")
async def root():
    """Serve index.html"""
    static_index = Path(__file__).parent / "static" / "index.html"
    if static_index.exists():
        with open(static_index) as f:
            return HTMLResponse(f.read())
    return HTMLResponse("<h1>EPG Merge App</h1><p>Frontend loading...</p>")


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("🚀 Starting EPG Merge Application")
    db.initialize()
    logger.info("✅ Database initialized")

    job_service.init_job_history_table()
    logger.info("✅ Job history initialized")

    logger.info("⏱️ Starting scheduled merge scheduler...")
    job_service.start_scheduler()
    logger.info("✅ Scheduler started - will run merges based on settings")

    logger.info(f"📁 Config: {config.config_dir}")
    logger.info(f"📦 Archives: {config.archive_dir}")
    logger.info(f"💾 Cache: {config.cache_dir}")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("🛑 Shutting down EPG Merge Application")
    db.close()


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(AppError)
async def app_error_handler(request, exc):
    """Handle application errors"""
    logger.error(f"App error: {exc.message}")
    from fastapi import HTTPException
    raise HTTPException(status_code=exc.status_code, detail=exc.message)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    from fastapi import HTTPException
    raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.port)