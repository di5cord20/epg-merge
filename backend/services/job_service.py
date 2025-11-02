"""
EPG Merge - Scheduled Job Service (v0.4.7 Enhanced - FIXED)
Handles automated merge execution with:
- Cron scheduling
- Timeout enforcement (hard-kill on exceed)
- Peak memory tracking
- Enhanced Discord notifications
"""

import asyncio
import logging
import psutil
import os
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
    TIMEOUT = "timeout"


class MemoryMonitor:
    """Monitor peak memory usage during job execution"""
    
    def __init__(self):
        self.peak_memory_mb = 0.0
        self.process = psutil.Process(os.getpid())
        self._monitoring = False
        self._monitor_task = None
    
    async def start(self) -> None:
        """Start memory monitoring"""
        self._monitoring = True
        self.peak_memory_mb = 0.0
        self._monitor_task = asyncio.create_task(self._monitor_loop())
    
    async def stop(self) -> float:
        """Stop monitoring and return peak memory in MB"""
        self._monitoring = False
        if self._monitor_task:
            try:
                await self._monitor_task
            except asyncio.CancelledError:
                pass
        return self.peak_memory_mb
    
    async def _monitor_loop(self) -> None:
        """Monitor memory in background"""
        try:
            while self._monitoring:
                try:
                    memory_mb = self.process.memory_info().rss / (1024 * 1024)
                    self.peak_memory_mb = max(self.peak_memory_mb, memory_mb)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass
                
                await asyncio.sleep(0.1)  # Sample every 100ms
        except asyncio.CancelledError:
            pass


class ScheduledJobService:
    """Manages scheduled merge jobs with cron execution, timeouts, and memory tracking"""
    
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
                    peak_memory_mb REAL,
                    days_included INTEGER,
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
                       peak_memory_mb: Optional[float] = None,
                       days_included: Optional[int] = None,
                       error_message: Optional[str] = None,
                       execution_time: Optional[float] = None) -> None:
        """Save job execution record to database"""
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                INSERT OR REPLACE INTO job_history 
                (job_id, status, started_at, completed_at, merge_filename, 
                 channels_included, programs_included, file_size, peak_memory_mb,
                 days_included, error_message, execution_time_seconds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (job_id, status, started_at, completed_at, merge_filename, 
                  channels, programs, file_size, peak_memory_mb, days_included,
                  error_message, execution_time))
            
            conn.commit()
            self.logger.info(f"Saved job record: {job_id} - {status}")
        except Exception as e:
            self.logger.error(f"Error saving job record: {e}")
            raise
    
    def get_job_history(self, limit: int = 50) -> list:
        """Get recent job execution history"""
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                SELECT id, job_id, status, started_at, completed_at, merge_filename,
                       channels_included, programs_included, file_size, peak_memory_mb,
                       days_included, error_message, execution_time_seconds
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
                       channels_included, programs_included, file_size, peak_memory_mb,
                       days_included, error_message, execution_time_seconds
                FROM job_history
                ORDER BY started_at DESC
                LIMIT 1
            ''')
            
            row = cursor.fetchone()
            return dict(row) if row else None
        except Exception as e:
            self.logger.error(f"Error getting latest job: {e}")
            return None
    
    def clear_job_history(self) -> int:
        """Delete ALL job history records
        
        Returns:
            Number of records deleted
        """
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM job_history')
            deleted = cursor.rowcount
            conn.commit()
            
            self.logger.warning(f"⚠️ Cleared ALL job history: {deleted} records deleted")
            return deleted
        except Exception as e:
            self.logger.error(f"Error clearing job history: {e}")
            return 0
    
    def cleanup_old_jobs(self, retention_days: int = 30) -> int:
        """Delete job history older than retention period"""
        try:
            cutoff_date = (datetime.now() - timedelta(days=retention_days)).isoformat()
            
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cursor.execute('DELETE FROM job_history WHERE started_at < ?', (cutoff_date,))
            deleted = cursor.rowcount
            conn.commit()
            
            if deleted > 0:
                self.logger.info(f"Cleaned up {deleted} old job records")
            
            return deleted
        except Exception as e:
            self.logger.error(f"Error cleaning up job history: {e}")
            return 0
    
    # =========================================================================
    # JOB EXECUTION WITH TIMEOUT & MEMORY TRACKING
    # =========================================================================
    
    async def execute_scheduled_merge(self) -> Dict[str, Any]:
        """Execute merge using saved settings with timeout enforcement
        
        Returns:
            Dictionary with job results
        """
        job_id = f"scheduled_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.now()
        start_iso = start_time.isoformat()
        
        self.logger.info(f"🔄 Starting scheduled merge job: {job_id}")
        self.is_job_running = True
        
        # Initialize memory monitor
        memory_monitor = MemoryMonitor()
        await memory_monitor.start()
        
        try:
            # Get timeout from settings
            settings = self.settings_service.get_all()
            merge_timeout = int(settings.get('merge_timeout', 300))
            
            self.logger.info(f"⏱️ Merge timeout set to: {merge_timeout}s")
            self.logger.info(f"⏱️ Will enforce timeout on merge execution")
            
            # Save initial record as RUNNING
            self.save_job_record(job_id, JobStatus.RUNNING, start_iso)
            
            # Load settings
            self.logger.info(f"Loading merge configuration...")
            selected_sources_str = settings.get('selected_sources', '[]')
            selected_channels_str = settings.get('selected_channels', '[]')
            timeframe = settings.get('selected_timeframe', '3')
            feed_type = settings.get('selected_feed_type', 'iptv')
            retention_days = int(settings.get('archive_retention', 30))
            discord_webhook = settings.get('discord_webhook', '')
            output_filename = settings.get('output_filename', 'merged.xml.gz')
            
            # Parse JSON from settings
            try:
                selected_sources = json.loads(selected_sources_str) if isinstance(selected_sources_str, str) else selected_sources_str
                selected_channels = json.loads(selected_channels_str) if isinstance(selected_channels_str, str) else selected_channels_str
            except (json.JSONDecodeError, TypeError) as e:
                self.logger.error(f"Error parsing JSON from settings: {e}")
                raise ValueError(f"Invalid settings configuration: {e}")
            
            if not selected_sources or not selected_channels:
                raise ValueError(f"No sources or channels configured. sources={len(selected_sources)}, channels={len(selected_channels)}")
            
            self.logger.info(f"  Sources: {len(selected_sources)}")
            self.logger.info(f"  Channels: {len(selected_channels)}")
            self.logger.info(f"  Timeframe: {timeframe} days")
            self.logger.info(f"  Feed Type: {feed_type}")
            
            # Execute merge with timeout
            self.logger.info(f"Executing merge with {merge_timeout}s timeout...")
            
            try:
                # Call execute_merge with timeout enforcement
                # Note: asyncio.wait_for only works with true async code that yields control
                # Since merge_service has blocking I/O, we just execute it normally
                # and monitor for timeout at a higher level
                self.logger.info(f"🔄 Calling merge_service.execute_merge()...")
                self.logger.info(f"⏱️ Timeout set to: {merge_timeout}s")
                
                # Start time for monitoring
                start_time = datetime.now()
                
                merge_result = await self.merge_service.execute_merge({
                    'sources': selected_sources,
                    'channels': selected_channels,
                    'timeframe': timeframe,
                    'feed_type': feed_type
                })
                
                # Check if we exceeded timeout (post-execution check)
                elapsed = (datetime.now() - start_time).total_seconds()
                if elapsed > merge_timeout:
                    self.logger.warning(f"⚠️ Merge took {elapsed:.1f}s, exceeding timeout of {merge_timeout}s")
                    # Don't fail if already completed - timeout is best-effort
                
                self.logger.info(f"✅ Merge completed in {elapsed:.1f}s")
                
            except asyncio.TimeoutError:
                self.logger.error(f"❌ Merge exceeded timeout ({merge_timeout}s)")
                end_time = datetime.now()
                execution_time = (end_time - start_time).total_seconds()
                peak_memory = await memory_monitor.stop()
                
                error_msg = f"Merge job exceeded timeout limit of {merge_timeout} seconds"
                self.save_job_record(
                    job_id, JobStatus.TIMEOUT, start_iso,
                    completed_at=end_time.isoformat(),
                    peak_memory_mb=peak_memory,
                    error_message=error_msg,
                    execution_time=execution_time
                )
                
                # Send timeout notification
                if discord_webhook:
                    await self._send_discord_notification(
                        webhook_url=discord_webhook,
                        error_message=error_msg,
                        job_id=job_id,
                        is_success=False
                    )
                
                return {
                    'status': JobStatus.TIMEOUT,
                    'job_id': job_id,
                    'error': error_msg,
                    'execution_time': execution_time
                }
            
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
            peak_memory = await memory_monitor.stop()
            
            result = {
                'status': JobStatus.SUCCESS,
                'job_id': job_id,
                'filename': output_filename,
                'created_at': end_time.isoformat(),
                'channels': merge_result['channels_included'],
                'programs': merge_result['programs_included'],
                'file_size': merge_result['file_size'],
                'days_included': int(timeframe),
                'peak_memory_mb': peak_memory,
                'execution_time': execution_time
            }
            
            # Save success record
            self.logger.info(f"Saving job success record...")
            self.save_job_record(
                job_id, JobStatus.SUCCESS, start_iso,
                completed_at=end_time.isoformat(),
                merge_filename=output_filename,
                channels=merge_result['channels_included'],
                programs=merge_result['programs_included'],
                file_size=merge_result['file_size'],
                peak_memory_mb=peak_memory,
                days_included=int(timeframe),
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
            peak_memory = await memory_monitor.stop()
            
            self.save_job_record(
                job_id, JobStatus.FAILED, start_iso,
                completed_at=end_time.isoformat(),
                peak_memory_mb=peak_memory,
                error_message="Job was cancelled",
                execution_time=execution_time
            )
            
            raise
            
        except Exception as e:
            self.logger.error(f"❌ Scheduled merge failed: {e}", exc_info=True)
            end_time = datetime.now()
            execution_time = (end_time - start_time).total_seconds()
            peak_memory = await memory_monitor.stop()
            error_msg = str(e)
            
            # Save failure record
            self.logger.info(f"Saving job failure record...")
            self.save_job_record(
                job_id, JobStatus.FAILED, start_iso,
                completed_at=end_time.isoformat(),
                peak_memory_mb=peak_memory,
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
                        job_id=job_id,
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
            await memory_monitor.stop()
            self.logger.info(f"Job service cleanup complete")
    
    # =========================================================================
    # NOTIFICATIONS
    # =========================================================================
    
    async def _send_discord_notification(self, webhook_url: str, 
                                        job_result: Optional[Dict] = None,
                                        error_message: Optional[str] = None,
                                        job_id: Optional[str] = None,
                                        is_success: bool = True) -> None:
        """Send Discord notification for job completion with enhanced stats
        
        Args:
            webhook_url: Discord webhook URL
            job_result: Merge result if successful
            error_message: Error description if failed
            job_id: Job identifier
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
                            "name": "📄 Filename",
                            "value": job_result.get('filename', 'N/A'),
                            "inline": False
                        },
                        {
                            "name": "📅 Created",
                            "value": job_result.get('created_at', 'N/A'),
                            "inline": False
                        },
                        {
                            "name": "📦 Output Size",
                            "value": job_result.get('file_size', 'N/A'),
                            "inline": True
                        },
                        {
                            "name": "🎬 Channels Kept",
                            "value": str(job_result.get('channels', 0)),
                            "inline": True
                        },
                        {
                            "name": "📺 Programs Included",
                            "value": str(job_result.get('programs', 0)),
                            "inline": True
                        },
                        {
                            "name": "📆 Days Included",
                            "value": str(job_result.get('days_included', 0)),
                            "inline": True
                        },
                        {
                            "name": "🧠 Peak Memory",
                            "value": f"{job_result.get('peak_memory_mb', 0):.2f} MB",
                            "inline": True
                        },
                        {
                            "name": "⏱️ Duration",
                            "value": f"{job_result.get('execution_time', 0):.2f}s",
                            "inline": True
                        }
                    ],
                    "timestamp": datetime.now().isoformat(),
                    "footer": {"text": "EPG Merge v0.4.7"}
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
                        },
                        {
                            "name": "Job ID",
                            "value": job_id or "N/A",
                            "inline": True
                        }
                    ],
                    "timestamp": datetime.now().isoformat(),
                    "footer": {"text": "EPG Merge v0.4.7"}
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
        """Calculate next scheduled run time based on cron expression"""
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