"""
EPG Merge - Scheduled Job Service (v0.4.0)
Handles automated merge execution with cron scheduling
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from pathlib import Path
from enum import Enum
import json

from croniter import croniter
import httpx

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Job execution status"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class ScheduledJobService:
    """Manages scheduled merge jobs with cron execution"""
    
    def __init__(self, config, db, merge_service, channel_service, source_service, settings_service):
        """Initialize job service
        
        Args:
            config: Application config
            db: Database instance
            merge_service: Merge service for executing merges
            channel_service: Channel service for loading channels
            source_service: Source service for loading sources
            settings_service: Settings service for config
        """
        self.config = config
        self.db = db
        self.merge_service = merge_service
        self.channel_service = channel_service
        self.source_service = source_service
        self.settings_service = settings_service
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Job state
        self.current_job_task: Optional[asyncio.Task] = None
        self.is_job_running = False
    
    # =========================================================================
    # JOB HISTORY MANAGEMENT
    # =========================================================================
    
    def init_job_history_table(self):
        """Initialize job history table in database"""
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
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
            self.logger.info("✅ Job history table initialized")
        except Exception as e:
            self.logger.error(f"Error initializing job history table: {e}")
            raise
    
    def save_job_record(self, job_id: str, status: str, started_at: str,
                       completed_at: Optional[str] = None,
                       merge_filename: Optional[str] = None,
                       channels: Optional[int] = None,
                       programs: Optional[int] = None,
                       file_size: Optional[str] = None,
                       error_message: Optional[str] = None,
                       execution_time: Optional[float] = None) -> None:
        """Save job execution record to database
        
        Args:
            job_id: Unique job identifier
            status: Job status (pending, running, success, failed)
            started_at: ISO timestamp when job started
            completed_at: ISO timestamp when job completed
            merge_filename: Output filename if successful
            channels: Number of channels merged
            programs: Number of programs merged
            file_size: Output file size
            error_message: Error description if failed
            execution_time: Total execution time in seconds
        """
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO job_history 
                (job_id, status, started_at, completed_at, merge_filename, 
                 channels_included, programs_included, file_size, error_message, execution_time_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (job_id, status, started_at, completed_at, merge_filename, 
                  channels, programs, file_size, error_message, execution_time))
            
            conn.commit()
            self.logger.info(f"Saved job record: {job_id} - {status}")
        except Exception as e:
            self.logger.error(f"Error saving job record: {e}")
            raise
    
    def get_job_history(self, limit: int = 50) -> list:
        """Get recent job execution history
        
        Args:
            limit: Maximum number of records to return
        
        Returns:
            List of job history dictionaries
        """
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, job_id, status, started_at, completed_at, merge_filename,
                       channels_included, programs_included, file_size, error_message, 
                       execution_time_seconds
                FROM job_history
                ORDER BY started_at DESC
                LIMIT ?
            ''', (limit,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
        except Exception as e:
            self.logger.error(f"Error retrieving job history: {e}")
            return []
    
    def get_latest_job(self) -> Optional[Dict[str, Any]]:
        """Get most recent job record"""
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, job_id, status, started_at, completed_at, merge_filename,
                       channels_included, programs_included, file_size, error_message,
                       execution_time_seconds
                FROM job_history
                ORDER BY started_at DESC
                LIMIT 1
            ''')
            
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            self.logger.error(f"Error getting latest job: {e}")
            return None
    
    def cleanup_old_jobs(self, retention_days: int = 30) -> int:
        """Delete job history older than retention period
        
        Args:
            retention_days: Days to keep records
        
        Returns:
            Number of records deleted
        """
        try:
            cutoff_date = (datetime.now() - timedelta(days=retention_days)).isoformat()
            
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM job_history 
                WHERE started_at < ?
            ''', (cutoff_date,))
            
            deleted = cursor.rowcount
            conn.commit()
            
            if deleted > 0:
                self.logger.info(f"Cleaned up {deleted} old job records")
            
            return deleted
        except Exception as e:
            self.logger.error(f"Error cleaning up job history: {e}")
            return 0
    
    # =========================================================================
    # JOB EXECUTION
    # =========================================================================
    
    async def execute_scheduled_merge(self) -> Dict[str, Any]:
        """Execute merge using saved settings and sources/channels
        
        Returns:
            Dictionary with job results
        """
        job_id = f"scheduled_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.now()
        start_iso = start_time.isoformat()
        
        self.logger.info(f"🔄 Starting scheduled merge job: {job_id}")
        self.is_job_running = True
        
        try:
            # Note: Do NOT cancel self.current_job_task here - it causes a race condition
            # The task was just created in main.py and assigned to self.current_job_task
            # Cancelling it here would cancel the current job immediately
            
            # Save initial record as RUNNING
            self.save_job_record(job_id, JobStatus.RUNNING, start_iso)
            
            # Load settings
            settings = self.settings_service.get_all()
            self.logger.info(f"Loaded settings: {len(settings)} keys")
            
            selected_sources_str = settings.get('selected_sources', '[]')
            selected_channels_str = settings.get('selected_channels', '[]')
            timeframe = settings.get('selected_timeframe', '3')
            feed_type = settings.get('selected_feed_type', 'iptv')
            retention_days = int(settings.get('archive_retention', 30))
            discord_webhook = settings.get('discord_webhook', '')
            
            self.logger.info(f"  selected_sources type: {type(selected_sources_str)} = {selected_sources_str[:100]}")
            self.logger.info(f"  selected_channels type: {type(selected_channels_str)} = {selected_channels_str[:100]}")
            self.logger.info(f"  timeframe: {timeframe}")
            self.logger.info(f"  feed_type: {feed_type}")
            
            # Parse JSON from settings
            try:
                selected_sources = json.loads(selected_sources_str) if isinstance(selected_sources_str, str) else selected_sources_str
                selected_channels = json.loads(selected_channels_str) if isinstance(selected_channels_str, str) else selected_channels_str
            except (json.JSONDecodeError, TypeError) as e:
                self.logger.error(f"Error parsing JSON from settings: {e}")
                selected_sources = []
                selected_channels = []
            
            self.logger.info(f"Parsed sources: {len(selected_sources)} items")
            self.logger.info(f"Parsed channels: {len(selected_channels)} items")
            
            if not selected_sources or not selected_channels:
                raise ValueError(f"No sources or channels configured. sources={len(selected_sources)}, channels={len(selected_channels)}")
            
            self.logger.info(f"  Sources: {len(selected_sources)}")
            self.logger.info(f"  Channels: {len(selected_channels)}")
            self.logger.info(f"  Timeframe: {timeframe} days")
            
            # Execute merge
            self.logger.info(f"Executing merge...")
            merge_result = await self.merge_service.execute_merge({
                'sources': selected_sources,
                'channels': selected_channels,
                'timeframe': timeframe,
                'feed_type': feed_type
            })
            
            self.logger.info(f"Merge returned: {merge_result}")
            
            # Save as current (archives previous)
            self.logger.info(f"Saving merge as current...")
            self.merge_service.save_merge({
                'filename': merge_result['filename'],
                'channels': merge_result['channels_included'],
                'programs': merge_result['programs_included'],
                'days_included': int(timeframe)
            })
            
            # Cleanup old job records
            self.cleanup_old_jobs(retention_days)
            
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            result = {
                'status': JobStatus.SUCCESS,
                'job_id': job_id,
                'channels': merge_result['channels_included'],
                'programs': merge_result['programs_included'],
                'file_size': merge_result['file_size'],
                'execution_time': execution_time
            }
            
            # Save success record
            self.logger.info(f"Saving job success record...")
            self.save_job_record(
                job_id, JobStatus.SUCCESS, start_iso,
                completed_at=end_time.isoformat(),
                merge_filename='merged.xml.gz',
                channels=merge_result['channels_included'],
                programs=merge_result['programs_included'],
                file_size=merge_result['file_size'],
                execution_time=execution_time
            )
            
            self.logger.info(f"✅ Scheduled merge completed successfully")
            
            # Send success notification
            if discord_webhook:
                self.logger.info(f"Sending Discord notification...")
                await self._send_discord_notification(
                    webhook_url=discord_webhook,
                    job_result=result,
                    is_success=True
                )
            
            return result
            
        except asyncio.CancelledError:
            self.logger.warning("Scheduled merge job was cancelled")
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            
            self.save_job_record(
                job_id, JobStatus.FAILED, start_iso,
                completed_at=end_time.isoformat(),
                error_message="Job was cancelled",
                execution_time=execution_time
            )
            
            raise
            
        except Exception as e:
            self.logger.error(f"❌ Scheduled merge failed: {e}", exc_info=True)
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            error_msg = str(e)
            
            # Save failure record
            self.logger.info(f"Saving job failure record...")
            self.save_job_record(
                job_id, JobStatus.FAILED, start_iso,
                completed_at=end_time.isoformat(),
                error_message=error_msg,
                execution_time=execution_time
            )
            
            # Send failure notification
            try:
                settings = self.settings_service.get_all()
                discord_webhook = settings.get('discord_webhook', '')
                if discord_webhook:
                    self.logger.info(f"Sending Discord failure notification...")
                    await self._send_discord_notification(
                        webhook_url=discord_webhook,
                        error_message=error_msg,
                        is_success=False
                    )
            except Exception as notify_err:
                self.logger.error(f"Error sending failure notification: {notify_err}")
            
            return {
                'status': JobStatus.FAILED,
                'job_id': job_id,
                'error': error_msg,
                'execution_time': execution_time
            }
            
        finally:
            self.is_job_running = False
            self.current_job_task = None
            self.logger.info(f"Job service cleanup complete")
    
    # =========================================================================
    # NOTIFICATIONS
    # =========================================================================
    
    async def _send_discord_notification(self, webhook_url: str, 
                                        job_result: Optional[Dict] = None,
                                        error_message: Optional[str] = None,
                                        is_success: bool = True) -> None:
        """Send Discord notification for job completion
        
        Args:
            webhook_url: Discord webhook URL
            job_result: Merge result if successful
            error_message: Error description if failed
            is_success: Whether job succeeded
        """
        try:
            if is_success and job_result:
                embed = {
                    "title": "✅ Scheduled Merge Completed",
                    "description": "The automated EPG merge has completed successfully",
                    "color": 3066993,  # Green
                    "fields": [
                        {
                            "name": "Channels",
                            "value": str(job_result.get('channels', 0)),
                            "inline": True
                        },
                        {
                            "name": "Programs",
                            "value": str(job_result.get('programs', 0)),
                            "inline": True
                        },
                        {
                            "name": "File Size",
                            "value": job_result.get('file_size', 'N/A'),
                            "inline": True
                        },
                        {
                            "name": "Execution Time",
                            "value": f"{job_result.get('execution_time', 0):.1f}s",
                            "inline": True
                        }
                    ],
                    "timestamp": datetime.now().isoformat(),
                    "footer": {"text": "EPG Merge v0.4.0"}
                }
            else:
                embed = {
                    "title": "❌ Scheduled Merge Failed",
                    "description": "The automated EPG merge encountered an error",
                    "color": 15158332,  # Red
                    "fields": [
                        {
                            "name": "Error",
                            "value": error_message or "Unknown error",
                            "inline": False
                        }
                    ],
                    "timestamp": datetime.now().isoformat(),
                    "footer": {"text": "EPG Merge v0.4.0"}
                }
            
            payload = {
                "content": "🎬 **EPG Merge Notification**",
                "embeds": [embed]
            }
            
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(webhook_url, json=payload)
                
                if response.status_code in [200, 204]:
                    self.logger.info("✅ Discord notification sent")
                else:
                    self.logger.warning(f"Discord notification failed: HTTP {response.status_code}")
                    
        except Exception as e:
            self.logger.error(f"Error sending Discord notification: {e}")
    
    def get_next_run_time(self) -> Optional[str]:
        """Calculate next scheduled run time based on cron expression
        
        Returns:
            ISO timestamp of next run, or None if not configured
        """
        try:
            settings = self.settings_service.get_all()
            merge_time = settings.get('merge_time', '00:00')
            merge_schedule = settings.get('merge_schedule', 'daily')
            merge_days = settings.get('merge_days', '[]')
            
            # Parse time
            hours, minutes = merge_time.split(':')
            
            # Build cron expression
            if merge_schedule == 'daily':
                cron_expr = f"{minutes} {hours} * * *"
            else:  # weekly
                try:
                    days = json.loads(merge_days) if isinstance(merge_days, str) else merge_days
                    days_str = ','.join(str(int(d)) for d in days)
                except (json.JSONDecodeError, TypeError, ValueError):
                    days_str = "0,1,2,3,4,5,6"
                cron_expr = f"{minutes} {hours} * * {days_str}"
            
            # Calculate next run
            cron = croniter(cron_expr, datetime.now())
            next_run = cron.get_next(datetime)
            
            return next_run.isoformat()
        except Exception as e:
            self.logger.error(f"Error calculating next run time: {e}")
            return None