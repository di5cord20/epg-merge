"""
EPG Merge - Merge Service
Handles XML merging logic and file processing
"""

import gzip
import copy
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime, timedelta
from xml.etree import ElementTree as ET
import httpx
import shutil

from config import Config
from database import Database
from .base_service import BaseService


class MergeService(BaseService):
    """Handles XML merging logic"""
    
    def __init__(self, config: Config, db: Database = None):
        """Initialize merge service
        
        Args:
            config: Application configuration
            db: Database instance
        """
        super().__init__(config)
        self.db = db
    
    async def execute_merge(self, data: dict) -> Dict[str, Any]:
        """Execute merge of selected sources with channel filtering
        
        Args:
            data: Dictionary with sources, channels, output_filename, timeframe, feed_type
        
        Returns:
            Dictionary with merge results
        
        Raises:
            ValueError: If sources or channels are empty
            Exception: If merge fails
        """
        try:
            sources = data.get('sources', [])
            channels = data.get('channels', [])
            output_filename = data.get('output_filename', 'merged.xml.gz')
            timeframe = data.get('timeframe', '3')
            feed_type = data.get('feed_type', 'iptv')
            
            if not sources or not channels:
                raise ValueError("Sources and channels required")
            
            self.logger.info(f"Starting merge: {len(sources)} sources, {len(channels)} channels")
            
            # Download files
            downloaded_files = await self._download_sources(sources, timeframe, feed_type)
            if not downloaded_files:
                raise Exception("No files downloaded successfully")
            
            # Merge XML
            result = await self._merge_xml_files(downloaded_files, channels, output_filename)
            
            self.logger.info(f"Merge complete: {result['channels_included']} channels, {result['programs_included']} programs")
            return result
        
        except Exception as e:
            self.logger.error(f"Merge error: {e}", exc_info=True)
            raise
    
    async def _download_sources(self, sources: List[str], timeframe: str, feed_type: str) -> List[str]:
        """Download and cache source files
        
        Args:
            sources: List of source filenames
            timeframe: Days (3, 7, or 14)
            feed_type: Feed type (iptv or gracenote)
        
        Returns:
            List of downloaded file paths
        """
        folder_map = {
            "3": {"iptv": "3dayiptv", "gracenote": "3daygracenote"},
            "7": {"iptv": "7dayiptv", "gracenote": "7daygracenote"},
            "14": {"iptv": "14dayiptv", "gracenote": "14daygracenote"}
        }
        folder = folder_map.get(timeframe, {}).get(feed_type, "3dayiptv")
        base_url = f"https://share.jesmann.com/{folder}"
        
        downloaded = []
        for source in sources:
            try:
                cache_file = self.config.cache_dir / source
                
                # Check cache validity (24 hours)
                if cache_file.exists():
                    age = datetime.now() - datetime.fromtimestamp(cache_file.stat().st_mtime)
                    if age < timedelta(hours=24):
                        self.logger.info(f"Using cache for {source}")
                        downloaded.append(str(cache_file))
                        continue
                
                # Download
                url = f"{base_url}/{source}"
                self.logger.info(f"Downloading: {url}")
                
                async with httpx.AsyncClient(timeout=120.0, verify=False) as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        cache_file.write_bytes(response.content)
                        downloaded.append(str(cache_file))
                        self.logger.info(f"Cached: {source}")
            except Exception as e:
                self.logger.error(f"Error downloading {source}: {e}")
        
        return downloaded
    
    async def _merge_xml_files(self, files: List[str], channels: List[str], output_filename: str) -> Dict[str, Any]:
        """Merge XML files using streaming
        
        Args:
            files: List of gzipped XML file paths
            channels: List of channel IDs to filter
            output_filename: Output filename
        
        Returns:
            Dictionary with merge statistics
        """
        merged_root = ET.Element("tv")
        channels_seen = set()
        programmes_seen = set()
        keep_channels = set(channels)
        
        for filepath in files:
            try:
                self.logger.info(f"Parsing {filepath}")
                
                if filepath.endswith('.gz'):
                    f = gzip.open(filepath, 'rt', encoding='utf-8', errors='ignore')
                else:
                    f = open(filepath, 'rt', encoding='utf-8', errors='ignore')
                
                with f:
                    for event, elem in ET.iterparse(f, events=('end',)):
                        if elem.tag == 'channel':
                            ch_id = elem.get('id')
                            if ch_id in keep_channels and ch_id not in channels_seen:
                                merged_root.append(copy.deepcopy(elem))
                                channels_seen.add(ch_id)
                            elem.clear()
                        
                        elif elem.tag == 'programme':
                            ch_id = elem.get('channel')
                            if ch_id in channels_seen:
                                title_elem = elem.find('title')
                                title = title_elem.text if title_elem is not None else ''
                                key = (ch_id, elem.get('start', ''), title)
                                if key not in programmes_seen:
                                    merged_root.append(copy.deepcopy(elem))
                                    programmes_seen.add(key)
                            elem.clear()
            
            except Exception as e:
                self.logger.error(f"Error parsing {filepath}: {e}")
        
        # Write output
        output_path = self.config.archive_dir / output_filename
        xml_bytes = ET.tostring(merged_root, encoding='utf-8', xml_declaration=True)
        with gzip.open(output_path, 'wb') as f:
            f.write(xml_bytes)
        
        file_size = output_path.stat().st_size
        
        return {
            "status": "success",
            "filename": output_filename,
            "channels_included": len(channels_seen),
            "programs_included": len(programmes_seen),
            "file_size": f"{file_size / (1024**2):.2f}MB"
        }
    
    def get_current_merge_info(self) -> Dict[str, Any]:
        """Get current live merged file info
        
        Returns:
            Dictionary with file information
        """
        current = self.config.archive_dir / "merged.xml.gz"
        if current.exists():
            stat = current.stat()
            return {
                "filename": "merged.xml.gz",
                "exists": True,
                "size": f"{stat.st_size / (1024**2):.2f}MB",
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
        return {"filename": "merged.xml.gz", "exists": False}
    
    def save_merge(self, data: dict) -> Dict[str, Any]:
        """Save merge and archive previous version
        
        Args:
            data: Dictionary with filename to save
        
        Returns:
            Status message
        """
        filename = data.get('filename', 'merged.xml.gz')
        merged_path = self.config.archive_dir / filename
        
        if not merged_path.exists():
            raise FileNotFoundError(f"File {filename} not found")
        
        # Archive previous if exists
        current = self.config.archive_dir / "merged.xml.gz"
        if current.exists() and current != merged_path:
            timestamp = datetime.fromtimestamp(current.stat().st_mtime).strftime("%Y%m%d_%H%M%S")
            archive_path = self.config.archive_dir / f"merged.xml.gz.{timestamp}"
            shutil.move(str(current), str(archive_path))
            self.logger.info(f"Archived: {archive_path}")
        
        # Copy if different name
        if filename != "merged.xml.gz":
            shutil.copy2(str(merged_path), str(current))
        
        return {"status": "success", "message": "Merge saved", "current_file": "merged.xml.gz"}