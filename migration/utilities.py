"""
EPG Merge - Configuration, Logging, Database, and Utilities
"""

import logging
import sqlite3
import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
import os
from functools import lru_cache


# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Application configuration with environment-based overrides"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "production")
        self.config_dir = Path(os.getenv("CONFIG_DIR", "/config"))
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
        """Create required directories"""
        for directory in [self.config_dir, self.archive_dir, self.cache_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert config to dictionary"""
        return {
            "environment": self.environment,
            "config_dir": str(self.config_dir),
            "archive_dir": str(self.archive_dir),
            "cache_dir": str(self.cache_dir),
            "db_path": str(self.db_path),
            "port": self.port,
            "workers": self.workers,
            "log_level": self.log_level
        }


# ============================================================================
# LOGGING
# ============================================================================

def setup_logging(name: str, level: Optional[str] = None) -> logging.Logger:
    """Configure structured logging"""
    config = Config()
    log_level = level or config.log_level
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    
    # Console handler with formatting
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger


# ============================================================================
# DATABASE
# ============================================================================

class Database:
    """SQLite database wrapper with connection pooling"""
    
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.logger = logging.getLogger(self.__class__.__name__)
        self._connection = None
    
    def _get_connection(self) -> sqlite3.Connection:
        """Get or create database connection"""
        if self._connection is None:
            self._connection = sqlite3.connect(str(self.db_path))
            self._connection.row_factory = sqlite3.Row
        return self._connection
    
    def initialize(self) -> None:
        """Initialize database schema"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Channels table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS channels_selected (
                    channel_name TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Settings table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Archives table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS archives (
                    filename TEXT PRIMARY KEY,
                    created_at TIMESTAMP,
                    channels INTEGER,
                    programs INTEGER,
                    days_included INTEGER,
                    size_bytes INTEGER
                )
            ''')
            
            # Schema version
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS schema_version (
                    version INTEGER PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            conn.commit()
            self.logger.info("✅ Database schema initialized")
        except Exception as e:
            self.logger.error(f"Failed to initialize database: {e}")
            raise
    
    def health_check(self) -> bool:
        """Check database health"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            return True
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return False
    
    def get_table_count(self) -> int:
        """Get count of tables in database"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
            )
            return cursor.fetchone()[0]
        except Exception as e:
            self.logger.error(f"Error getting table count: {e}")
            return 0
    
    # ========== CHANNELS ==========
    
    def get_selected_channels(self) -> List[str]:
        """Get all selected channels"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT channel_name FROM channels_selected ORDER BY channel_name")
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error(f"Error getting channels: {e}")
            return []
    
    def save_selected_channels(self, channels: List[str]) -> None:
        """Save selected channels"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM channels_selected")
            for channel in channels:
                cursor.execute(
                    "INSERT INTO channels_selected (channel_name) VALUES (?)",
                    (channel,)
                )
            
            conn.commit()
            self.logger.info(f"Saved {len(channels)} channels")
        except Exception as e:
            self.logger.error(f"Error saving channels: {e}")
            raise
    
    # ========== SETTINGS ==========
    
    def get_setting(self, key: str, default: str = "") -> str:
        """Get a setting by key"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row[0] if row else default
        except Exception as e:
            self.logger.error(f"Error getting setting {key}: {e}")
            return default
    
    def set_setting(self, key: str, value: str) -> None:
        """Set a setting"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                (key, value)
            )
            conn.commit()
        except Exception as e:
            self.logger.error(f"Error setting {key}: {e}")
            raise
    
    def get_all_settings(self) -> Dict[str, str]:
        """Get all settings"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings")
            return {row[0]: row[1] for row in cursor.fetchall()}
        except Exception as e:
            self.logger.error(f"Error getting all settings: {e}")
            return {}
    
    # ========== ARCHIVES ==========
    
    def get_archive(self, filename: str) -> Optional[Dict[str, Any]]:
        """Get archive metadata"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM archives WHERE filename = ?",
                (filename,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            self.logger.error(f"Error getting archive {filename}: {e}")
            return None
    
    def save_archive(self, filename: str, channels: int, programs: int, days: int, size: int) -> None:
        """Save archive metadata"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT OR REPLACE INTO archives 
                   (filename, created_at, channels, programs, days_included, size_bytes)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (filename, datetime.now().isoformat(), channels, programs, days, size)
            )
            conn.commit()
        except Exception as e:
            self.logger.error(f"Error saving archive {filename}: {e}")
            raise
    
    def close(self) -> None:
        """Close database connection"""
        if self._connection:
            self._connection.close()
            self._connection = None
            self.logger.info("Database connection closed")


# ============================================================================
# ERROR HANDLING
# ============================================================================

class AppError(Exception):
    """Custom application error"""
    
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(AppError):
    """Validation error"""
    
    def __init__(self, message: str):
        super().__init__(message, 400)


class NotFoundError(AppError):
    """Resource not found error"""
    
    def __init__(self, resource: str):
        super().__init__(f"{resource} not found", 404)


class ServerError(AppError):
    """Server error"""
    
    def __init__(self, message: str):
        super().__init__(message, 500)


def handle_exceptions(func):
    """Decorator for exception handling"""
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except AppError:
            raise
        except Exception as e:
            logging.error(f"Unhandled exception in {func.__name__}: {e}", exc_info=True)
            raise ServerError("Internal server error")
    return wrapper


# ============================================================================
# UTILITIES
# ============================================================================

class FileUtils:
    """File system utilities"""
    
    @staticmethod
    def safe_filename(filename: str) -> str:
        """Sanitize filename"""
        import re
        # Remove path separators and invalid characters
        filename = re.sub(r'[../\\]', '', filename)
        filename = re.sub(r'[<>:"|?*]', '', filename)
        return filename or "file"
    
    @staticmethod
    def get_file_size(path: Path) -> str:
        """Get human-readable file size"""
        if not path.exists():
            return "0B"
        
        size = path.stat().st_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f"{size:.2f}{unit}"
            size /= 1024.0
        
        return f"{size:.2f}TB"
    
    @staticmethod
    def cleanup_cache(cache_dir: Path, max_age_hours: int = 24) -> int:
        """Clean up old cache files"""
        from datetime import timedelta
        
        deleted = 0
        now = datetime.now()
        
        for file in cache_dir.glob("*"):
            if file.is_file():
                age = now - datetime.fromtimestamp(file.stat().st_mtime)
                if age > timedelta(hours=max_age_hours):
                    file.unlink()
                    deleted += 1
        
        return deleted


class ValidationUtils:
    """Input validation utilities"""
    
    @staticmethod
    def validate_sources(sources: List[str]) -> None:
        """Validate sources list"""
        if not isinstance(sources, list):
            raise ValidationError("sources must be a list")
        
        if not sources:
            raise ValidationError("sources list cannot be empty")
        
        for source in sources:
            if not isinstance(source, str) or not source.endswith('.xml.gz'):
                raise ValidationError(f"Invalid source: {source}")
    
    @staticmethod
    def validate_channels(channels: List[str]) -> None:
        """Validate channels list"""
        if not isinstance(channels, list):
            raise ValidationError("channels must be a list")
        
        if not channels:
            raise ValidationError("channels list cannot be empty")
        
        for channel in channels:
            if not isinstance(channel, str) or not channel.strip():
                raise ValidationError(f"Invalid channel: {channel}")
    
    @staticmethod
    def validate_timeframe(timeframe: str) -> None:
        """Validate timeframe"""
        if timeframe not in ['3', '7', '14']:
            raise ValidationError("timeframe must be 3, 7, or 14")
    
    @staticmethod
    def validate_feed_type(feed_type: str) -> None:
        """Validate feed type"""
        if feed_type not in ['iptv', 'gracenote']:
            raise ValidationError("feed_type must be iptv or gracenote")