import os
from pathlib import Path
from typing import Dict, Any


class Config:
    """Application configuration with environment-based overrides"""
    
    def __init__(self):
        """Initialize configuration from environment variables"""
        self.environment = os.getenv("ENVIRONMENT", "development")
        
        # Data directory structure (MUST be absolute paths)
        default_data_dir = "/data" if self.environment == "production" else str(Path(__file__).parent.parent / "data")
        
        self.data_dir = self._validate_absolute_path(
            os.getenv("DATA_DIR", default_data_dir),
            "DATA_DIR"
        )
        self.tmp_dir = self._validate_absolute_path(
            os.getenv("TMP_DIR", str(self.data_dir / "tmp")),
            "TMP_DIR"
        )
        self.current_dir = self._validate_absolute_path(
            os.getenv("CURRENT_DIR", str(self.data_dir / "current")),
            "CURRENT_DIR"
        )
        self.archive_dir = self._validate_absolute_path(
            os.getenv("ARCHIVE_DIR", str(self.data_dir / "archives")),
            "ARCHIVE_DIR"
        )
        self.channels_dir = self._validate_absolute_path(
            os.getenv("CHANNELS_DIR", str(self.data_dir / "channels")),
            "CHANNELS_DIR"
        )
        self.sources_dir = self._validate_absolute_path(
            os.getenv("SOURCES_DIR", str(self.data_dir / "sources")),
            "SOURCES_DIR"
        )
        
        # Config and cache
        default_config_dir = "/config" if self.environment == "production" else str(Path(__file__).parent.parent / "config")
        self.config_dir = self._validate_absolute_path(
            os.getenv("CONFIG_DIR", default_config_dir),
            "CONFIG_DIR"
        )
        self.cache_dir = self._validate_absolute_path(
            os.getenv("CACHE_DIR", str(self.data_dir / "epg_cache")),
            "CACHE_DIR"
        )
        
        # Database
        self.db_path = self._validate_absolute_path(
            os.getenv("DB_PATH", str(self.config_dir / "app.db")),
            "DB_PATH"
        )
        
        # Server settings
        self.port = int(os.getenv("SERVICE_PORT", 9193))
        self.workers = int(os.getenv("WORKERS", 1))
        self.log_level = os.getenv("LOG_LEVEL", "INFO")
        self.timeout_download = int(os.getenv("TIMEOUT_DOWNLOAD", 120))
        self.timeout_merge = int(os.getenv("TIMEOUT_MERGE", 300))
        
        # Create directories
        self._ensure_directories()
    
    def _validate_absolute_path(self, path_str: str, env_var_name: str) -> Path:
        """Validate that a path is absolute
        
        Args:
            path_str: Path string to validate
            env_var_name: Name of environment variable (for error messages)
        
        Returns:
            Validated Path object
        
        Raises:
            ValueError: If path is not absolute
        """
        if not path_str:
            raise ValueError(f"{env_var_name} cannot be empty")
        
        path = Path(path_str)
        
        if not path.is_absolute():
            raise ValueError(
                f"{env_var_name} must be an absolute path, got: {path_str}\n"
                f"Examples: /data, /opt/epg-merge/data\n"
                f"Not relative paths like: data, ./data, ~/data"
            )
        
        return path
    
    def _ensure_directories(self) -> None:
        """Create required directories if they don't exist"""
        for directory in [
            self.data_dir,
            self.tmp_dir,
            self.current_dir,
            self.archive_dir,
            self.channels_dir,
            self.sources_dir,
            self.config_dir,
            self.cache_dir
        ]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary for inspection"""
        return {
            "environment": self.environment,
            "data_dir": str(self.data_dir),
            "tmp_dir": str(self.tmp_dir),
            "current_dir": str(self.current_dir),
            "archive_dir": str(self.archive_dir),
            "channels_dir": str(self.channels_dir),
            "sources_dir": str(self.channels_dir),
            "config_dir": str(self.config_dir),
            "cache_dir": str(self.cache_dir),
            "db_path": str(self.db_path),
            "port": self.port,
            "workers": self.workers,
            "log_level": self.log_level,
            "timeout_download": self.timeout_download,
            "timeout_merge": self.timeout_merge
        }