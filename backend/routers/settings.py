"""
Settings configuration endpoints
"""

from fastapi import APIRouter, HTTPException
from utils.logger import setup_logging

logger = setup_logging(__name__)

router = APIRouter(tags=["Settings"])


def init_settings_routes(settings_service):
    """Initialize settings routes with dependencies"""
    
    @router.get("/api/settings/get")
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

    @router.post("/api/settings/set")
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