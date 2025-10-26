"""
EPG Merge - Settings Service
Handles settings persistence and retrieval
"""

from typing import Dict, Any

from database import Database


class SettingsService:
    """Handles settings persistence"""
    
    def __init__(self, db: Database = None):
        """Initialize settings service
        
        Args:
            db: Database instance
        """
        self.db = db
    
    def get(self, key: str, default: str = "") -> str:
        """Get a setting
        
        Args:
            key: Setting key
            default: Default value if not found
        
        Returns:
            Setting value or default
        """
        if self.db:
            return self.db.get_setting(key, default)
        return default
    
    def set(self, key: str, value: Any) -> None:
        """Set a setting
        
        Args:
            key: Setting key
            value: Setting value
        """
        if self.db:
            self.db.set_setting(key, str(value))
    
    def get_all(self) -> Dict[str, str]:
        """Get all settings
        
        Returns:
            Dictionary of all settings
        """
        if self.db:
            return self.db.get_all_settings()
        return {}