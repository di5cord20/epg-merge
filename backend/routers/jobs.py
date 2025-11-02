"""
Scheduled job execution and monitoring endpoints
"""

from fastapi import APIRouter, HTTPException
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

    @router.post("/api/jobs/cancel")
    async def cancel_running_job():
        """Cancel currently running scheduled merge job
        
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
            
            logger.warning("Cancelling running job")
            job_service.current_job_task.cancel()
            
            return {
                "status": "cancelled",
                "message": "Job cancellation requested"
            }
        except Exception as e:
            logger.error(f"Error cancelling job: {e}")
            raise HTTPException(status_code=500, detail="Failed to cancel job")