"""
Merge execution and download endpoints
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from utils.logger import setup_logging

logger = setup_logging(__name__)

router = APIRouter(tags=["Merge"])


def init_merge_routes(merge_service, archive_service, config):
    """Initialize merge routes with dependencies"""
    
    @router.post("/api/merge/execute")
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

    @router.get("/api/merge/current")
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

    @router.post("/api/merge/save")
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

    @router.get("/api/merge/download/{filename}")
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

    @router.post("/api/merge/clear-temp")
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