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
        """
        try:
            sources = data.get('sources', [])
            channels = data.get('channels', [])
            output_filename = data.get('output_filename', 'merged.xml.gz')
            timeframe = data.get('timeframe', '3')
            feed_type = data.get('feed_type', 'iptv')
            
            if not sources or not channels:
                raise ValueError("Sources and channels required")
            
            self.logger.info(f"")
            self.logger.info(f"================== MERGE EXECUTION STARTED ==================")
            self.logger.info(f"Merge Configuration:")
            self.logger.info(f"  Sources: {len(sources)}")
            self.logger.info(f"  Channels to filter: {len(channels)}")
            self.logger.info(f"  Timeframe: {timeframe} days")
            self.logger.info(f"  Feed type: {feed_type}")
            self.logger.info(f"  Output: {output_filename}")
            self.logger.info(f"")
            
            # Phase 1: Download sources
            self.logger.info(f"PHASE 1: Downloading Source Files")
            self.logger.info(f"=" * 60)
            downloaded_files = await self._download_sources(sources, timeframe, feed_type)
            
            if not downloaded_files:
                raise Exception("No files downloaded successfully")
            
            self.logger.info(f"")
            self.logger.info(f"PHASE 2: Merging and Filtering XML")
            self.logger.info(f"=" * 60)
            
            # Phase 2: Merge XML
            result = await self._merge_xml_files(downloaded_files, channels, output_filename)
            
            self.logger.info(f"")
            self.logger.info(f"PHASE 3: Final Summary")
            self.logger.info(f"=" * 60)
            self.logger.info(f"✅ Merge Completed Successfully")
            self.logger.info(f"  Filename: {result['filename']}")
            self.logger.info(f"  Channels included: {result['channels_included']}")
            self.logger.info(f"  Programs included: {result['programs_included']}")
            self.logger.info(f"  File size: {result['file_size']}")
            self.logger.info(f"================== MERGE EXECUTION COMPLETE ==================")
            self.logger.info(f"")
            
            return result
        
        except Exception as e:
            self.logger.error(f"")
            self.logger.error(f"❌ MERGE FAILED")
            self.logger.error(f"Error: {e}")
            self.logger.error(f"")
            raise


    async def _download_sources(self, sources: List[str], timeframe: str, feed_type: str) -> List[str]:
        """Download and cache source files with detailed logging of each step
        
        Args:
            sources: List of source filenames
            timeframe: Days (3, 7, or 14)
            feed_type: Feed type (iptv or gracenote)
        
        Returns:
            List of downloaded file paths
        """
        from datetime import timedelta
        
        folder_map = {
            "3": {"iptv": "3dayiptv", "gracenote": "3daygracenote"},
            "7": {"iptv": "7dayiptv", "gracenote": "7daygracenote"},
            "14": {"iptv": "14dayiptv", "gracenote": "14daygracenote"}
        }
        folder = folder_map.get(timeframe, {}).get(feed_type, "3dayiptv")
        base_url = f"https://share.jesmann.com/{folder}"
        
        self.logger.info(f"Source URL: {base_url}")
        self.logger.info(f"Total sources: {len(sources)}")
        self.logger.info(f"")
        
        downloaded = []
        cache_hits = 0
        cache_misses = 0
        
        for idx, source in enumerate(sources, 1):
            try:
                cache_file = self.config.cache_dir / source
                url = f"{base_url}/{source}"
                
                self.logger.info(f"[{idx}/{len(sources)}] {source}")
                
                # Step 1: Check if cache exists
                if cache_file.exists():
                    local_size = cache_file.stat().st_size
                    file_age_hours = (datetime.now() - datetime.fromtimestamp(cache_file.stat().st_mtime)).total_seconds() / 3600
                    self.logger.info(f"        ✓ Cache found: {local_size / (1024**2):.2f}MB (age: {file_age_hours:.1f}h)")
                    
                    # Step 2: Check remote version
                    try:
                        self.logger.info(f"        → Checking remote version via HEAD request...")
                        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
                            head_response = await client.head(url, follow_redirects=True)
                            
                            if head_response.status_code == 200:
                                remote_size = int(head_response.headers.get('content-length', 0))
                                self.logger.info(f"        Remote size: {remote_size / (1024**2):.2f}MB")
                                
                                # Step 3: Compare sizes
                                if remote_size == local_size:
                                    self.logger.info(f"        ✓ Sizes match → Using cached version")
                                    downloaded.append(str(cache_file))
                                    cache_hits += 1
                                    self.logger.info(f"")
                                    continue
                                else:
                                    self.logger.info(f"        ⟳ File changed on remote server")
                                    cache_misses += 1
                            else:
                                self.logger.warning(f"        HEAD check returned {head_response.status_code}, re-downloading")
                                cache_misses += 1
                    
                    except Exception as e:
                        self.logger.warning(f"        HEAD check error: {e}, re-downloading")
                        cache_misses += 1
                else:
                    self.logger.info(f"        ⊝ No cache found")
                    cache_misses += 1
                
                # Step 4: Download (if cache miss or stale)
                self.logger.info(f"        ⬇ Downloading: {url}")
                
                async with httpx.AsyncClient(timeout=120.0, verify=False) as client:
                    response = await client.get(url)
                    if response.status_code == 200:
                        cache_file.write_bytes(response.content)
                        file_size = cache_file.stat().st_size / (1024**2)
                        self.logger.info(f"        ✓ Downloaded & cached: {file_size:.2f}MB")
                        downloaded.append(str(cache_file))
                    else:
                        self.logger.error(f"        ✗ Download failed: HTTP {response.status_code}")
                
                self.logger.info(f"")
            
            except Exception as e:
                self.logger.error(f"        ✗ Error: {e}")
                self.logger.info(f"")
        
        # Final summary
        self.logger.info(f"Cache Statistics:")
        self.logger.info(f"  ✓ Hits (cached files used): {cache_hits}")
        self.logger.info(f"  ⊝ Misses (new/updated files): {cache_misses}")
        self.logger.info(f"  Total processed: {len(sources)}")
        self.logger.info(f"")
        
        return downloaded
    
    async def _merge_xml_files(self, files: List[str], channels: List[str], output_filename: str) -> Dict[str, Any]:
        """Merge XML files using streaming with progress logging
        
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
        files_processed = 0
        
        total_files = len(files)
        
        for filepath in files:
            try:
                filename = filepath.split('/')[-1] if '/' in filepath else filepath
                self.logger.info(f"Parsing {filename}... ({files_processed + 1}/{total_files})")
                
                if filepath.endswith('.gz'):
                    f = gzip.open(filepath, 'rt', encoding='utf-8', errors='ignore')
                else:
                    f = open(filepath, 'rt', encoding='utf-8', errors='ignore')
                
                file_channels = 0
                file_programmes = 0
                
                with f:
                    for event, elem in ET.iterparse(f, events=('end',)):
                        if elem.tag == 'channel':
                            ch_id = elem.get('id')
                            if ch_id in keep_channels and ch_id not in channels_seen:
                                merged_root.append(copy.deepcopy(elem))
                                channels_seen.add(ch_id)
                                file_channels += 1
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
                                    file_programmes += 1
                            elem.clear()
                
                self.logger.info(f"  ✓ {file_channels} channels, {file_programmes} programmes from {filename}")
                files_processed += 1
                
            except Exception as e:
                self.logger.error(f"Error parsing {filepath}: {e}")
        
        self.logger.info(f"")
        self.logger.info(f"Merge Statistics:")
        self.logger.info(f"  Files processed: {files_processed}/{total_files}")
        self.logger.info(f"  Channels included: {len(channels_seen)}")
        self.logger.info(f"  Programmes included: {len(programmes_seen)}")
        self.logger.info(f"")
        
        # Write output
        output_path = self.config.archive_dir / output_filename
        self.logger.info(f"Writing output file...")
        
        xml_bytes = ET.tostring(merged_root, encoding='utf-8', xml_declaration=True)
        with gzip.open(output_path, 'wb') as f:
            f.write(xml_bytes)
        
        file_size = output_path.stat().st_size
        file_size_mb = file_size / (1024**2)
        
        self.logger.info(f"✓ Output written: {output_filename} ({file_size_mb:.2f}MB)")
        self.logger.info(f"")
        
        return {
            "status": "success",
            "filename": output_filename,
            "channels_included": len(channels_seen),
            "programs_included": len(programmes_seen),
            "file_size": f"{file_size_mb:.2f}MB"
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
        import shutil
        from datetime import datetime
        
        filename = data.get('filename', 'merged.xml.gz')
        merged_path = self.config.archive_dir / filename
        current_path = self.config.archive_dir / "merged.xml.gz"
        
        # Validate source file exists
        if not merged_path.exists():
            raise FileNotFoundError(f"File {filename} not found")
        
        self.logger.info(f"Saving merge: {filename}")
        
        # Archive previous current file if it exists and is different
        if current_path.exists() and current_path != merged_path:
            timestamp = datetime.fromtimestamp(current_path.stat().st_mtime).strftime("%Y%m%d_%H%M%S")
            archive_path = self.config.archive_dir / f"merged.xml.gz.{timestamp}"
            
            self.logger.info(f"Archiving previous version: {archive_path.name}")
            shutil.move(str(current_path), str(archive_path))
            
            # Save metadata for archived file
            try:
                if self.db:
                    archive_data = self.db.get_archive(filename)
                    if archive_data:
                        self.db.save_archive(
                            archive_path.name,
                            archive_data.get('channels'),
                            archive_data.get('programs'),
                            0,
                            archive_path.stat().st_size
                        )
                        self.logger.info(f"Archived metadata saved for {archive_path.name}")
            except Exception as e:
                self.logger.warning(f"Could not save metadata for archived file: {e}")
        
        # Copy/move the new file to current if different name
        if filename != "merged.xml.gz":
            self.logger.info(f"Copying {filename} to merged.xml.gz")
            shutil.copy2(str(merged_path), str(current_path))
        
        # Save metadata for current file
        try:
            if self.db:
                archive_data = self.db.get_archive(filename)
                if archive_data:
                    self.db.save_archive(
                        "merged.xml.gz",
                        archive_data.get('channels'),
                        archive_data.get('programs'),
                        0,
                        current_path.stat().st_size
                    )
                    self.logger.info(f"Current file metadata saved")
        except Exception as e:
            self.logger.warning(f"Could not save metadata for current file: {e}")
        
        self.logger.info(f"✓ Merge saved successfully")
        
        return {
            "status": "success",
            "message": "Merge saved successfully",
            "current_file": "merged.xml.gz"
        }