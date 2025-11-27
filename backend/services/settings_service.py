"""
EPG Merge - Settings Service (v0.4.8 Enhanced)
Simplified settings management with defaults including paths and channels
"""

from typing import Dict, Any, Optional
from database import Database


class SettingsService:
    """Settings management with centralized defaults"""
    
    # Default settings - single source of truth for defaults
    DEFAULTS = {
        # Output Files
        "output_filename": "merged.xml.gz",
        "sources_filename": "sources.json",
        "channels_filename": "channels.json",
        
        # Directory Paths
        "current_dir": "/data/current",
        "archive_dir": "/data/archives",
        "channels_dir": "/data/channels",
        "sources_dir": "/data/sources",
        
        # Merge Schedule
        "merge_schedule": "daily",
        "merge_time": "02:00",
        "merge_days": '["0","1","2","3","4","5","6"]',  # JSON array
        "merge_timeframe": "3",  # 3, 7, or 14 days for scheduled merges
        "merge_channels_version": "channels.json",  # which channels.json version to use
        
        # Timeouts
        "download_timeout": "120",
        "merge_timeout": "300",
        
        # Quality & Retention
        "channel_drop_threshold": "0.1",
        "archive_retention_days": "30",
        "archive_retention_cleanup_expired": "false",  # Delete if days_left < 0
        
        # Notifications
        "discord_webhook": "",
        
        # UI Selections (not used by scheduler)
        "selected_timeframe": "3",
        "selected_feed_type": "iptv",
        "selected_sources": "[]",
        "selected_channels": "[]"
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

    def set_setting(self, key: str, value: Any) -> bool:
        """Save a setting value
        
        Args:
            key: Setting key
            value: Setting value (will be converted to string)
        
        Returns:
            True if successful
        """
        try:
            # Validate the setting
            error = self.validate_setting(key, value)
            if error:
                self.logger.error(f"Validation error for {key}: {error}")
                return False
            
            # Convert value to string for storage
            str_value = str(value) if not isinstance(value, str) else value
            
            if self.db:
                self.db.set_setting(key, str_value)
                self.logger.info(f"✔ Setting saved: {key} = {str_value[:50]}")
                return True
            return False
        except Exception as e:
            self.logger.error(f"Error setting {key}: {e}")
            return False
    
    # Convenience getters for common settings
    
    def get_output_filename(self) -> str:
        """Get configured output filename for merged EPG"""
        return self.get("output_filename")
    
    def get_channels_filename(self) -> str:
        """Get configured filename for channels JSON"""
        return self.get("channels_filename")
    
    def get_current_dir(self) -> str:
        """Get configured current/live directory path"""
        return self.get("current_dir")
    
    def get_archive_dir(self) -> str:
        """Get configured archive directory path"""
        return self.get("archive_dir")
    
    def get_merge_schedule(self) -> str:
        """Get merge schedule (daily/weekly)"""
        return self.get("merge_schedule")
    
    def get_merge_time(self) -> str:
        """Get merge time (HH:MM)"""
        return self.get("merge_time")
    
    def get_merge_timeframe(self) -> str:
        """Get timeframe for scheduled merges (3, 7, or 14 days)"""
        return self.get("merge_timeframe")
    
    def get_merge_channels_version(self) -> str:
        """Get which channels version to use for scheduled merges"""
        return self.get("merge_channels_version")
    
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
        """Get selected timeframe in UI (3, 7, or 14 days)"""
        return self.get("selected_timeframe", "3")
    
    def get_selected_feed_type(self) -> str:
        """Get selected feed type in UI (iptv or gracenote)"""
        return self.get("selected_feed_type", "iptv")
    
    def get_setting(self, key: str, default: str = None) -> str:
        """Get a setting value by key
        
        Args:
            key: Setting key
            default: Default value if not found
        
        Returns:
            Setting value or default
        """
        try:
            if self.db:
                value = self.db.get_setting(key)
                if value is not None:
                    return value
            return default if default is not None else self.DEFAULTS.get(key, "")
        except Exception as e:
            self.logger.error(f"Error getting setting {key}: {e}")
            return default if default is not None else self.DEFAULTS.get(key, "")


    def get_sources_filename(self) -> str:
        """Get configured sources filename
        
        Returns:
            Filename for sources (e.g., 'sources.json')
        """
        return self.get_setting("sources_filename", self.DEFAULTS.get("sources_filename", "sources.json"))


    def get_channels_filename(self) -> str:
        """Get configured channels filename
        
        Returns:
            Filename for channels (e.g., 'channels.json')
        """
        return self.get_setting("channels_filename", self.DEFAULTS.get("channels_filename", "channels.json"))




    def validate_setting(self, key: str, value: Any) -> str:
        """Validate a setting value
        
        Args:
            key: Setting key
            value: Setting value to validate
        
        Returns:
            Error message if invalid, empty string if valid
        """
        validators = {
            "output_filename": self.validate_output_filename,
            "sources_filename": self.validate_sources_filename,
            "channels_filename": self.validate_channels_filename,
            "current_dir": self.validate_current_dir,
            "archive_dir": self.validate_archive_dir,
            "sources_dir": self.validate_sources_dir,
            "channels_dir": self.validate_channels_dir,
            "merge_time": self.validate_merge_time,
            "merge_timeframe": self.validate_merge_timeframe,
            "download_timeout": self.validate_timeout,
            "merge_timeout": self.validate_timeout,
        }
        
        validator = validators.get(key)
        if validator:
            return validator(value)
        return ""


    def validate_output_filename(self, value: str) -> str:
        """Validate output filename"""
        if not value:
            return "Output filename is required"
        if not (value.endswith('.xml') or value.endswith('.xml.gz')):
            return "Output filename must end with .xml or .xml.gz"
        return ""


    def validate_sources_filename(self, value: str) -> str:
        """Validate sources filename"""
        if not value:
            return "Sources filename is required"
        if not value.endswith('.json'):
            return "Sources filename must end with .json"
        return ""


    def validate_channels_filename(self, value: str) -> str:
        """Validate channels filename"""
        if not value:
            return "Channels filename is required"
        if not value.endswith('.json'):
            return "Channels filename must end with .json"
        return ""


    def validate_current_dir(self, value: str) -> str:
        """Validate current directory"""
        if not value:
            return "Current directory is required"
        return ""


    def validate_archive_dir(self, value: str) -> str:
        """Validate archive directory"""
        if not value:
            return "Archive directory is required"
        return ""


    def validate_sources_dir(self, value: str) -> str:
        """Validate sources directory"""
        if not value:
            return "Sources directory is required"
        return ""


    def validate_channels_dir(self, value: str) -> str:
        """Validate channels directory"""
        if not value:
            return "Channels directory is required"
        return ""


    def validate_merge_time(self, value: str) -> str:
        """Validate merge time format (HH:MM)"""
        if not value:
            return "Merge time is required"
        parts = value.split(':')
        if len(parts) != 2:
            return "Merge time must be in HH:MM format"
        try:
            hour = int(parts[0])
            minute = int(parts[1])
            if not (0 <= hour < 24 and 0 <= minute < 60):
                return "Invalid time values"
        except ValueError:
            return "Merge time must be in HH:MM format"
        return ""


    def validate_merge_timeframe(self, value: str) -> str:
        """Validate merge timeframe"""
        if value not in ['3', '7', '14']:
            return "Merge timeframe must be 3, 7, or 14"
        return ""


    def validate_timeout(self, value: str) -> str:
        """Validate timeout (must be positive integer)"""
        try:
            timeout_int = int(value)
            if timeout_int <= 0:
                return "Timeout must be greater than 0"
        except ValueError:
            return "Timeout must be a number"
        return ""