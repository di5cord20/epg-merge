"""
EPG Merge - Structured Logging Setup
Configures logging for the application with proper formatting
"""

import logging
import os
from typing import Optional


def setup_logging(name: str, level: Optional[str] = None) -> logging.Logger:
    """Configure structured logging for a module
    
    Args:
        name: Module name (typically __name__)
        level: Log level override (DEBUG, INFO, WARNING, ERROR)
    
    Returns:
        Configured logger instance
    """
    # Get log level from environment or parameter
    env_level = os.getenv("LOG_LEVEL", "INFO")
    log_level = level or env_level
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, log_level, logging.INFO))
    
    # Add console handler with formatting if not already added
    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger