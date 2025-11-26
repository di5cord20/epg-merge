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
        
    @router.post("/api/sources/save")
    async def save_sources(body: dict):
        """Save sources with versioning (like channels)"""
        sources = body.get('sources', [])
        timeframe = body.get('timeframe', '3')
        feed_type = body.get('feed_type', 'iptv')
        
        if not sources:
            raise HTTPException(status_code=400, detail="No sources provided")
        
        # Save versioned copy to /data/sources
        import json
        from pathlib import Path
        from datetime import datetime
        
        sources_dir = Path('/data/sources')
        sources_dir.mkdir(exist_ok=True)
        
        # Save as current
        current_file = sources_dir / f'sources.json'
        current_file.write_text(json.dumps({
            'sources': sources,
            'timeframe': timeframe,
            'feed_type': feed_type,
            'saved_at': datetime.now().isoformat()
        }, indent=2))
        
        # Also save timestamped version
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        versioned_file = sources_dir / f'sources.json.{timestamp}'
        versioned_file.write_text(current_file.read_text())
        
        return {
            'status': 'saved',
            'sources_count': len(sources),
            'version': timestamp
        }

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