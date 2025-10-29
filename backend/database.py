"""
EPG Merge Application - Database Layer (Refactored v0.4.1)
Simplified persistence with SQLite as single source of truth
- Removed redundant methods
- Cleaner schema
- Better error handling
"""

import logging
import sqlite3
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime


class Database:
    """SQLite database wrapper - simplified and efficient"""
    
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
            
            # Channels table - selected channels persist here
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS channels_selected (
                    channel_name TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Settings table - all configuration stored here
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Archives table - metadata for all merged files
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
            
            # Job history table - scheduled merge execution records
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS job_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT UNIQUE NOT NULL,
                    status TEXT NOT NULL,
                    started_at TIMESTAMP NOT NULL,
                    completed_at TIMESTAMP,
                    merge_filename TEXT,
                    channels_included INTEGER,
                    programs_included INTEGER,
                    file_size TEXT,
                    error_message TEXT,
                    execution_time_seconds REAL
                )
            ''')
            
            conn.commit()
            self.logger.info("✅ Database schema initialized")
        except Exception as e:
            self.logger.error(f"Failed to initialize database: {e}")
            raise
    
    def health_check(self) -> bool:
        """Check database connectivity and integrity"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            return True
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return False
    
    # ========== CHANNELS ==========
    
    def get_selected_channels(self) -> List[str]:
        """Get all selected channels from database"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT channel_name FROM channels_selected ORDER BY channel_name")
            return [row[0] for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error(f"Error getting channels: {e}")
            return []
    
    def save_selected_channels(self, channels: List[str]) -> None:
        """Replace all selected channels (atomic operation)"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            
            # Clear and reload
            cursor.execute("DELETE FROM channels_selected")
            for channel in channels:
                cursor.execute(
                    "INSERT INTO channels_selected (channel_name) VALUES (?)",
                    (channel,)
                )
            
            conn.commit()
            self.logger.info(f"Saved {len(channels)} channels to database")
        except Exception as e:
            self.logger.error(f"Error saving channels: {e}")
            raise
    
    # ========== SETTINGS ==========
    
    def get_setting(self, key: str, default: str = "") -> str:
        """Get single setting by key"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row[0] if row else default
        except Exception as e:
            self.logger.error(f"Error getting setting '{key}': {e}")
            return default
    
    def set_setting(self, key: str, value: str) -> None:
        """Set or update a single setting (atomic)"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
                (key, str(value), datetime.now().isoformat())
            )
            conn.commit()
            self.logger.debug(f"Set setting '{key}'")
        except Exception as e:
            self.logger.error(f"Error setting '{key}': {e}")
            raise
    
    def get_all_settings(self) -> Dict[str, str]:
        """Get all settings as dictionary"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings")
            return {row[0]: row[1] for row in cursor.fetchall()}
        except Exception as e:
            self.logger.error(f"Error getting all settings: {e}")
            return {}
    
    def batch_set_settings(self, settings: Dict[str, str]) -> None:
        """Set multiple settings atomically"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            now = datetime.now().isoformat()
            
            for key, value in settings.items():
                cursor.execute(
                    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
                    (key, str(value), now)
                )
            
            conn.commit()
            self.logger.info(f"Batch saved {len(settings)} settings")
        except Exception as e:
            self.logger.error(f"Error in batch_set_settings: {e}")
            raise
    
    # ========== ARCHIVES ==========
    
    def get_archive(self, filename: str) -> Optional[Dict[str, Any]]:
        """Get archive metadata by filename"""
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
            self.logger.error(f"Error getting archive '{filename}': {e}")
            return None
    
    def save_archive(self, filename: str, channels: int, programs: int, 
                     days_included: int, size_bytes: int) -> None:
        """Save or update archive metadata"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT OR REPLACE INTO archives 
                   (filename, created_at, channels, programs, days_included, size_bytes)
                   VALUES (?, ?, ?, ?, ?, ?)''',
                (filename, datetime.now().isoformat(), channels, programs, days_included, size_bytes)
            )
            conn.commit()
            self.logger.debug(f"Saved archive metadata: {filename}")
        except Exception as e:
            self.logger.error(f"Error saving archive '{filename}': {e}")
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
            self.logger.error(f"Error deleting archive '{filename}': {e}")
            raise
    
    # ========== JOB HISTORY ==========
    
    def save_job(self, job_id: str, status: str, started_at: str,
                 completed_at: Optional[str] = None,
                 merge_filename: Optional[str] = None,
                 channels: Optional[int] = None,
                 programs: Optional[int] = None,
                 file_size: Optional[str] = None,
                 error_message: Optional[str] = None,
                 execution_time: Optional[float] = None) -> None:
        """Save job execution record"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                '''INSERT OR REPLACE INTO job_history 
                   (job_id, status, started_at, completed_at, merge_filename, 
                    channels_included, programs_included, file_size, error_message, execution_time_seconds)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (job_id, status, started_at, completed_at, merge_filename, 
                 channels, programs, file_size, error_message, execution_time)
            )
            conn.commit()
            self.logger.debug(f"Saved job record: {job_id}")
        except Exception as e:
            self.logger.error(f"Error saving job '{job_id}': {e}")
            raise
    
    def get_job_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent job execution history"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                '''SELECT * FROM job_history 
                   ORDER BY started_at DESC LIMIT ?''',
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            self.logger.error(f"Error getting job history: {e}")
            return []
    
    def get_latest_job(self) -> Optional[Dict[str, Any]]:
        """Get most recent job execution"""
        try:
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                '''SELECT * FROM job_history 
                   ORDER BY started_at DESC LIMIT 1'''
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            self.logger.error(f"Error getting latest job: {e}")
            return None
    
    def cleanup_old_jobs(self, days: int = 30) -> int:
        """Delete job history older than specified days"""
        try:
            cutoff_date = (datetime.now() - 
                          __import__('datetime').timedelta(days=days)).isoformat()
            
            conn = self._get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "DELETE FROM job_history WHERE started_at < ?",
                (cutoff_date,)
            )
            deleted = cursor.rowcount
            conn.commit()
            
            if deleted > 0:
                self.logger.info(f"Cleaned up {deleted} old job records")
            
            return deleted
        except Exception as e:
            self.logger.error(f"Error cleaning job history: {e}")
            return 0
    
    def close(self) -> None:
        """Close database connection"""
        if self._connection:
            self._connection.close()
            self._connection = None
            self.logger.info("Database connection closed")