"""
EPG Merge - Settings Service (Refactored v0.4.1)
Simplified settings management with defaults
"""

from typing import Dict, Any, Optional
from database import Database


class SettingsService:
    """Settings management with centralized defaults"""
    
    # Default settings - single source of truth for defaults
    DEFAULTS = {
        "output_filename": "merged.xml.gz",
        "merge_schedule": "daily",
        "merge_time": "00:00",
        "merge_days": '["0","1","2","3","4","5","6"]',  # JSON array
        "download_timeout": "120",
        "merge_timeout": "300",
        "channel_drop_threshold": "10",
        "archive_retention_days": "30",
        "archive_retention_cleanup_expired": "true",  # Delete if days_left < 0
        "discord_webhook": "",
        "selected_timeframe": "3",
        "selected_feed_type": "iptv"
    }
    
    def __init__(self, db: Optional[Database] = None):
        """Initialize settings service with optional database"""
        self.db = db
    
    def get(self, key: str, default: Optional[str] = None) -> str:
        """Get setting with fallback to defaults"""
        if not self.db:
            return default or self.DEFAULTS.get(key, "")
        
        value = self.db.get_setting(key)
        if value:
            return value
        
        # Return provided default, then built-in default, then empty string
        return default or self.DEFAULTS.get(key, "")
    
    def set(self, key: str, value: Any) -> None:
        """Set a single setting"""
        if self.db:
            self.db.set_setting(key, str(value))
    
    def get_all(self) -> Dict[str, str]:
        """Get all settings with defaults merged in"""
        if not self.db:
            return self.DEFAULTS.copy()
        
        # Get from DB and merge with defaults (DB takes precedence)
        db_settings = self.db.get_all_settings()
        result = self.DEFAULTS.copy()
        result.update(db_settings)
        return result
    
    def set_batch(self, settings: Dict[str, Any]) -> None:
        """Set multiple settings atomically"""
        if self.db:
            str_settings = {k: str(v) for k, v in settings.items()}
            self.db.batch_set_settings(str_settings)
    
    def get_defaults(self) -> Dict[str, str]:
        """Get all default settings"""
        return self.DEFAULTS.copy()
    
    def reset_to_defaults(self) -> None:
        """Reset all settings to defaults"""
        if self.db:
            self.db.batch_set_settings(self.DEFAULTS)
    
    # Convenience getters for common settings
    
    def get_output_filename(self) -> str:
        """Get configured output filename"""
        return self.get("output_filename")
    
    def get_merge_schedule(self) -> str:
        """Get merge schedule (daily/weekly)"""
        return self.get("merge_schedule")
    
    def get_merge_time(self) -> str:
        """Get merge time (HH:MM)"""
        return self.get("merge_time")
    
    def get_download_timeout(self) -> int:
        """Get download timeout in seconds"""
        return int(self.get("download_timeout", "120"))
    
    def get_merge_timeout(self) -> int:
        """Get merge timeout in seconds"""
        return int(self.get("merge_timeout", "300"))
    
    def get_archive_retention_days(self) -> int:
        """Get archive retention days"""
        return int(self.get("archive_retention_days", "30"))
    
    def get_archive_cleanup_expired(self) -> bool:
        """Get whether to cleanup archives with days_left < 0"""
        value = self.get("archive_retention_cleanup_expired", "true")
        return value.lower() in ("true", "1", "yes")
    
    def get_discord_webhook(self) -> str:
        """Get Discord webhook URL"""
        return self.get("discord_webhook", "")
    
    def get_selected_timeframe(self) -> str:
        """Get selected timeframe (3, 7, or 14 days)"""
        return self.get("selected_timeframe", "3")
    
    def get_selected_feed_type(self) -> str:
        """Get selected feed type (iptv or gracenote)"""
        return self.get("selected_feed_type", "iptv")