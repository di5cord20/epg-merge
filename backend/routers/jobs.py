"""
Scheduled job execution and monitoring endpoints (v0.4.9)
Added: /api/jobs/execute-now, /api/jobs/cancel, /api/jobs/clear-history
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from utils.logger import setup_logging

logger = setup_logging(__name__)

router = APIRouter(tags=["Scheduled Jobs"])


def init_jobs_routes(job_service):
    """Initialize jobs routes with dependencies"""
    
    @router.get("/api/jobs/history")
    async def get_job_history(limit: int = 50):
        """Get job execution history
        
        Args:
            limit: Maximum number of records (default 50)
        
        Returns:
            List of job history records
        
        Example curl:
            curl http://localhost:9193/api/jobs/history?limit=10
        """
        try:
            history = job_service.get_job_history(limit)
            logger.info(f"Retrieved {len(history)} job history records")
            return {"jobs": history, "count": len(history)}
        except Exception as e:
            logger.error(f"Error retrieving job history: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve job history")

    @router.get("/api/jobs/latest")
    async def get_latest_job():
        """Get most recent job execution record
        
        Returns:
            Latest job record or null if none
        
        Example curl:
            curl http://localhost:9193/api/jobs/latest
        """
        try:
            latest = job_service.get_latest_job()
            return {"job": latest}
        except Exception as e:
            logger.error(f"Error retrieving latest job: {e}")
            raise HTTPException(status_code=500, detail="Failed to retrieve latest job")

    @router.get("/api/jobs/status")
    async def get_job_status():
        """Get current job status and next scheduled run
        
        Returns:
            Current job status and timing information
        
        Example curl:
            curl http://localhost:9193/api/jobs/status
        """
        try:
            latest = job_service.get_latest_job()
            next_run = job_service.get_next_run_time()
            
            status = {
                "is_running": job_service.is_job_running,
                "latest_job": latest,
                "next_scheduled_run": next_run
            }
            
            return status
        except Exception as e:
            logger.error(f"Error getting job status: {e}")
            raise HTTPException(status_code=500, detail="Failed to get job status")

    @router.post("/api/jobs/execute-now")
    async def execute_merge_now():
        """Manually trigger merge execution (for testing)
        
        This endpoint allows testing the merge job outside of the scheduler.
        Useful for validating configuration before scheduling.
        
        Returns:
            Job execution result
        
        Example curl:
            curl -X POST http://localhost:9193/api/jobs/execute-now
        """
        try:
            if job_service.is_job_running:
                return {
                    "status": "already_running",
                    "message": "A merge job is already running"
                }
            
            logger.info("🚀 Manual merge execution triggered")
            
            # Execute merge and wait for completion (synchronously)
            result = await job_service.execute_scheduled_merge()
            
            logger.info(f"✅ Manual merge completed: {result.get('status')}")
            return result
        except Exception as e:
            logger.error(f"Error executing manual merge: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to execute merge: {str(e)}")

    @router.post("/api/jobs/cancel")
    async def cancel_running_job():
        """Force cancel currently running scheduled merge job
        
        WARNING: This will forcefully terminate the merge process.
        May result in incomplete or corrupted output.
        
        Returns:
            Cancellation status
        
        Example curl:
            curl -X POST http://localhost:9193/api/jobs/cancel
        """
        try:
            if not job_service.is_job_running or not job_service.current_job_task:
                return {
                    "status": "no_job",
                    "message": "No job currently running"
                }
            
            logger.warning("⚠️ Forcefully cancelling running job")
            
            # Cancel the task
            job_service.current_job_task.cancel()
            
            # Reset the running flags so scheduler can continue
            job_service.is_job_running = False
            job_service.current_job_task = None
            
            return {
                "status": "cancelled",
                "message": "Job forcefully terminated, scheduler can now run next merge",
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error cancelling job: {e}")
            raise HTTPException(status_code=500, detail="Failed to cancel job")

    @router.post("/api/jobs/clear-history")
    async def clear_job_history():
        """Delete ALL job history records
        
        WARNING: This action is irreversible. All job history will be permanently deleted.
        
        Returns:
            Number of records deleted
        
        Example curl:
            curl -X POST http://localhost:9193/api/jobs/clear-history
        """
        try:
            logger.warning("🗑️ Clear job history requested")
            deleted = job_service.clear_job_history()
            
            return {
                "status": "cleared",
                "deleted_count": deleted,
                "message": f"Deleted {deleted} job history records"
            }
        except Exception as e:
            logger.error(f"Error clearing job history: {e}")
            raise HTTPException(status_code=500, detail="Failed to clear job history")