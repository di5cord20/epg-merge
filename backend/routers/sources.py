"""
Source selection and loading endpoints
"""

import json
from fastapi import APIRouter, HTTPException, Query
from utils.logger import setup_logging

logger = setup_logging(__name__)

router = APIRouter(tags=["Sources"])


def init_sources_routes(source_service, db):
    """Initialize sources routes with dependencies"""
    
    @router.get("/api/sources/list")
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

    @router.post("/api/sources/select")
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
            
            db.set_setting("selected_sources", json.dumps(sources))
            logger.info(f"Saved {len(sources)} selected sources")
            return {"status": "saved", "count": len(sources)}
        except Exception as e:
            logger.error(f"Error saving sources: {e}")
            raise HTTPException(status_code=500, detail="Failed to save sources")