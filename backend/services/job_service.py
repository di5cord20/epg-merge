"""
EPG Merge - Scheduled Job Service (v0.4.9 Complete)
Handles automated merge execution with:
- Cron scheduling
- Timeout enforcement (hard-kill on exceed)
- Peak memory tracking
- Enhanced Discord notifications
- AUTO-RECOVERY: Detects & clears stuck jobs on startup
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
                
                await asyncio.sleep(0.1)
        except asyncio.CancelledError:
            pass


class ScheduledJobService:
    """Manages scheduled merge jobs with cron execution, timeouts, and memory tracking"""
    
    def __init__(self, config, db, merge_service, channel_service, source_service, settings_service):
        self.config = config
        self.db = db
        self.merge_service = merge_service
        self.channel_service = channel_service
        self.source_service = source_service
        self.settings_service = settings_service
        self.logger = logging.getLogger(self.__class__.__name__)
        
        self.current_job_task: Optional[asyncio.Task] = None
        self.is_job_running = False
        self.scheduler_task: Optional[asyncio.Task] = None

    def stop_scheduler(self):
        """Stop the scheduler"""
        if self.scheduler_task:
            self.scheduler_task.cancel()
            self.logger.info("✅ Scheduler stopped")
    
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
            self._cleanup_stuck_jobs()
            
        except Exception as e:
            self.logger.error(f"Error initializing job history table: {e}")
            raise
    
    def _cleanup_stuck_jobs(self, timeout_threshold_hours: int = 2) -> None:
        """Auto-detect and clean up jobs stuck in RUNNING state on startup"""
        try:
            conn = self.db._get_connection()
            cursor = conn.cursor()
            
            cutoff_time = (datetime.now() - timedelta(hours=timeout_threshold_hours)).isoformat()
            
            cursor.execute('''
                SELECT id, job_id, started_at FROM job_history 
                WHERE status = 'running' AND started_at < ?
            ''', (cutoff_time,))
            
            stuck_jobs = cursor.fetchall()
            
            if stuck_jobs:
                self.logger.warning(f"🔧 Found {len(stuck_jobs)} stuck job(s) in RUNNING state")
                
                for job in stuck_jobs:
                    job_id = job[1]
                    cursor.execute('''
                        UPDATE job_history 
                        SET status = 'failed',
                            completed_at = datetime('now'),
                            error_message = 'Auto-recovered: Job was stuck in RUNNING state'
                        WHERE job_id = ?
                    ''', (job_id,))
                    self.logger.warning(f"  ✅ Recovered {job_id}")
                
                conn.commit()
                self.logger.info(f"✅ Recovered {len(stuck_jobs)} stuck job(s)")
            else:
                self.logger.info("✅ No stuck jobs found")
                
        except Exception as e:
            self.logger.error(f"Error cleaning up stuck jobs: {e}")
    
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
            self.logger.info(f"✅ Saved job record: {job_id} - {status}")
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
        """Delete ALL job history records"""
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
                self.logger.info(f"✅ Cleaned up {deleted} old job records")
            
            return deleted
        except Exception as e:
            self.logger.error(f"Error cleaning up job history: {e}")
            return 0
    
    # =========================================================================
    # JOB EXECUTION WITH TIMEOUT & MEMORY TRACKING
    # =========================================================================
    
    async def execute_scheduled_merge(self) -> Dict[str, Any]:
        """Execute merge using saved settings with timeout enforcement"""
        job_id = f"scheduled_merge_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        start_time = datetime.now()
        start_iso = start_time.isoformat()
        
        self.logger.info(f"📋 Starting scheduled merge job: {job_id}")
        self.is_job_running = True
        
        memory_monitor = MemoryMonitor()
        await memory_monitor.start()
        
        try:
            settings = self.settings_service.get_all()
            merge_timeout = int(settings.get('merge_timeout', 300))
            
            self.logger.info(f"⏱️ Merge timeout set to: {merge_timeout}s")
            self.save_job_record(job_id, JobStatus.RUNNING, start_iso)
            
            # Load settings
            selected_sources_str = settings.get('selected_sources', '[]')
            merge_timeframe = settings.get('merge_timeframe', '3')
            merge_channels_version = settings.get('merge_channels_version', 'current')
            feed_type = settings.get('selected_feed_type', 'iptv')
            retention_days = int(settings.get('archive_retention', 30))
            discord_webhook = settings.get('discord_webhook', '')
            output_filename = settings.get('output_filename', 'merged.xml.gz')
            channels_filename = settings.get('channels_filename', 'channels.json')
            
            try:
                selected_sources = json.loads(selected_sources_str) if isinstance(selected_sources_str, str) else selected_sources_str
            except (json.JSONDecodeError, TypeError) as e:
                self.logger.error(f"Error parsing sources: {e}")
                raise ValueError(f"Invalid sources configuration: {e}")
            
            if not selected_sources:
                raise ValueError("No sources configured")
            
            self.logger.info(f"Loading channels from version: {merge_channels_version}")
            selected_channels = self._load_channels_from_file(merge_channels_version, channels_filename)
            
            if not selected_channels:
                raise ValueError(f"No channels loaded from {merge_channels_version}")
            
            self.logger.info(f"  Sources: {len(selected_sources)}")
            self.logger.info(f"  Channels: {len(selected_channels)}")
            self.logger.info(f"  Timeframe: {merge_timeframe} days")
            
            # Execute merge with timeout
            self.logger.info(f"⏳ Executing merge with {merge_timeout}s timeout...")
            
            try:
                exec_start = datetime.now()
                
                merge_result = await asyncio.wait_for(
                    self.merge_service.execute_merge({
                        'sources': selected_sources,
                        'channels': selected_channels,
                        'timeframe': merge_timeframe,
                        'feed_type': feed_type
                    }),
                    timeout=merge_timeout
                )
                
                elapsed = (datetime.now() - exec_start).total_seconds()
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
            
            self.logger.info(f"Merge returned successfully")
            
            # Save as current
            self.logger.info(f"Saving merge as current...")
            self.merge_service.save_merge({
                'filename': merge_result['filename'],
                'channels': merge_result['channels_included'],
                'programs': merge_result['programs_included'],
                'days_included': int(merge_timeframe)
            })
            
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
                'days_included': int(merge_timeframe),
                'peak_memory_mb': peak_memory,
                'execution_time': execution_time
            }
            
            self.save_job_record(
                job_id, JobStatus.SUCCESS, start_iso,
                completed_at=end_time.isoformat(),
                merge_filename=output_filename,
                channels=merge_result['channels_included'],
                programs=merge_result['programs_included'],
                file_size=merge_result['file_size'],
                peak_memory_mb=peak_memory,
                days_included=int(merge_timeframe),
                execution_time=execution_time
            )
            
            self.logger.info(f"✅ Scheduled merge completed successfully")
            
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
            
            self.save_job_record(
                job_id, JobStatus.FAILED, start_iso,
                completed_at=end_time.isoformat(),
                peak_memory_mb=peak_memory,
                error_message=error_msg,
                execution_time=execution_time
            )
            
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

    def _load_channels_from_file(self, version_name: str, channels_filename: str) -> list:
        """Load channels from a specific version file"""
        import json
        
        channels_dir = self.config.channels_dir
        channels_file = channels_dir / version_name
        
        try:
            if not channels_file.exists():
                self.logger.warning(f"Channel version file not found: {version_name}, trying fallback")
                channels_file = channels_dir / channels_filename
                if not channels_file.exists():
                    self.logger.error(f"No channel file found: {channels_file}")
                    return []
            
            with open(channels_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            channels = data.get('channels', [])
            self.logger.info(f"Loaded {len(channels)} channels from {version_name}")
            return channels
        
        except Exception as e:
            self.logger.error(f"Error loading channels from {version_name}: {e}")
            return []

    # =========================================================================
    # SCHEDULER
    # =========================================================================
    
    def start_scheduler(self):
        """Start the cron scheduler for automated merges"""
        try:
            self.logger.info("🚀 Creating scheduler background task...")
            task = asyncio.create_task(self._run_scheduler())
            self.scheduler_task = task
            self.logger.info("✅ Scheduler background task created and running")
        except Exception as e:
            self.logger.error(f"Error starting scheduler: {e}", exc_info=True)

    async def _run_scheduler(self):
        """Background scheduler loop - checks settings and runs merges on schedule"""
        self.logger.info("🚀 SCHEDULER LOOP STARTED")
        
        while True:
            try:
                # Get current settings
                settings = self.settings_service.get_all()
                
                merge_schedule = settings.get('merge_schedule', 'daily')
                merge_time = settings.get('merge_time', '00:00')
                merge_days = settings.get('merge_days', '[]')
                selected_sources = settings.get('selected_sources', '[]')
                
                # Validate sources are configured
                try:
                    sources_list = json.loads(selected_sources) if isinstance(selected_sources, str) else selected_sources
                except:
                    sources_list = []
                
                if not sources_list:
                    self.logger.warning("⚠️  No sources configured, retrying in 5 minutes")
                    await asyncio.sleep(300)
                    continue
                
                # Parse merge time (HH:MM format)
                try:
                    hours, minutes = merge_time.split(':')
                except ValueError:
                    self.logger.error(f"Invalid merge_time format: {merge_time}, retrying in 5 minutes")
                    await asyncio.sleep(300)
                    continue
                
                # Build cron expression from schedule settings
                if merge_schedule == 'daily':
                    cron_expr = f"{minutes} {hours} * * *"
                else:  # weekly
                    try:
                        days = json.loads(merge_days) if isinstance(merge_days, str) else merge_days
                        days_str = ','.join(str(int(d)) for d in days)
                    except:
                        days_str = "0,1,2,3,4,5,6"
                    cron_expr = f"{minutes} {hours} * * {days_str}"
                
                self.logger.info(f"📅 Cron expression: {cron_expr}")
                
                # Calculate next scheduled run time
                from croniter import croniter
                cron = croniter(cron_expr, datetime.now())
                next_run = cron.get_next(datetime)
                seconds_until = (next_run - datetime.now()).total_seconds()
                
                self.logger.info(f"⏱️  Next scheduled run: {next_run.strftime('%Y-%m-%d %H:%M:%S')} ({seconds_until:.0f}s from now)")
                
                # Check if another job is already running
                if self.is_job_running:
                    self.logger.warning("⚠️  Previous merge job still running, checking again in 30s")
                    await asyncio.sleep(30)
                    continue
                
                # Sleep until the scheduled time (check every 60s in case settings change)
                self.logger.info(f"😴 Sleeping until scheduled time (checking every 60s for setting changes)...")
                sleep_remaining = seconds_until
                check_interval = 60  # Check every 60 seconds
                
                while sleep_remaining > 0:
                    sleep_chunk = min(check_interval, sleep_remaining)
                    await asyncio.sleep(sleep_chunk)
                    sleep_remaining -= sleep_chunk
                    
                    # Check if settings changed (merge_time or merge_schedule)
                    if sleep_remaining > 0:
                        current_settings = self.settings_service.get_all()
                        new_merge_time = current_settings.get('merge_time', merge_time)
                        new_merge_schedule = current_settings.get('merge_schedule', merge_schedule)
                        
                        if new_merge_time != merge_time or new_merge_schedule != merge_schedule:
                            self.logger.info(f"⏰ Schedule changed! Recalculating...")
                            break  # Exit sleep loop to recalculate
                
                # Final check: ensure we're not already running a job
                if self.is_job_running:
                    self.logger.warning("⚠️  Job became running during wait, skipping this execution")
                    continue
                
                # EXECUTE MERGE at scheduled time
                self.logger.info("▶️  ===== EXECUTING SCHEDULED MERGE =====")
                result = await self.execute_scheduled_merge()
                self.logger.info(f"▶️  ===== MERGE COMPLETE: {result.get('status', 'UNKNOWN')} =====")
                
            except asyncio.CancelledError:
                self.logger.info("Scheduler cancelled - shutting down")
                break
            except Exception as e:
                self.logger.error(f"Scheduler error: {e}", exc_info=True)
                self.logger.info("Waiting 60s before retrying scheduler...")
                await asyncio.sleep(60)

    # =========================================================================
    # NOTIFICATIONS
    # =========================================================================
    
    async def _send_discord_notification(self, webhook_url: str, 
                                        job_result: Optional[Dict] = None,
                                        error_message: Optional[str] = None,
                                        job_id: Optional[str] = None,
                                        is_success: bool = True) -> None:
        """Send Discord notification"""
        try:
            if is_success and job_result:
                embed = {
                    "title": "✅ Scheduled Merge Completed",
                    "description": "The automated EPG merge has completed successfully",
                    "color": 3066993,
                    "fields": [
                        {"name": "📋 Filename", "value": job_result.get('filename', 'N/A'), "inline": False},
                        {"name": "📅 Created", "value": job_result.get('created_at', 'N/A'), "inline": False},
                        {"name": "📦 Size", "value": job_result.get('file_size', 'N/A'), "inline": True},
                        {"name": "🎬 Channels", "value": str(job_result.get('channels', 0)), "inline": True},
                        {"name": "📺 Programs", "value": str(job_result.get('programs', 0)), "inline": True},
                        {"name": "📆 Days", "value": str(job_result.get('days_included', 0)), "inline": True},
                        {"name": "🧠 Memory", "value": f"{job_result.get('peak_memory_mb', 0):.2f} MB", "inline": True},
                        {"name": "⏱️ Duration", "value": f"{job_result.get('execution_time', 0):.2f}s", "inline": True}
                    ],
                    "timestamp": datetime.now().isoformat(),
                    "footer": {"text": "EPG Merge v0.4.9"}
                }
            else:
                embed = {
                    "title": "❌ Scheduled Merge Failed",
                    "description": "The automated EPG merge encountered an error",
                    "color": 15158332,
                    "fields": [
                        {"name": "Error", "value": error_message or "Unknown error", "inline": False},
                        {"name": "Job ID", "value": job_id or "N/A", "inline": True}
                    ],
                    "timestamp": datetime.now().isoformat(),
                    "footer": {"text": "EPG Merge v0.4.9"}
                }
            
            payload = {"content": "🎬 **EPG Merge Notification**", "embeds": [embed]}
            
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(webhook_url, json=payload)
                if response.status_code in [200, 204]:
                    self.logger.info("✅ Discord notification sent")
                else:
                    self.logger.warning(f"Discord notification failed: HTTP {response.status_code}")
                    
        except Exception as e:
            self.logger.error(f"Error sending Discord notification: {e}")
    
    def get_next_run_time(self) -> Optional[str]:
        """Calculate next scheduled run time"""
        try:
            settings = self.settings_service.get_all()
            merge_time = settings.get('merge_time', '00:00')
            merge_schedule = settings.get('merge_schedule', 'daily')
            merge_days = settings.get('merge_days', '[]')
            
            hours, minutes = merge_time.split(':')
            
            if merge_schedule == 'daily':
                cron_expr = f"{minutes} {hours} * * *"
            else:
                try:
                    days = json.loads(merge_days) if isinstance(merge_days, str) else merge_days
                    days_str = ','.join(str(int(d)) for d in days)
                except:
                    days_str = "0,1,2,3,4,5,6"
                cron_expr = f"{minutes} {hours} * * {days_str}"
            
            cron = croniter(cron_expr, datetime.now())
            next_run = cron.get_next(datetime)
            
            return next_run.isoformat()
        except Exception as e:
            self.logger.error(f"Error calculating next run time: {e}")
            return None