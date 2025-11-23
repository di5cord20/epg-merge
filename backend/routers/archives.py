"""
Archive management and retrieval endpoints
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from utils.logger import setup_logging
from utils.errors import AppError

logger = setup_logging(__name__)

router = APIRouter(tags=["Archives"])


def init_archives_routes(archive_service, settings_service, db, channel_service):
    """Initialize archives routes with dependencies"""
    
    @router.get("/api/archives/list")
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

    @router.get("/api/archives/download/{filename}")
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
            return FileResponse(file_path, media_type="application/gzip", filename=filename)
        except FileNotFoundError as e:
            logger.error(f"File not found: {e}")
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            logger.error(f"Error downloading archive: {e}")
            raise HTTPException(status_code=500, detail="Failed to download archive")

    @router.post("/api/archives/cleanup")
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

    @router.delete("/api/archives/delete/{filename}")
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
        
    @router.get("/api/archives/download-channel/{filename}")
    async def download_channel_version(filename: str):
        """Download a channel version JSON file
        
        Args:
            filename: Name of channel version file to download
        
        Returns:
            File response with JSON content
        """
        try:
            file_path = channel_service.get_channel_version_path(filename)
            logger.info(f"✅ Downloading channel version: {filename}")
            return FileResponse(file_path, media_type="application/json", filename=filename)
        except FileNotFoundError as e:
            logger.error(f"File not found: {e}")
            raise HTTPException(status_code=404, detail=str(e))
        except Exception as e:
            logger.error(f"Error downloading channel version: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to download channel version")

    @router.delete("/api/archives/delete-channel/{filename}")
    async def delete_channel_version(filename: str):
        """Delete an archived channel version (cannot delete current)
        
        Args:
            filename: Name of channel version file to delete
        """
        try:
            channels_filename = settings_service.get("channels_filename", "channels.json")
            
            # Prevent deletion of current channel file
            if filename == channels_filename:
                raise AppError("Cannot delete current channel version", 400)
            
            file_path = channel_service.get_channel_version_path(filename)
            
            # Delete the file
            file_path.unlink()
            logger.info(f"✅ Deleted channel version: {filename}")
            
            # Delete metadata from database if exists
            if db:
                try:
                    db.delete_channel_version(filename)
                except Exception as e:
                    logger.warning(f"Could not delete channel version metadata from DB: {e}")
            
            return {"status": "success", "message": f"Deleted {filename}"}
        
        except AppError as e:
            logger.error(f"App error: {e.message}")
            raise HTTPException(status_code=e.status_code, detail=e.message)
        except Exception as e:
            logger.error(f"Error deleting channel version: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Failed to delete channel version")