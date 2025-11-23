"""
Health and status check endpoints
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from backend.version import get_version
from utils.logger import setup_logging

logger = setup_logging(__name__)

router = APIRouter(tags=["Health"])


def init_health_routes(db, config):
    """Initialize health routes with dependencies"""
    
    @router.get("/api/health")
    async def health_check():
        """Health check endpoint"""
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

    @router.get("/api/status")
    async def get_status():
        """Get detailed application status"""
        try:
            return {
                "app": {
                    "version": get_version(),
                    "environment": config.environment
                },
                "storage": {
                    "cache_dir": str(config.cache_dir),
                    "archive_dir": str(config.archive_dir),
                    "config_dir": str(config.config_dir)
                },
                "database": {
                    "connected": db.health_check()
                }
            }
        except Exception as e:
            logger.error(f"Status check failed: {e}")
            raise HTTPException(status_code=500, detail="Status check failed")