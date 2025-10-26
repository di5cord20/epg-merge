"""
EPG Merge - Input Validation Utilities
Centralized validation functions for API input
"""

from typing import List
from .errors import ValidationError


class ValidationUtils:
    """Input validation utilities"""
    
    @staticmethod
    def validate_sources(sources: List[str]) -> None:
        """Validate sources list
        
        Args:
            sources: List of source filenames
        
        Raises:
            ValidationError: If sources invalid
        """
        if not isinstance(sources, list):
            raise ValidationError("sources must be a list")
        
        if not sources:
            raise ValidationError("sources list cannot be empty")
        
        for source in sources:
            if not isinstance(source, str) or not source.endswith('.xml.gz'):
                raise ValidationError(f"Invalid source: {source}")
    
    @staticmethod
    def validate_channels(channels: List[str]) -> None:
        """Validate channels list
        
        Args:
            channels: List of channel IDs
        
        Raises:
            ValidationError: If channels invalid
        """
        if not isinstance(channels, list):
            raise ValidationError("channels must be a list")
        
        if not channels:
            raise ValidationError("channels list cannot be empty")
        
        for channel in channels:
            if not isinstance(channel, str) or not channel.strip():
                raise ValidationError(f"Invalid channel: {channel}")
    
    @staticmethod
    def validate_timeframe(timeframe: str) -> None:
        """Validate timeframe parameter
        
        Args:
            timeframe: Number of days (3, 7, or 14)
        
        Raises:
            ValidationError: If timeframe invalid
        """
        if timeframe not in ['3', '7', '14']:
            raise ValidationError("timeframe must be 3, 7, or 14")
    
    @staticmethod
    def validate_feed_type(feed_type: str) -> None:
        """Validate feed type parameter
        
        Args:
            feed_type: Type of feed (iptv or gracenote)
        
        Raises:
            ValidationError: If feed type invalid
        """
        if feed_type not in ['iptv', 'gracenote']:
            raise ValidationError("feed_type must be iptv or gracenote")