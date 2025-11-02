"""
FastAPI routers for EPG Merge Application
Each router handles a specific feature area
"""

from . import health
from . import sources
from . import channels
from . import merge
from . import archives
from . import settings
from . import jobs

__all__ = [
    "health",
    "sources", 
    "channels",
    "merge",
    "archives",
    "settings",
    "jobs",
]