"""
EPG Merge - Error Handling
Custom exception hierarchy for application-level error handling
"""

import logging


class AppError(Exception):
    """Base application error with HTTP status code"""
    
    def __init__(self, message: str, status_code: int = 400):
        """Initialize error with message and status code
        
        Args:
            message: Human-readable error message
            status_code: HTTP status code (default 400)
        """
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class ValidationError(AppError):
    """Input validation error (400)"""
    
    def __init__(self, message: str):
        """Initialize validation error
        
        Args:
            message: Description of what failed validation
        """
        super().__init__(message, 400)


class NotFoundError(AppError):
    """Resource not found error (404)"""
    
    def __init__(self, resource: str):
        """Initialize not found error
        
        Args:
            resource: Name of resource that was not found
        """
        super().__init__(f"{resource} not found", 404)


class ServerError(AppError):
    """Internal server error (500)"""
    
    def __init__(self, message: str):
        """Initialize server error
        
        Args:
            message: Description of the server error
        """
        super().__init__(message, 500)


def handle_exceptions(func):
    """Decorator for exception handling in async functions
    
    Catches exceptions and converts to ServerError
    """
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except AppError:
            # Re-raise application errors as-is
            raise
        except Exception as e:
            # Log and convert unexpected exceptions
            logging.error(f"Unhandled exception in {func.__name__}: {e}", exc_info=True)
            raise ServerError("Internal server error")
    return wrapper