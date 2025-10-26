"""
EPG Merge Services Layer
Modular services for business logic separation
"""

import logging
import asyncio
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import httpx
import gzip
import copy
from xml.etree import ElementTree as ET

logger = logging.getLogger(__name__)


class BaseService:
    """Base service with common functionality"""
    
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(self.__class__.__name__)


class SourceService(BaseService):
    """Handles source file discovery and management"""
    
    FOLDER_MAP = {
        "3": {"iptv": "3dayiptv", "gracenote": "3daygracenote"},
        "7": {"iptv": "7dayiptv", "gracenote": "7daygracenote"},
        "14": {"iptv": "14dayiptv", "gracenote": "14daygracenote"}
    }
    
    async def fetch_sources(self, timeframe: str, feed_type: str) -> Dict[str, Any]:
        """Fetch available XML files from share.jesmann.com"""
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
        """Parse XML files from HTML"""
        import re
        
        pattern = r'href=["\']([^"\']*\.xml\.gz)["\']'
        matches = re.findall(pattern, html)
        
        if not matches:
            pattern = r'>([^<]*\.xml\.gz)<'
            matches = re.findall(pattern, html)
        
        files = []
        for match in matches:
            filename = match.split('/')[-1] if '/' in match else match
            if filename.endswith('.xml.gz'):
                files.append(filename)
        
        return files


class ChannelService(BaseService):
    """Handles channel discovery and management"""
    
    def __init__(self, config, db=None):
        super().__init__(config)
        self.db = db
    
    async def fetch_channels_from_sources(self, sources: List[str]) -> List[str]:
        """Fetch channels from source files"""
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
        """Fetch channel list for a specific country"""
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
        """Get previously selected channels from database"""
        try:
            if self.db:
                return self.db.get_selected_channels()
            return []
        except Exception as e:
            self.logger.error(f"Error getting selected channels: {e}")
            return []
    
    def save_selected_channels(self, channels: List[str]) -> None:
        """Save selected channels to database"""
        if self.db:
            self.db.save_selected_channels(channels)
            self.logger.info(f"Saved {len(channels)} channels")
    
    def export_channels(self) -> Dict[str, Any]:
        """Export channels as JSON"""
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


class MergeService(BaseService):
    """Handles XML merging logic"""
    
    def __init__(self, config, db=None):
        super().__init__(config)
        self.db = db
    
    async def execute_merge(self, data: dict) -> Dict[str, Any]:
        """Execute merge of selected sources with channel filtering"""
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
        """Download and cache source files"""
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
                    from datetime import timedelta
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
        """Merge XML files using streaming"""
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
                                key = (ch_id, elem.get('start', ''), elem.find('title').text if elem.find('title') is not None else '')
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
        """Get current live merged file info"""
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
        """Save merge and archive previous"""
        import shutil
        
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


class ArchiveService(BaseService):
    """Handles archive management"""
    
    def __init__(self, config, db=None):
        super().__init__(config)
        self.db = db
    
    def list_archives(self) -> List[Dict[str, Any]]:
        """List all archives"""
        archives = []
        
        # Current
        current = self.config.archive_dir / "merged.xml.gz"
        if current.exists():
            archives.append(self._format_archive(current, is_current=True))
        
        # Timestamped
        for file in sorted(self.config.archive_dir.glob("*.xml.gz.*"), reverse=True):
            archives.append(self._format_archive(file, is_current=False))
        
        return archives
    
    def _format_archive(self, path: Path, is_current: bool) -> Dict[str, Any]:
        """Format archive for API response"""
        stat = path.stat()
        return {
            "filename": path.name,
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "channels": "N/A",
            "programs": "N/A",
            "size": f"{stat.st_size / (1024**2):.2f}MB",
            "days_left": "∞" if is_current else "N/A",
            "is_current": is_current
        }
    
    def get_archive_path(self, filename: str) -> Path:
        """Get safe archive path"""
        # Prevent path traversal
        if ".." in filename or "/" in filename:
            raise ValueError("Invalid filename")
        
        return self.config.archive_dir / filename


class SettingsService(BaseService):
    """Handles settings persistence"""
    
    def __init__(self, db=None):
        self.db = db
    
    def get(self, key: str, default: str = "") -> str:
        """Get a setting"""
        if self.db:
            return self.db.get_setting(key, default)
        return default
    
    def set(self, key: str, value: Any) -> None:
        """Set a setting"""
        if self.db:
            self.db.set_setting(key, str(value))
    
    def get_all(self) -> Dict[str, str]:
        """Get all settings"""
        if self.db:
            return self.db.get_all_settings()
        return {}