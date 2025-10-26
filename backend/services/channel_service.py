"""
EPG Merge - Channel Service
Handles channel discovery and management
"""

from typing import List, Dict, Any
from datetime import datetime
import httpx
from config import Config
from database import Database
from .base_service import BaseService


class ChannelService(BaseService):
    """Handles channel discovery and management"""
    
    def __init__(self, config: Config, db: Database = None):
        """Initialize channel service
        
        Args:
            config: Application configuration
            db: Database instance
        """
        super().__init__(config)
        self.db = db
    
    async def fetch_channels_from_sources(self, sources: List[str]) -> List[str]:
        """Fetch channels from source files
        
        Args:
            sources: List of source filenames (country names)
        
        Returns:
            Sorted list of unique channel IDs
        """
        if not sources:
            return []
        
        unique_channels = set()
        
        for source in sources:
            source = source.strip()
            if not source or not source.endswith('.xml.gz'):
                continue
            
            country = source.replace('.xml.gz', '')
            channels = await self._fetch_channel_list(country)
            unique_channels.update(channels)
        
        return sorted(list(unique_channels))
    
    async def _fetch_channel_list(self, country: str) -> List[str]:
        """Fetch channel list for a specific country
        
        Args:
            country: Country code/name
        
        Returns:
            List of channel IDs for the country
        """
        try:
            url = f"https://share.jesmann.com/IPTV_Channel_List/{country}_channel_list.txt"
            async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    channels = [ch.strip() for ch in response.text.split('\n') if ch.strip()]
                    self.logger.info(f"Loaded {len(channels)} channels for {country}")
                    return channels
                else:
                    self.logger.warning(f"Channel list not found for {country}: HTTP {response.status_code}")
                    return []
        except Exception as e:
            self.logger.error(f"Error fetching channels for {country}: {e}")
            return []
    
    def get_selected_channels(self) -> List[str]:
        """Get previously selected channels from database
        
        Returns:
            List of selected channel IDs
        """
        try:
            if self.db:
                return self.db.get_selected_channels()
            return []
        except Exception as e:
            self.logger.error(f"Error getting selected channels: {e}")
            return []
    
    def save_selected_channels(self, channels: List[str]) -> None:
        """Save selected channels to database
        
        Args:
            channels: List of channel IDs to save
        """
        if self.db:
            self.db.save_selected_channels(channels)
            self.logger.info(f"Saved {len(channels)} channels")
    
    def export_channels(self) -> Dict[str, Any]:
        """Export channels as JSON
        
        Returns:
            Dictionary with export data and filename
        """
        channels = self.get_selected_channels()
        return {
            "status": "success",
            "data": {
                "exported_at": datetime.now().isoformat(),
                "channel_count": len(channels),
                "channels": channels
            },
            "filename": f"channels_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        }