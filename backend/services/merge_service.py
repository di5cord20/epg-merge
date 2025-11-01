"""
EPG Merge - Merge Service (v0.4.4)
Handles XML merging logic with timeframe tracking and configurable output filename
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
        
        Creates a temporary merge file in /data/tmp/ using configured output filename,
        allowing user to review before promoting to current via "Save as Current" button
        
        Args:
            data: Dictionary with sources, channels, timeframe, feed_type, output_filename
        
        Returns:
            Dictionary with merge results including temporary filename
        """
        try:
            from datetime import datetime
            
            sources = data.get('sources', [])
            channels = data.get('channels', [])
            timeframe = data.get('timeframe', '3')
            feed_type = data.get('feed_type', 'iptv')
            output_filename = data.get('output_filename', 'merged.xml.gz')
            
            # SAFETY FIX: Strip quotes if timeframe was double-encoded
            if isinstance(timeframe, str):
                timeframe = timeframe.strip('"').strip("'")
            
            if not sources or not channels:
                raise ValueError("Sources and channels required")
            
            # Validate timeframe is valid integer
            try:
                tf_int = int(timeframe)
                if tf_int not in [3, 7, 14]:
                    raise ValueError(f"Timeframe must be 3, 7, or 14 days (got {tf_int})")
            except ValueError as e:
                raise ValueError(f"Invalid timeframe: {timeframe} - {str(e)}")
            
            # STEP 0: Clear old temporary files from /data/tmp/
            self.logger.info(f"")
            self.logger.info(f"================== MERGE EXECUTION STARTED ==================")
            self.logger.info(f"Clearing old temporary files from /data/tmp/...")
            try:
                for file in self.config.tmp_dir.glob("*.xml.gz*"):
                    file.unlink()
                    self.logger.info(f"  ✓ Deleted: {file.name}")
            except Exception as e:
                self.logger.warning(f"  ⚠️  Could not clear all temp files: {e}")
            
            self.logger.info(f"")
            self.logger.info(f"Merge Configuration:")
            self.logger.info(f"  Sources: {len(sources)}")
            self.logger.info(f"  Channels to filter: {len(channels)}")
            self.logger.info(f"  Timeframe: {timeframe} days")
            self.logger.info(f"  Feed type: {feed_type}")
            self.logger.info(f"")
            
            # Create temporary file in /data/tmp/ with configured filename
            # (No timestamp on temp file - gets cleaned before next merge)
            temp_filename = output_filename
            
            self.logger.info(f"  Output (temporary): {temp_filename}")
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
            
            # Phase 2: Merge XML with TEMPORARY filename
            result = await self._merge_xml_files(downloaded_files, channels, temp_filename)
            
            # Add timeframe to result for storage
            result['days_included'] = int(timeframe)
            
            self.logger.info(f"")
            self.logger.info(f"PHASE 3: Final Summary")
            self.logger.info(f"=" * 60)
            self.logger.info(f"✅ Merge Completed Successfully")
            self.logger.info(f"  Temporary filename: {result['filename']}")
            self.logger.info(f"  Channels included: {result['channels_included']}")
            self.logger.info(f"  Programs included: {result['programs_included']}")
            self.logger.info(f"  File size: {result['file_size']}")
            self.logger.info(f"  Days Included: {result['days_included']} days")
            self.logger.info(f"================== MERGE EXECUTION COMPLETE ==================")
            self.logger.info(f"")
            
            return result
        
        except Exception as e:
            self.logger.error(f"")
            self.logger.error(f"❌ MERGE FAILED")
            self.logger.error(f"Error: {e}")
            self.logger.error(f"")
            raise


    async def _merge_xml_files(self, files: List[str], channels: List[str], output_filename: str) -> Dict[str, Any]:
        """Merge XML files using streaming with progress logging
        
        Args:
            files: List of gzipped XML file paths
            channels: List of channel IDs to filter
            output_filename: Output filename
        
        Returns:
            Dictionary with merge statistics (channels_included, programs_included, etc)
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
        
        # Write output to /data/tmp/
        output_path = self.config.tmp_dir / output_filename
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
    
    def get_current_merge_info(self) -> Dict[str, Any]:
        """Get current live merged file info from /data/current/
        
        Returns:
            Dictionary with file information
        """
        # Import settings service to get configured filename
        from services.settings_service import SettingsService
        settings_service = SettingsService(self.db)
        output_filename = settings_service.get_output_filename()
        
        current = self.config.current_dir / output_filename
        if current.exists():
            stat = current.stat()
            return {
                "filename": output_filename,
                "exists": True,
                "size": f"{stat.st_size / (1024**2):.2f}MB",
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
            }
        return {"filename": output_filename, "exists": False}
    
    def save_merge(self, data: dict) -> Dict[str, Any]:
        """Save merge and archive previous version with configurable filename
        
        Args:
            data: Dictionary with:
                - channels: Number of channels
                - programs: Number of programs
                - days_included: Timeframe (3, 7, or 14 days)
        
        Returns:
            Status dictionary
        """
        from datetime import datetime
        from services.settings_service import SettingsService
        
        channels = data.get('channels', 0)
        programs = data.get('programs', 0)
        days_included = data.get('days_included', 0)
        
        # Get configured output filename from settings
        settings_service = SettingsService(self.db)
        output_filename = settings_service.get_output_filename()
        
        # Source file (the newly merged file from /data/tmp/)
        merged_path = self.config.tmp_dir / output_filename
        
        if not merged_path.exists():
            raise FileNotFoundError(f"File {output_filename} not found in {self.config.tmp_dir}")
        
        # Current live file path in /data/current/
        current_path = self.config.current_dir / output_filename
        
        self.logger.info(f"💾 Saving merge: {output_filename}")
        self.logger.info(f"   Source: {merged_path.name}")
        self.logger.info(f"   Target: /data/current/{output_filename}")
        
        # STEP 1: Archive ALL existing files in /data/current/ (regardless of filename)
        self.logger.info(f"📦 Archiving any previous version...")
        archived_count = 0
        
        for existing_file in self.config.current_dir.glob("*.xml.gz"):
            # Get creation time of the existing file
            creation_time = datetime.fromtimestamp(existing_file.stat().st_mtime)
            timestamp = creation_time.strftime("%Y%m%d_%H%M%S")
            archive_path = self.config.archive_dir / f"{existing_file.name}.{timestamp}"
            
            self.logger.info(f"   Archiving: {existing_file.name} → {archive_path.name}")
            
            # Move to archive with timestamp
            shutil.move(str(existing_file), str(archive_path))
            archived_count += 1
            
            # Save metadata for archived file from database
            try:
                if self.db:
                    archive_data = self.db.get_archive(existing_file.name)
                    if archive_data:
                        archive_channels = archive_data.get('channels', 0)
                        archive_programs = archive_data.get('programs', 0)
                        archive_days = archive_data.get('days_included', 0)
                    else:
                        archive_channels = 0
                        archive_programs = 0
                        archive_days = 0
                    
                    archive_size = archive_path.stat().st_size
                    self.db.save_archive(
                        archive_path.name,
                        archive_channels,
                        archive_programs,
                        archive_days,
                        archive_size
                    )
            except Exception as e:
                self.logger.warning(f"   ⚠️  Could not save archive metadata: {e}")
        
        if archived_count == 0:
            self.logger.info(f"   No previous version to archive")
        else:
            self.logger.info(f"   ✓ Archived {archived_count} previous file(s)")
        
        # STEP 2: COPY (not move) new file from /data/tmp/ to /data/current/
        # This keeps the file in /data/tmp/ so user can still download
        self.logger.info(f"📋 Setting new file as current...")
        shutil.copy2(str(merged_path), str(current_path))
        self.logger.info(f"   ✓ Copied to /data/current/{output_filename}")
        self.logger.info(f"   ℹ️  Original kept in /data/tmp/{output_filename} for download")
        
        # STEP 3: Verify current file exists and save metadata
        if not current_path.exists():
            raise FileNotFoundError(f"Current file {current_path} was not created!")
        
        try:
            if self.db:
                file_size = current_path.stat().st_size
                self.db.save_archive(
                    output_filename,
                    channels,
                    programs,
                    days_included,
                    file_size
                )
                self.logger.info(f"✓ Current file metadata saved: {channels}ch, {programs}prog, {days_included}d, {file_size/1024:.1f}KB")
        except Exception as e:
            self.logger.warning(f"⚠️  Could not save current metadata: {e}")
        
        self.logger.info(f"✅ Merge saved successfully")
        
        return {
            "status": "success",
            "message": "Merge saved successfully",
            "current_file": output_filename,
            "channels": channels,
            "programs": programs,
            "days_included": days_included,
            "archived": True
        }

    def clear_temp_files(self) -> Dict[str, Any]:
        """Clear all temporary merge files from /data/tmp/
        
        Called when user clears merge log or starts new session
        
        Returns:
            Cleanup statistics
        """
        deleted_count = 0
        freed_bytes = 0
        
        self.logger.info(f"Clearing temporary merge files from /data/tmp/...")
        
        try:
            for file in self.config.tmp_dir.glob("*.xml.gz*"):
                try:
                    size = file.stat().st_size
                    file.unlink()
                    deleted_count += 1
                    freed_bytes += size
                    self.logger.info(f"  ✓ Deleted: {file.name}")
                except Exception as e:
                    self.logger.error(f"  ✗ Error deleting {file.name}: {e}")
        except Exception as e:
            self.logger.error(f"Cleanup temp files failed: {e}")
        
        freed_mb = round(freed_bytes / (1024**2), 2)
        self.logger.info(f"Temp cleanup complete: {deleted_count} files deleted, {freed_mb}MB freed")
        
        return {
            "deleted": deleted_count,
            "freed_bytes": freed_bytes,
            "freed_mb": freed_mb
        }

    def _cleanup_old_archives(self, retention_days: int) -> Dict[str, Any]:
        """Delete archives older than retention policy
        
        Args:
            retention_days: Keep archives for this many days
        
        Returns:
            Cleanup statistics
        """
        from datetime import datetime, timedelta
        
        if retention_days <= 0:
            self.logger.info(f"Cleanup disabled (retention_days = {retention_days})")
            return {"deleted": 0, "freed_bytes": 0, "freed_mb": 0}
        
        deleted_count = 0
        freed_bytes = 0
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        
        self.logger.info(f"Cleanup: Removing archives older than {retention_days} days")
        self.logger.info(f"  Cutoff date: {cutoff_date.date()}")
        
        try:
            archive_files = sorted(self.config.archive_dir.glob("*.xml.gz.*"))
            
            if not archive_files:
                self.logger.info(f"  No timestamped archives found")
                return {"deleted": 0, "freed_bytes": 0, "freed_mb": 0}
            
            self.logger.info(f"  Found {len(archive_files)} archive file(s)")
            
            for file in archive_files:
                try:
                    file_mtime = datetime.fromtimestamp(file.stat().st_mtime)
                    file_age = (datetime.now() - file_mtime).days
                    
                    if file_mtime < cutoff_date:
                        size = file.stat().st_size
                        file.unlink()
                        deleted_count += 1
                        freed_bytes += size
                        self.logger.info(f"  ✓ Deleted: {file.name} ({file_age}d old, {size/(1024**2):.2f}MB)")
                    else:
                        self.logger.info(f"  • Keep: {file.name} ({file_age}d old)")
                
                except Exception as e:
                    self.logger.error(f"  ✗ Error processing {file.name}: {e}")
            
            freed_mb = round(freed_bytes / (1024**2), 2)
            self.logger.info(f"  Summary: {deleted_count} deleted, {freed_mb}MB freed")
            
        except Exception as e:
            self.logger.error(f"Cleanup failed: {e}", exc_info=True)
        
        return {
            "deleted": deleted_count,
            "freed_bytes": freed_bytes,
            "freed_mb": freed_mb
        }