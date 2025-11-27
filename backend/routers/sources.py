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
    async def list_sources(timeframe: str = Query("3"), feed_type: str = Query("iptv")):
        """List available sources from share.jesmann.com
        
        Args:
            timeframe: EPG timeframe (3, 7, 14)
            feed_type: Feed type (iptv, gracenote)
        
        Returns:
            Dictionary with sources list
        """
        try:
            logger.info(f"Fetching sources: timeframe={timeframe}, feed_type={feed_type}")
            
            # fetch_sources returns a list directly, not a dict
            sources = await source_service.fetch_sources(timeframe, feed_type)
            
            logger.info(f"Found {len(sources)} sources")
            return {"sources": sources}
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
        
    @router.post("/api/sources/save")
    async def save_sources(data: dict):
        """Save selected sources with versioning and optional custom filename
        
        Args:
            data: Dictionary with:
                - 'sources': List of source filenames
                - 'timeframe': EPG timeframe (3, 7, 14)
                - 'feed_type': Feed type (iptv, gracenote)
                - 'filename': Optional custom filename (if not provided, uses default)
        
        Returns:
            Status with save details
        """
        try:
            sources = data.get("sources", [])
            timeframe = data.get("timeframe", "3")
            feed_type = data.get("feed_type", "iptv")
            filename = data.get("filename", None)  # NEW: Accept custom filename
            
            if not isinstance(sources, list) or len(sources) == 0:
                raise ValueError("sources must be a non-empty list")
            
            result = source_service.save_selected_sources(sources, timeframe, feed_type, filename)
            logger.info(f"Saved {len(sources)} sources to {result['filename']}")
            return result
        except Exception as e:
            logger.error(f"Error saving sources: {e}")
            raise HTTPException(status_code=500, detail="Failed to save sources")

    @router.get("/api/sources/versions")
    async def get_source_versions():
        """Get list of saved source versions"""
        from pathlib import Path
        import json
        
        sources_dir = Path('/data/sources')
        if not sources_dir.exists():
            return {'versions': []}
        
        versions = []
        for f in sorted(sources_dir.glob('sources.json*'), reverse=True):
            try:
                data = json.loads(f.read_text())
                versions.append({
                    'name': f.name,
                    'filename': f.name,
                    'sources': data.get('sources', []),
                    'timeframe': data.get('timeframe', '3'),
                    'feed_type': data.get('feed_type', 'iptv'),
                    'saved_at': data.get('saved_at', 'unknown')
                })
            except:
                pass
        
        return {'versions': versions}
    
    @router.get("/api/sources/versions")
    async def get_source_versions():
        """Get all source versions (current + archived)
        
        Returns:
            List of source versions with metadata
        """
        try:
            result = source_service.get_source_versions()
            logger.info(f"Retrieved {len(result['versions'])} source versions")
            return result
        except Exception as e:
            logger.error(f"Error getting source versions: {e}")
            raise HTTPException(status_code=500, detail="Failed to get source versions")


    @router.post("/api/sources/load-from-disk")
    async def load_sources_from_disk(data: dict):
        """Load sources from a saved version file on disk
        
        Args:
            data: Dictionary with:
                - 'filename': The source version filename to load
        
        Returns:
            Status with loaded sources
        """
        try:
            filename = data.get("filename", "")
            if not filename:
                raise ValueError("filename is required")
            
            result = source_service.load_sources_from_disk(filename)
            logger.info(f"Loaded {result['count']} sources from {filename}")
            return result
        except FileNotFoundError as e:
            logger.error(f"Source file not found: {filename}")
            raise HTTPException(status_code=404, detail=f"Source file not found: {filename}")
        except ValueError as e:
            logger.error(f"Invalid source file: {e}")
            raise HTTPException(status_code=400, detail=f"Invalid source file: {e}")
        except Exception as e:
            logger.error(f"Error loading sources from disk: {e}")
            raise HTTPException(status_code=500, detail="Failed to load sources from disk")