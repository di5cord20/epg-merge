"""
EPG Merge - Archive Service
Handles archive management and file organization
"""

from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timedelta

from config import Config
from database import Database
from .base_service import BaseService


class ArchiveService(BaseService):
    """Handles archive management"""
    
    def __init__(self, config: Config, db: Database = None):
        """Initialize archive service
        
        Args:
            config: Application configuration
            db: Database instance
        """
        super().__init__(config)
        self.db = db
    
    def list_archives(self) -> List[Dict[str, Any]]:
        """List all archives with metadata from database
        
        Returns:
            List of archive dictionaries with accurate counts
        """
        archives = []
        
        # Add current file
        current = self.config.archive_dir / "merged.xml.gz"
        if current.exists():
            archive_data = self.db.get_archive("merged.xml.gz") if self.db else None
            archives.append(self._format_archive(current, is_current=True, db_data=archive_data))
        
        # Add timestamped archives
        for file in sorted(self.config.archive_dir.glob("*.xml.gz.*"), reverse=True):
            filename = file.name
            archive_data = self.db.get_archive(filename) if self.db else None
            archives.append(self._format_archive(file, is_current=False, db_data=archive_data))
        
        return archives

    def _format_archive(self, path: Path, is_current: bool, db_data: Dict = None) -> Dict[str, Any]:
        """Format archive for API response
        
        Args:
            path: Path to archive file
            is_current: Whether this is the current live file
            db_data: Archive metadata from database
        
        Returns:
            Formatted archive dictionary
        """
        stat = path.stat()
        size_bytes = stat.st_size
        
        # Use database values if available, otherwise N/A
        channels = db_data.get('channels') if db_data else None
        programs = db_data.get('programs') if db_data else None
        days_included = db_data.get('days_included') if db_data else None
        
        return {
            "filename": path.name,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "channels": channels if channels is not None else None,
            "programs": programs if programs is not None else None,
            "days_included": days_included if days_included is not None else None,
            "size_bytes": size_bytes,
            "is_current": is_current
        }
    
    def get_archive_path(self, filename: str) -> Path:
        """Get safe archive path
        
        Args:
            filename: Archive filename
        
        Returns:
            Full path to archive file
        
        Raises:
            ValueError: If filename contains path traversal characters
        """
        # Prevent path traversal
        if ".." in filename or "/" in filename:
            raise ValueError("Invalid filename")
        
        return self.config.archive_dir / filename
    
    def save_archive_metadata(self, filename: str, channels: int, programs: int, days_included: int = 0) -> None:
        """Save archive metadata to database
        
        Args:
            filename: Archive filename
            channels: Number of channels
            programs: Number of programs
            days_included: Number of days included (timeframe)
        """
        if self.db:
            try:
                file_path = self.config.archive_dir / filename
                if file_path.exists():
                    size_bytes = file_path.stat().st_size
                    self.db.save_archive(filename, channels, programs, days_included, size_bytes)
                    self.logger.info(f"Saved metadata for {filename}: {channels} channels, {programs} programs, {days_included} days")
            except Exception as e:
                self.logger.error(f"Error saving archive metadata: {e}")

    def cleanup_old_archives(self, retention_days: int = 30) -> Dict[str, Any]:
        """Delete archives older than retention policy
        
        Args:
            retention_days: Keep archives for this many days
        
        Returns:
            Cleanup statistics
        """
        if retention_days <= 0:
            return {"deleted": 0, "freed_bytes": 0, "message": "Retention disabled"}
        
        deleted_count = 0
        freed_bytes = 0
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        self.logger.info(f"Cleanup: Removing archives older than {retention_days} days")
        
        # Skip current file
        current = self.config.archive_dir / "merged.xml.gz"
        
        for file in self.config.archive_dir.glob("*.xml.gz.*"):
            try:
                file_time = datetime.fromtimestamp(file.stat().st_mtime)
                
                if file_time < cutoff_date:
                    size = file.stat().st_size
                    file.unlink()
                    deleted_count += 1
                    freed_bytes += size
                    self.logger.info(f"Deleted: {file.name}")
            except Exception as e:
                self.logger.error(f"Error deleting {file.name}: {e}")
        
        self.logger.info(f"Cleanup complete: {deleted_count} files deleted, {freed_bytes / (1024**2):.2f}MB freed")
        
        return {
            "deleted": deleted_count,
            "freed_bytes": freed_bytes,
            "freed_mb": round(freed_bytes / (1024**2), 2)
        }