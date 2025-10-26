"""
EPG Merge - Source Service
Handles source file discovery and management
"""

import logging
import re
from typing import List, Dict, Any
import httpx
from config import Config
from .base_service import BaseService


class SourceService(BaseService):
    """Handles source file discovery and management"""
    
    FOLDER_MAP = {
        "3": {"iptv": "3dayiptv", "gracenote": "3daygracenote"},
        "7": {"iptv": "7dayiptv", "gracenote": "7daygracenote"},
        "14": {"iptv": "14dayiptv", "gracenote": "14daygracenote"}
    }
    
    def __init__(self, config: Config):
        """Initialize source service
        
        Args:
            config: Application configuration
        """
        super().__init__(config)
    
    async def fetch_sources(self, timeframe: str, feed_type: str) -> Dict[str, Any]:
        """Fetch available XML files from share.jesmann.com
        
        Args:
            timeframe: Days (3, 7, or 14)
            feed_type: Type (iptv or gracenote)
        
        Returns:
            Dictionary with sources list and metadata
        
        Raises:
            Exception: If fetch fails
        """
        try:
            folder = self.FOLDER_MAP.get(timeframe, {}).get(feed_type, "3dayiptv")
            url = f"https://share.jesmann.com/{folder}/"
            
            self.logger.info(f"Fetching from: {url}")
            
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True, verify=False) as client:
                response = await client.get(url)
                response.raise_for_status()
                
                files = self._parse_xml_files(response.text)
                unique_files = sorted(list(set(files)))
                
                self.logger.info(f"Found {len(unique_files)} unique files")
                
                return {
                    "sources": unique_files,
                    "total": len(unique_files),
                    "folder": folder,
                    "url": url
                }
        except httpx.RequestError as e:
            self.logger.error(f"Network error: {e}")
            raise
        except Exception as e:
            self.logger.error(f"Error fetching sources: {e}")
            raise
    
    def _parse_xml_files(self, html: str) -> List[str]:
        """Parse XML files from HTML
        
        Args:
            html: HTML content to parse
        
        Returns:
            List of XML filenames
        """
        # Try href pattern first
        pattern = r'href=["\']([^"\']*\.xml\.gz)["\']'
        matches = re.findall(pattern, html)
        
        # Fall back to bracket pattern if no matches
        if not matches:
            pattern = r'>([^<]*\.xml\.gz)<'
            matches = re.findall(pattern, html)
        
        files = []
        for match in matches:
            filename = match.split('/')[-1] if '/' in match else match
            if filename.endswith('.xml.gz'):
                files.append(filename)
        
        return files