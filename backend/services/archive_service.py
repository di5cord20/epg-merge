"""
EPG Merge - Archive Service
Handles archive management and file organization
"""

from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

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
        """List all archives
        
        Returns:
            List of archive dictionaries with metadata
        """
        archives = []
        
        # Add current
        current = self.config.archive_dir / "merged.xml.gz"
        if current.exists():
            archives.append(self._format_archive(current, is_current=True))
        
        # Add timestamped
        for file in sorted(self.config.archive_dir.glob("*.xml.gz.*"), reverse=True):
            archives.append(self._format_archive(file, is_current=False))
        
        return archives
    
    def _format_archive(self, path: Path, is_current: bool) -> Dict[str, Any]:
        """Format archive for API response
        
        Args:
            path: Path to archive file
            is_current: Whether this is the current live file
        
        Returns:
            Formatted archive dictionary
        """
        stat = path.stat()
        return {
            "filename": path.name,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "channels": "N/A",
            "programs": "N/A",
            "size": f"{stat.st_size / (1024**2):.2f}MB",
            "days_left": "∞" if is_current else "N/A",
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