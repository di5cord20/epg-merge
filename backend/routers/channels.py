"""
Channel management and filtering endpoints
"""

import json
from fastapi import APIRouter, HTTPException, Query
from utils.logger import setup_logging

logger = setup_logging(__name__)

router = APIRouter(tags=["Channels"])


def init_channels_routes(channel_service, db):
    """Initialize channels routes with dependencies"""
    
    @router.get("/api/channels/from-sources")
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

    @router.post("/api/channels/select")
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
            
            channel_service.save_selected_channels(channels)
            db.set_setting("selected_channels", json.dumps(channels))
            logger.info(f"Saved {len(channels)} selected channels")
            return {"status": "saved", "count": len(channels)}
        except Exception as e:
            logger.error(f"Error saving channels: {e}")
            raise HTTPException(status_code=500, detail="Failed to save channels")

    @router.get("/api/channels/selected")
    async def get_selected_channels():
        """Get previously selected channels"""
        try:
            channels = channel_service.get_selected_channels()
            return {"channels": channels}
        except Exception as e:
            logger.error(f"Error getting selected channels: {e}")
            raise HTTPException(status_code=500, detail="Failed to get selected channels")

    @router.post("/api/channels/export")
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

    @router.post("/api/channels/import")
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