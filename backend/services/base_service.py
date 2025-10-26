"""
EPG Merge - Base Service
Parent class for all services with common functionality
"""

import logging
from config import Config


class BaseService:
    """Base service with common functionality"""
    
    def __init__(self, config: Config):
        """Initialize service with config
        
        Args:
            config: Application configuration instance
        """
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)