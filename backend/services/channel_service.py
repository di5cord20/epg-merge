"""
EPG Merge - Channel Service (v0.4.8)
Handles channel discovery and management with versioning
"""

from typing import List, Dict, Any
from datetime import datetime
import httpx
import shutil
import json
from pathlib import Path
from config import Config
from database import Database
from .base_service import BaseService


class ChannelService(BaseService):
    """Handles channel discovery and management with versioning"""
    
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
    
    def save_selected_channels(self, channels: List[str], sources_count: int = 0) -> Dict[str, Any]:
        """Save selected channels with versioning
        
        Args:
            channels: List of channel IDs to save
            sources_count: Number of sources used (for metadata)
        
        Returns:
            Dictionary with save status
        """
        from services.settings_service import SettingsService
        
        # Get configured channels filename
        settings_service = SettingsService(self.db)
        channels_filename = settings_service.get_channels_filename()
        
        # Ensure channels directory exists
        channels_dir = self.config.channels_dir
        channels_dir.mkdir(parents=True, exist_ok=True)
        
        # Current channels file path
        current_path = channels_dir / channels_filename
        
        self.logger.info(f"💾 Saving channels: {channels_filename}")
        self.logger.info(f"   Source: Current selection")
        self.logger.info(f"   Target: /data/channels/{channels_filename}")
        
        # STEP 1: Archive existing channels version if it exists
        if current_path.exists():
            self.logger.info(f"📦 Archiving previous version...")
            creation_time = datetime.fromtimestamp(current_path.stat().st_mtime)
            timestamp = creation_time.strftime("%Y%m%d_%H%M%S")
            
            # For channels, we keep the full filename with timestamp
            archived_name = f"{channels_filename}.{timestamp}"
            archive_path = channels_dir / archived_name
            
            self.logger.info(f"   Archiving: {channels_filename} → {archived_name}")
            
            # Move to archive with timestamp
            shutil.move(str(current_path), str(archive_path))
            
            # Save metadata for archived version
            try:
                if self.db:
                    archive_data = self.db.get_channel_version(channels_filename)
                    if archive_data:
                        archive_sources = archive_data.get('sources_count', 0)
                        archive_channels_cnt = archive_data.get('channels_count', 0)
                    else:
                        archive_sources = 0
                        archive_channels_cnt = 0
                    
                    archive_size = archive_path.stat().st_size
                    self.db.save_channel_version(
                        archived_name,
                        archive_sources,
                        archive_channels_cnt,
                        archive_size
                    )
                    self.logger.info(f"   ✔ Archived with metadata")
            except Exception as e:
                self.logger.warning(f"   ⚠️  Could not save archive metadata: {e}")
        else:
            self.logger.info(f"   No previous version to archive")
        
        # STEP 2: Save channels to database
        if self.db:
            self.db.save_selected_channels(channels)
            self.logger.info(f"   ✔ Saved {len(channels)} channels to database")
        
        # STEP 3: Write current channels to JSON file
        self.logger.info(f"📋 Setting channels as current...")
        
        channels_data = {
            "saved_at": datetime.now().isoformat(),
            "sources_count": sources_count,
            "channels_count": len(channels),
            "channels": sorted(channels)
        }
        
        try:
            with open(current_path, 'w', encoding='utf-8') as f:
                json.dump(channels_data, f, indent=2, ensure_ascii=False)
            
            file_size = current_path.stat().st_size
            self.logger.info(f"   ✔ Written to /data/channels/{channels_filename} ({file_size} bytes)")
            
            # Save metadata
            if self.db:
                self.db.save_channel_version(
                    channels_filename,
                    sources_count,
                    len(channels),
                    file_size
                )
                self.logger.info(f"   ✔ Metadata saved: {sources_count}src, {len(channels)}ch, {file_size}b")
        
        except Exception as e:
            self.logger.error(f"   ✘ Error writing channels file: {e}")
            raise
        
        self.logger.info(f"✅ Channels saved successfully")
        
        return {
            "status": "success",
            "filename": channels_filename,
            "channels": len(channels),
            "sources": sources_count,
            "archived": True
        }
    
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
    
    def get_channel_versions(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all channel versions (current + archived)
        
        Returns:
            Dictionary with 'versions' list
        """
        from services.settings_service import SettingsService
        
        settings_service = SettingsService(self.db)
        channels_filename = settings_service.get_channels_filename()
        
        versions = []
        channels_dir = self.config.channels_dir
        
        try:
            if channels_dir.exists():
                # Find all channel files
                for file in sorted(channels_dir.glob(f"{channels_filename}*")):
                    try:
                        is_current = file.name == channels_filename
                        stat = file.stat()
                        
                        # Try to get metadata from database
                        metadata = self.db.get_channel_version(file.name) if self.db else None
                        
                        version_info = {
                            "filename": file.name,
                            "is_current": is_current,
                            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            "size_bytes": stat.st_size,
                            "sources_count": metadata.get('sources_count', 0) if metadata else 0,
                            "channels_count": metadata.get('channels_count', 0) if metadata else 0
                        }
                        
                        versions.append(version_info)
                    
                    except Exception as e:
                        self.logger.warning(f"Error reading channel version {file.name}: {e}")
        
        except Exception as e:
            self.logger.error(f"Error getting channel versions: {e}")
        
        return {"versions": versions}
    
    def get_channel_version_path(self, filename: str) -> Path:
        """Get the path to a channel version file
        
        Args:
            filename: Channel version filename
        
        Returns:
            Path to the file if it exists, None otherwise
        
        Raises:
            FileNotFoundError: If the file doesn't exist
        """
        try:
            file_path = self.config.channels_dir / filename
            if not file_path.exists():
                raise FileNotFoundError(f"Channel version not found: {filename}")
            return file_path
        except Exception as e:
            self.logger.error(f"Error getting channel version path for {filename}: {e}")
            raise