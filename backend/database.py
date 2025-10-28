"""
EPG Merge Application - Database Layer
SQLite database wrapper with connection management and schema initialization
"""

import logging
import sqlite3
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime


class Database:
    """SQLite database wrapper with connection management"""
    
    def __init__(self, db_path: Path):
        """Initialize database with path"""
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
    
    def delete_archive(self, filename: str) -> None:
        """Delete archive metadata from database"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("DELETE FROM archives WHERE filename = ?", (filename,))
            conn.commit()
            self.logger.info(f"Deleted archive metadata: {filename}")
        except Exception as e:
            self.logger.error(f"Error deleting archive {filename}: {e}")
            raise

    def close(self) -> None:
        """Close database connection"""
        if self._connection:
            self._connection.close()
            self._connection = None
            self.logger.info("Database connection closed")