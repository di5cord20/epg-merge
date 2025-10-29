"""
EPG Merge Application Configuration Management
Handles environment-based configuration with sensible defaults
"""

import os
from pathlib import Path
from typing import Dict, Any


class Config:
    """Application configuration with environment-based overrides"""
    
    def __init__(self):
        """Initialize configuration from environment variables"""
        self.environment = os.getenv("ENVIRONMENT", "development")
        # For development: config at project root
        # For production: /config (standard location)
        if self.environment == "development":
            # Go up one level from backend/ to project root
            default_config_dir = str(Path(__file__).parent.parent / "config")
        else:
            default_config_dir = "/config"
        self.config_dir = Path(os.getenv("CONFIG_DIR", default_config_dir))
        self.archive_dir = Path(os.getenv("ARCHIVE_DIR", self.config_dir / "archives"))
        self.cache_dir = Path(os.getenv("CACHE_DIR", self.config_dir / "epg_cache"))
        self.db_path = Path(os.getenv("DB_PATH", self.config_dir / "app.db"))
        self.port = int(os.getenv("SERVICE_PORT", 9193))
        self.workers = int(os.getenv("WORKERS", 1))
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.timeout_download = int(os.getenv("TIMEOUT_DOWNLOAD", 120))
        self.timeout_merge = int(os.getenv("TIMEOUT_MERGE", 300))
        
        # Create directories
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Create required directories if they don't exist"""
        for directory in [self.config_dir, self.archive_dir, self.cache_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary for inspection"""
        return {
            "environment": self.environment,
            "config_dir": str(self.config_dir),
            "archive_dir": str(self.archive_dir),
            "cache_dir": str(self.cache_dir),
            "db_path": str(self.db_path),
            "port": self.port,
            "workers": self.workers,
            "log_level": self.log_level,
            "timeout_download": self.timeout_download,
            "timeout_merge": self.timeout_merge
        }