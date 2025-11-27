"""
EPG Merge - Source Service (v0.5.0)
Handles source discovery and management with versioning
"""

import json
import shutil
from typing import List, Dict, Any
from datetime import datetime
from pathlib import Path
import httpx
from config import Config
from database import Database
from .base_service import BaseService


class SourceService(BaseService):
    """Handles source discovery and management with versioning"""
    
    def __init__(self, config: Config, db: Database = None):
        """Initialize source service
        
        Args:
            config: Application configuration
            db: Database instance
        """
        super().__init__(config)
        self.db = db
    
    async def fetch_sources(self, timeframe: str = "3", feed_type: str = "iptv") -> List[str]:
        """Fetch available XML files from share.jesmann.com
        
        This is the method called by the router - renamed from fetch_available_sources
        
        Args:
            timeframe: EPG timeframe (3, 7, or 14 days)
            feed_type: Feed type (iptv or gracenote)
        
        Returns:
            List of available source filenames
        """
        from constants import get_folder_name
        
        try:
            folder_name = get_folder_name(timeframe, feed_type)
            url = f"https://share.jesmann.com/{folder_name}/"
            
            self.logger.info(f"Fetching from: {url}")
            
            async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                response = await client.get(url)
                if response.status_code == 200:
                    # Parse HTML to extract .xml.gz filenames
                    import re
                    files = re.findall(r'href=["\']([^"\']*\.xml\.gz)["\']', response.text)
                    self.logger.info(f"Found {len(files)} sources")
                    return sorted(list(set(files)))
                else:
                    self.logger.warning(f"Could not fetch sources: HTTP {response.status_code}")
                    return []
        except Exception as e:
            self.logger.error(f"Error fetching sources: {e}")
            return []
    
    def get_selected_sources(self) -> List[str]:
        """Get previously selected sources from database
        
        Returns:
            List of selected source filenames
        """
        try:
            if self.db:
                sources_json = self.db.get_setting("selected_sources")
                if sources_json:
                    return json.loads(sources_json)
            return []
        except Exception as e:
            self.logger.error(f"Error getting selected sources: {e}")
            return []
    
    def save_selected_sources(self, sources: List[str], timeframe: str = "3", feed_type: str = "iptv", filename: str = None) -> Dict[str, Any]:
        """Save selected sources with versioning and optional custom filename
        
        Args:
            sources: List of source filenames to save
            timeframe: EPG timeframe (3, 7, or 14 days)
            feed_type: Feed type (iptv or gracenote)
            filename: Custom filename (optional). If None, uses configured default
        
        Returns:
            Dictionary with save status
        """
        from services.settings_service import SettingsService
        
        # Get configured sources directory and default filename
        settings_service = SettingsService(self.db)
        sources_dir = self.config.sources_dir
        sources_dir.mkdir(parents=True, exist_ok=True)
        
        # Determine filename to use
        if not filename:
            # Use configured default if no custom filename provided
            filename = settings_service.get_sources_filename()
        else:
            # Ensure filename ends with .json
            if not filename.endswith('.json'):
                filename = filename + '.json'
        
        # Current sources file path
        current_path = sources_dir / filename
        
        self.logger.info(f"💾 Saving sources: {filename}")
        self.logger.info(f"   Source: Current selection ({len(sources)} sources)")
        self.logger.info(f"   Target: /data/sources/{filename}")
        
        # STEP 1: Archive existing sources version if it exists
        if current_path.exists():
            self.logger.info(f"📦 Archiving previous version...")
            creation_time = datetime.fromtimestamp(current_path.stat().st_mtime)
            timestamp = creation_time.strftime("%Y%m%d_%H%M%S")
            
            # For sources, we keep the full filename with timestamp
            archived_name = f"{filename}.{timestamp}"
            archive_path = sources_dir / archived_name
            
            self.logger.info(f"   Archiving: {filename} → {archived_name}")
            
            # Move to archive with timestamp
            shutil.move(str(current_path), str(archive_path))
            
            # Save metadata for archived version
            try:
                if self.db:
                    archive_data = self.db.get_source_version(filename)
                    if archive_data:
                        archive_sources = archive_data.get('sources_count', 0)
                    else:
                        archive_sources = 0
                    
                    archive_size = archive_path.stat().st_size
                    self.db.save_source_version(
                        archived_name,
                        archive_sources,
                        archive_size
                    )
                    self.logger.info(f"   ✔ Archived with metadata")
            except Exception as e:
                self.logger.warning(f"   ⚠️  Could not save archive metadata: {e}")
        else:
            self.logger.info(f"   No previous version to archive")
        
        # STEP 2: Write current sources to JSON file
        self.logger.info(f"📋 Setting sources as current...")
        
        sources_data = {
            "saved_at": datetime.now().isoformat(),
            "timeframe": timeframe,
            "feed_type": feed_type,
            "sources_count": len(sources),
            "sources": sorted(sources)
        }
        
        try:
            with open(current_path, 'w', encoding='utf-8') as f:
                json.dump(sources_data, f, indent=2, ensure_ascii=False)
            
            file_size = current_path.stat().st_size
            self.logger.info(f"   ✔ Written to /data/sources/{filename} ({file_size} bytes)")
            
            # Save metadata
            if self.db:
                self.db.save_source_version(
                    filename,
                    len(sources),
                    file_size
                )
                self.logger.info(f"   ✔ Metadata saved: {len(sources)} sources, {file_size}b")
        
        except Exception as e:
            self.logger.error(f"   ✘ Error writing sources file: {e}")
            raise
        
        self.logger.info(f"✅ Sources saved successfully")
        
        return {
            "status": "success",
            "filename": filename,
            "sources": len(sources),
            "timeframe": timeframe,
            "feed_type": feed_type,
            "archived": True
        }
    
    def get_source_versions(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all source versions (current + archived)
        
        Returns:
            Dictionary with 'versions' list
        """
        from services.settings_service import SettingsService
        
        settings_service = SettingsService(self.db)
        sources_filename = settings_service.get_sources_filename()
        
        versions = []
        sources_dir = self.config.sources_dir
        
        try:
            if sources_dir.exists():
                # Find all source files
                for file in sorted(sources_dir.glob(f"{sources_filename}*")):
                    try:
                        is_current = file.name == sources_filename
                        stat = file.stat()
                        
                        # Try to get metadata from database
                        metadata = self.db.get_source_version(file.name) if self.db else None
                        
                        # Read the JSON to get sources list for display
                        sources_list = []
                        try:
                            with open(file, 'r', encoding='utf-8') as f:
                                data = json.load(f)
                                sources_list = data.get('sources', [])
                        except:
                            pass
                        
                        version_info = {
                            "filename": file.name,
                            "is_current": is_current,
                            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                            "size_bytes": stat.st_size,
                            "sources_count": metadata.get('sources_count', 0) if metadata else len(sources_list),
                            "sources": sources_list
                        }
                        
                        versions.append(version_info)
                    
                    except Exception as e:
                        self.logger.warning(f"Error reading source version {file.name}: {e}")
        
        except Exception as e:
            self.logger.error(f"Error getting source versions: {e}")
        
        return {"versions": versions}
    
    def load_sources_from_disk(self, filename: str) -> Dict[str, Any]:
        """Load sources from a saved version file on disk
        
        Args:
            filename: Source version filename to load
        
        Returns:
            Dictionary with status and loaded sources
        
        Raises:
            FileNotFoundError: If the file doesn't exist
            ValueError: If the file is invalid JSON
        """
        try:
            file_path = self.config.sources_dir / filename
            if not file_path.exists():
                raise FileNotFoundError(f"Source version not found: {filename}")
            
            self.logger.info(f"📂 Loading sources from disk: {filename}")
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            sources = data.get('sources', [])
            self.logger.info(f"   ✔ Loaded {len(sources)} sources from {filename}")
            
            return {
                "status": "success",
                "filename": filename,
                "sources": sources,
                "count": len(sources),
                "timeframe": data.get('timeframe', ''),
                "feed_type": data.get('feed_type', ''),
                "loaded_at": datetime.now().isoformat()
            }
        
        except FileNotFoundError as e:
            self.logger.error(f"   ✘ Source file not found: {filename}")
            raise
        except json.JSONDecodeError as e:
            self.logger.error(f"   ✘ Invalid JSON in source file: {e}")
            raise ValueError(f"Invalid JSON in {filename}: {e}")
        except Exception as e:
            self.logger.error(f"   ✘ Error loading sources from disk: {e}")
            raise