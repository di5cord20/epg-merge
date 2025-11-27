# Changelog - EPG Merge Application

All notable changes to the EPG Merge Application are documented in this file.

---

## [0.5.0] - 2025-11-26

### Added
- **SaveDialog Component** - New reusable modal for saving sources/channels with 3 modes:
  - Use Fallback Default (from settings)
  - Use Custom Name (user-specified filename)
  - Overwrite Existing (select from saved versions dropdown)
- **Source Versioning** - Parallel to channel versioning:
  - Save sources with custom filenames
  - Auto-archive previous versions with timestamps
  - Track metadata (source count, file size, creation date)
  - Database table: `source_versions`
- **Load from Disk (Sources)** - New feature:
  - "Load from Disk" button on Sources page
  - Modal shows all saved source versions
  - Displays source count and creation timestamp
  - Click to load into selector
- **Settings Expansion** - New configuration keys:
  - `sources_filename` - Fallback default filename (default: "sources.json")
  - `sources_dir` - Directory for source storage (default: "/data/sources")
- **API Endpoints**:
  - `GET /api/sources/versions` - List all saved source versions with metadata
  - `POST /api/sources/load-from-disk` - Load specific source version from disk

### Changed
- **SourcesPage.js** - Integrated SaveDialog for custom filename selection
- **ChannelsPage.js** - Updated to use SaveDialog for consistency
- **SettingsOutput.js** - Added sources settings fields
- **source_service.py** - Complete rewrite:
  - `fetch_sources()` - Fetch available sources (renamed method)
  - `save_selected_sources()` - Save with optional custom filename
  - `get_source_versions()` - List all saved versions with metadata
  - `load_sources_from_disk()` - Load specific version from disk
- **channel_service.py**:
  - `save_selected_channels()` - Now accepts optional `filename` parameter
- **settings_service.py** - Added:
  - `get_setting()` - Core getter method with defaults
  - `get_sources_filename()` - Get configured sources default
  - `get_channels_filename()` - Get configured channels default
  - Validation methods for all settings
- **channels.py router** - `/api/channels/save` now passes `filename` parameter
- **sources.py router** - `/api/sources/list` fixed to handle list directly

### Fixed
- SourceService initialization now properly sets `self.db`
- Missing imports in source_service.py (json, shutil, Path, datetime)
- SettingsService `get_setting()` method for proper defaults
- Channels save endpoint now retains custom filenames

### Database Changes
- New table: `source_versions` (filename, created_at, sources_count, size_bytes)
- New methods:
  - `save_source_version()` - Save version metadata
  - `get_source_version()` - Retrieve version metadata
  - `get_all_source_versions()` - List all versions
  - `delete_source_version()` - Delete version metadata

### Migration Required
- None - auto-migration on first run
- `source_versions` table created automatically
- New settings initialized with defaults

### Known Issues
- ⚠️ Sources settings (`sources_filename`, `sources_dir`) fields display but don't persist in SettingsOutput.js panel
  - Workaround: Uses defaults (/data/sources, sources.json)
  - Planned fix: v0.5.1

### Testing
- ✅ Save sources with default/custom names
- ✅ Save channels with custom names
- ✅ Saved versions appear in dropdowns with counts
- ✅ Load from Disk works for sources
- ✅ Version archives created with timestamps
- ✅ Metadata tracked in database
- ✅ Settings persist (except sources settings)

### Files Modified
```
frontend/
├── src/components/SaveDialog.js (NEW)
├── src/pages/settings/SettingsOutput.js
├── src/pages/SourcesPage.js
└── src/pages/ChannelsPage.js

backend/
├── services/source_service.py
├── services/channel_service.py
├── services/settings_service.py
├── routers/sources.py
├── routers/channels.py
├── database.py
└── config.py
```

---

## [0.4.9] - 2025-11-26

### Added
- **Cron-Based Scheduler** - Fully automated merge execution with daily/weekly scheduling
- **Timeout Enforcement** - Hard-kill of merges exceeding timeout via `asyncio.wait_for()`
- **Memory Tracking** - Peak memory monitoring during execution (reported in MB)
- **Auto-Recovery** - Automatic cleanup of jobs stuck in RUNNING state for 2+ hours
- **Source Configuration Versioning** - Save and reuse source configurations
- **Frontend Navigation Guard** - Prevents page navigation during active merge
- **Enhanced Retry Logic** - API calls auto-retry up to 3 times with exponential backoff
- **Job Controls** - Cancel running merge, clear history, manual execution trigger
- **Discord Notifications** - Success/failure notifications with 8 statistics
- **Lifespan Context Manager** - Replaces deprecated @app.on_event decorator

### Changed
- Backend: Lifespan management using modern FastAPI pattern
- Dashboard: New status cards, auto-refresh toggle, job controls
- Settings: Enhanced Schedule panel with source/channels dropdowns

### Fixed
- Settings changes now detected within 60 seconds (no restart needed)
- Navigation properly prevented during merge execution
- API calls properly retry on network errors

### Testing Status
- ✅ All 56+ existing tests passing
- ✅ Scheduler tested with manual triggers and auto-recovery
- ✅ Timeout enforcement validated
- ✅ Memory tracking confirmed

### Migration Notes
- **No breaking changes** - Fully backward compatible
- **Auto-recovery on startup** - Stuck jobs cleaned automatically
- **Dynamic recalculation** - Settings changes take effect within 60 seconds

### Known Limitations
- Healthcheck timeout must be 35+ seconds (merges block API temporarily)

---

## [0.4.8] - 2025-11-23

### Added
- **Channel Versioning with Archive/History**
  - Save channels with automatic versioning (similar to merge workflow)
  - Archive previous channel versions with timestamps
  - Channel metadata tracking: sources count, channels count, file size
  - New `channel_versions` database table for persistence
  - Download/delete archived channel versions from Archives page
  - `GET /api/channels/versions` - List all channel versions
  - `POST /api/channels/save` - Save with versioning (replaces legacy select)
  - `GET /api/archives/download-channel/{filename}` - Download channel JSON
  - `DELETE /api/archives/delete-channel/{filename}` - Delete channel version

- **Configurable Directory Paths**
  - New Settings panel: "Output & Paths" (consolidates output and path settings)
  - `current_dir` setting - Where live merged files stored (default: `/data/current`)
  - `archive_dir` setting - Where archived files stored (default: `/data/archives`)
  - `channels_dir` setting - Where channel versions stored (default: `/data/channels`)
  - All directory paths validated and required in Settings UI
  - Validation ensures paths start with `/` and are absolute paths

- **Enhanced Merge Scheduling**
  - `merge_timeframe` setting - EPG timeframe for scheduled jobs (3, 7, or 14 days)
  - `merge_channels_version` setting - Which channels JSON version to use
  - SettingsSchedule panel updated with timeframe radio buttons
  - Dynamic channels version dropdown (populated from API)
  - Scheduled merge now uses `merge_timeframe` instead of UI selection
  - Scheduled merge now uses selected `merge_channels_version` instead of current

- **Archives Page Enhancement**
  - New `ArchivesChannels` component - Separate table for channel versions
  - Channel versions panel displays: Filename, Created, Sources, Channels, Size
  - Independent sorting for each panel (merged files vs channels)
  - Current file indicator for both merged and channel files
  - Download/delete actions for both file types
  - Cannot delete current version from either panel

- **Backend Path Resolution**
  - `channel_service.get_channel_version_path()` - Helper for channel path resolution
  - Uses `config.channels_dir` for reliable path handling in containers
  - Archives router updated to use service helpers instead of direct config access

### Changed
- **Settings Service:**
  - Added 5 new settings keys to `DEFAULTS`
  - Convenience getter methods for new settings
  
- **Settings UI:**
  - Renamed "Output File" panel to "Output & Paths"
  - Added channels filename input field
  - Added current directory input field
  - Added archive directory input field
  - Added channels directory input field
  - All path fields with validation and helper text

- **SettingsSchedule Component:**
  - Added timeframe section with radio buttons (3/7/14 days)
  - Added channels version dropdown (dynamically populated)
  - Separate from UI-only `selected_timeframe` (now only for Sources page)

- **ChannelsPage:**
  - "Save Channels" button now calls `/api/channels/save` with versioning
  - Sends `sources_count` along with channels for metadata tracking

- **ArchivesPage:**
  - Refactored to use `ArchivesChannels` component (like `ArchivesTable`)
  - Separate sort state for merged files and channels
  - Two independent panels with their own tables

- **Job Service:**
  - `execute_scheduled_merge()` now uses `merge_timeframe` setting
  - `execute_scheduled_merge()` now uses `merge_channels_version` setting
  - Added `_load_channels_from_file()` helper to load specific channel version

- **Database:**
  - Added `channel_versions` table for channel metadata
  - Added `save_channel_version()`, `get_channel_version()`, `delete_channel_version()` methods

- **Routers:**
  - Archives router: added download-channel and delete-channel endpoints
  - Channels router: updated to accept `sources_count` parameter

- **Import Paths:**
  - Fixed router imports to use full backend path: `from backend.version import get_version`
  - Ensures proper module resolution in router subdirectories

### Fixed
- Channel download/delete now properly resolves paths in Docker containers
- Version import in health router now uses correct backend path
- Settings panel validation properly shows error messages for required fields
- Directory path validation prevents empty or relative paths

### Technical Details
- **New Files:**
  - `frontend/src/pages/archives/ArchivesChannels.js` - Channel versions table component
  
- **Modified Files:**
  - `backend/config.py` - Added `channels_dir` path
  - `backend/version.py` - Bumped to 0.4.8
  - `backend/services/settings_service.py` - Added new settings keys and getters
  - `backend/services/channel_service.py` - Added save workflow and path helper
  - `backend/database.py` - Added channel_versions table
  - `backend/routers/channels.py` - Added save and versions endpoints
  - `backend/routers/archives.py` - Added channel download/delete endpoints
  - `backend/services/job_service.py` - Updated to use merge_timeframe and merge_channels_version
  - `frontend/src/pages/SettingsPage.js` - Added new settings and validation
  - `frontend/src/pages/settings/SettingsOutput.js` - Added path fields
  - `frontend/src/pages/settings/SettingsSchedule.js` - Added timeframe and channels version
  - `frontend/src/pages/ChannelsPage.js` - Updated to use save endpoint
  - `frontend/src/pages/ArchivesPage.js` - Refactored with ArchivesChannels component
  - `frontend/src/components/Navbar.js` - Updated version default to 0.4.8

### Database
- New table: `channel_versions`
  - `filename` (TEXT PRIMARY KEY)
  - `created_at` (TIMESTAMP)
  - `sources_count` (INTEGER)
  - `channels_count` (INTEGER)
  - `size_bytes` (INTEGER)

### Testing Status
- ✅ All 56+ existing tests still passing
- ✅ Channel save/archive workflow tested
- ✅ Archives page with two panels tested
- ✅ Settings validation tested
- ✅ Scheduled merge with new settings tested

### Migration Notes
- **No breaking changes** - All existing APIs preserved
- **Backward compatible** - Old channel selection workflow still works via `/api/channels/select`
- **Directory auto-creation** - Config automatically creates `/data/channels/` if missing
- **Settings migration** - New settings added with sensible defaults matching current behavior
- **Scheduled merges** - Now use `merge_timeframe` (recommend setting this value)

### Known Limitations
- None new in this release

---

## [0.4.7] - 2025-11-02

### Added
- Peak memory tracking for scheduled merge jobs using `psutil`
- Timeout monitoring (soft-limit advisory) for merge execution
- Enhanced Discord notifications with 8 statistics
- Manual merge trigger endpoint: `POST /api/jobs/execute-now`
- Clear job history endpoint: `POST /api/jobs/clear-history`
- Clear History button on Dashboard with confirmation dialog
- **Background scheduler - automatically executes merges based on user settings**
  - Runs as async task in FastAPI
  - Daily or weekly scheduling
  - Auto-recalculates when settings change
  - Full logging via docker compose logs
- Job history now includes: `peak_memory_mb`, `days_included`, `error_message`
- Automatic database schema migration for new columns
- `psutil>=5.8.0` dependency for memory monitoring

### Changed
- Job history table schema updated with memory and days tracking
- `MergeService._download_sources()` signature fixed
- Docker Dockerfile fallback: `npm ci || npm install`
- Docker Compose volume mounts corrected
- `.dockerignore` updated to include `frontend/package-lock.json`
- Frontend API calls use relative paths for nginx proxy
- Scheduler activation in main.py startup event

### Fixed
- Fixed merge service download function signature
- Fixed Docker build context for frontend dependencies
- Fixed Docker permission errors with proper volume mounts
- Fixed Frontend API routing through nginx proxy
- Database schema migration handles existing columns gracefully
- Scheduler properly awaited with asyncio.create_task()

### Infrastructure
- Timeout is currently a "soft limit" (logs warning if exceeded)
- Hard timeout enforcement deferred (requires async I/O refactoring)
- Memory monitoring samples every 100ms during merge execution
- Job history automatically cleaned up based on retention policy
- **Scheduler runs continuously in background** - survives container restarts

### Testing
- ✅ Phase 1: Local API testing - all tests passing
- ✅ Phase 2: Docker testing - all tests passing
- ✅ Phase 3: LXC Docker deployment - all tests passing
- ✅ Scheduler activation - working and tested

### Known Limitations
- HTTPS blob download warning (cosmetic, doesn't affect functionality)
- Timezone must be set via TZ environment variable in docker-compose.yml

---

## [0.4.6] - 2025-11-02

### Added
- **Modular Router Architecture** - Backend refactoring from monolithic to feature-based routers
  - `backend/routers/` directory with 7 feature-specific router files
  - Each router handles: health, sources, channels, merge, archives, settings, jobs
  - Router dependency injection pattern for cleaner service management
  - `backend/routers/__init__.py` - Router package initialization

### Changed
- **Backend Structure Refactoring:**
  - `main.py` reduced from 400+ lines to 63 lines (clean orchestrator)
  - Endpoints moved to feature-based routers (35-110 lines each)
  - Main.py now focuses on: app initialization, middleware, service setup, lifecycle, error handlers
  - Router files: `health.py`, `sources.py`, `channels.py`, `merge.py`, `archives.py`, `settings.py`, `jobs.py`

- **Code Organization:**
  - Follows FastAPI best practices (router pattern with dependency injection)
  - Each router receives dependencies via `init_*_routes(dependencies)` function
  - Routers included with `app.include_router(router)`
  - Better separation of concerns (easy to locate and modify endpoints)

### Fixed
- Improved code maintainability and readability
- Each router is now focused enough to understand in one view
- Easier to test individual features independently

### Technical Details
- **No API Changes** - All endpoints remain at same paths (e.g., `/api/merge/execute` unchanged)
- **No Functional Changes** - All endpoints work identically to v0.4.5
- **All Existing Tests Pass** - 56+ tests require no modifications
- **Database:** No schema changes
- **Version Display:** Still uses `backend/version.py` as single source of truth
- **All Services Unchanged:** Business logic remains in service layer

### Migration Notes
- All API contracts remain unchanged
- No frontend changes required
- No database migration needed
- Existing deployments can update without reconfiguration
- Directory structure unchanged (files only moved within backend/)

### Benefits
- ✅ Easier to maintain - Find endpoints by feature area
- ✅ Easier to test - Test individual routers independently
- ✅ Easier to extend - Add new routers for new features
- ✅ Better code organization - Aligns with FastAPI standards
- ✅ Faster development - Less scrolling through 400-line files
- ✅ Reduced cognitive load - Smaller files (35-110 lines each)

### Testing Status
- ✅ All 56+ existing tests pass without modification
- ✅ All API endpoints tested and working
- ✅ Health and status endpoints verified (version display working)
- ✅ Full feature coverage maintained

---

## [0.4.5] - 2025-11-01

### Added
- **Centralized Constants Module** (`backend/constants.py`)
  - Single source of truth for folder mappings (FOLDER_MAP)
  - Helper functions: `get_folder_name()`, `get_update_frequency()`
  - Clear documentation of source provider structure
  - Validation with descriptive error messages

### Changed
- **Folder Mapping Management:**
  - Moved FOLDER_MAP from individual services to shared `constants.py`
  - Eliminated duplication across `source_service.py` and `merge_service.py`
  - Added validation layer with `get_folder_name()` function
  - Improved error handling (explicit validation vs silent failures)

- **Service Updates:**
  - `source_service.py` - Now imports and uses `get_folder_name()` from constants
  - `merge_service.py` - Now imports and uses `get_folder_name()` from constants
  - Both services simplified by removing local FOLDER_MAP definitions

- **14-Day Feed Mapping Correction:**
  - **14-day IPTV:** Maps to `iptv/` folder
  - **14-day Gracenote:** Maps to empty string (root level access)
  - Verified against actual share.jesmann.com structure

### Technical Details
- **New File:** `backend/constants.py` (60 lines)
- **Modified Files:**
  - `backend/services/source_service.py` - Imports constants, removed duplicate FOLDER_MAP
  - `backend/services/merge_service.py` - Imports constants, removed duplicate folder_map
- **No Breaking Changes** - All API contracts remain unchanged
- **Database:** No schema changes

### Benefits
- ✅ Single source of truth for folder mappings
- ✅ Explicit validation instead of silent failures
- ✅ DRY principle - No duplication across services
- ✅ Easier maintenance if source provider structure changes
- ✅ Better error messages for invalid timeframe/feed_type combinations
- ✅ Extensibility for future timeframe options

### Testing Status
- ✅ All existing tests continue to pass (56+)
- ✅ 14-day IPTV tested and working
- ✅ 14-day Gracenote tested and working
- ✅ Error validation confirmed

---

## [0.4.4] - 2025-11-01

### Added
- **Configurable Output Filename** - Users can set custom EPG output filename in Settings (default: merged.xml.gz)
- **New Directory Structure** - Reorganized data storage:
  - `/data/tmp/` - Temporary merge files
  - `/data/current/` - Current live file
  - `/data/archives/` - Timestamped archive backups
- **New API Endpoints:**
  - `GET /api/merge/download/{filename}` - Download temporary merge file from /data/tmp/
  - `POST /api/merge/clear-temp` - Clear temporary merge files
- **Archive Timestamp Naming** - Archives now include creation timestamp: `{filename}.YYYYMMDD_HHMMSS`
- **Improved Merge Workflow:**
  - Temporary files kept after "Save as Current" for continued downloads
  - Temp files automatically cleared on next "Start Merge" or "Clear Log"
  - Users can download merge at any stage of workflow
- **Smart Archive Management** - Archives ALL files in /data/current/ when saving (handles filename changes)
- **Fresh Settings Fetching** - MergePage fetches current settings before merge/download/save (fixes stale props issue)
- **56+ Integration Tests** - Complete test coverage for Phase 3 merge workflow

### Changed
- **Merge File Handling** - Changed from move to copy strategy:
  - Before: `/data/tmp/file` → `/data/current/file` (deleted from tmp)
  - After: `/data/tmp/file` → `/data/current/file` (copy, file stays in tmp)
- **Archive Strategy** - Archives now store with timestamp suffix for version history:
  - Before: `merged.xml.gz.{timestamp}`
  - After: `{configured_filename}.{timestamp}`
- **Download Endpoint** - Moved from `/api/archives/download/` to `/api/merge/download/` for temp files
- **Settings Integration** - Output_filename now properly fetched fresh from backend (not cached props)
- **ArchivesPage Default Sort** - Current files now display first, then archives (by is_current flag)

### Fixed
- **Download After Save** - Users can now download merge after clicking "Save as Current" ✓
- **Filename Change Handling** - Old current files properly archived when output_filename changes ✓
- **Stale Settings** - MergePage now fetches fresh settings before each operation ✓
- **Multiple Files in Current** - Only one file now exists in /data/current/ at a time ✓
- **Clear Log Cleanup** - Properly cleans /data/tmp/ without affecting current or archives ✓

### Technical Details
- **Backend Changes:**
  - `config.py` - New directory configuration (tmp_dir, current_dir)
  - `merge_service.py` - Refactored execute_merge(), save_merge(), added clear_temp_files()
  - `main.py` - Added /api/merge/download/ and /api/merge/clear-temp endpoints
  - `archive_service.py` - Updated for new directory structure
- **Frontend Changes:**
  - `MergePage.js` - Fresh settings fetching, new download endpoint, clear-temp integration
  - `ArchivesPage.js` - Current files first sorting, both directory support
- **Test Coverage:**
  - `test_merge_api.py` - 28 new integration tests for Phase 3 workflow
  - All existing tests maintained and passing (total: 56+)

### Database
- No schema changes
- New setting key: `output_filename` (default: "merged.xml.gz")

### Deployment Notes
- Create `/data/tmp/`, `/data/current/`, `/data/archives/` directories
- Set appropriate permissions (755 for read/write)
- Old `/config/archives/` directory can be migrated to `/data/archives/`
- No breaking changes to existing API

### Testing Status
- ✅ 56+ integration tests passing
- ✅ 5/5 manual workflows validated
- ✅ All API endpoints tested
- ✅ Directory structure validated

---

## [0.4.3] - 2025-11-01

### Changed
- Documentation cleanup and consolidation
- CONTEXT.md restructured as primary AI conversation reference
- Removed duplicate CONTEXT files (root only, single source of truth)
- Added feature-to-code mapping in CONTEXT.md

### Technical
- All 64 tests continuing to pass
- No breaking changes

---

## [0.4.2] - 2025-10-29

### Changed
- **Settings Page:** Split into 7 focused sub-components with sidebar navigation
  - SettingsSummary - Overview display
  - SettingsOutput - Output filename config
  - SettingsSchedule - Merge scheduling (daily/weekly)
  - SettingsTimeouts - Download/merge timeouts
  - SettingsQuality - Channel drop threshold, archive cleanup
  - SettingsNotifications - Discord webhook config
  - SettingsPageOrchestrator - Main coordinator

- **Archives Page:** Split into 3 focused sub-components
  - ArchivesTable - Sortable table with metadata
  - ArchivesLegend - Status indicators and guides
  - ArchivesPageOrchestrator - Main coordinator

- **Dashboard:** Converted to pure monitoring display (removed "Run Now" button)

- **Archive Cleanup:** Simplified to single checkbox (`archive_retention_cleanup_expired`)

### Fixed
- Archive retention now properly tracks days included and expiration

### Tests
- 32 integration tests + 32 utility tests = 64 total passing
- Added comprehensive workflow tests

---

## [0.4.1] - 2025-10-29

### Changed
- **Backend Persistence:** Consolidated localStorage + SQLite pattern
  - SQLite is now **single source of truth**
  - Removed redundant dual-storage pattern
  
- **Version Management:** Centralized in `backend/version.py` only
  - No more manual syncing across 6+ files
  - Auto-sync to frontend, installer, documentation during build
  
- **Database Layer:** Simplified schema and methods
  - Removed redundant queries
  - Better error handling
  - ~15% reduction in backend complexity

- **Settings Service:** Centralized defaults in `SettingsService.DEFAULTS`
  - Single source of truth for default values
  - Removed duplicate defaults across codebase

### Technical Details
- Database schema unchanged (backward compatible)
- All APIs unchanged (no frontend modifications needed)
- Existing databases auto-migrate on startup
- Zero data loss, automatic backward compatibility

### Performance
- Fewer redundant database calls
- Cleaner connection management
- Faster settings retrieval

---

## [0.4.0] - 2025-10-29

### Added
- **Scheduled Merge Infrastructure** (cron-ready, not yet active)
  - Job execution framework
  - Job history tracking
  - Error handling and notifications
  - Discord webhook integration (ready to enable)

- **Job Service** (`backend/services/job_service.py`)
  - Full cron expression support
  - Job status tracking
  - Execution history with metrics

---

## [0.3.7] - 2025-10-28

### Changed
- Settings page: Cosmetic improvements
- Added Discord test notification button
- **Removed light mode** - Dark mode only
- Simplified CSS structure

### Removed
- Light mode toggle and all related CSS

---

## [0.3.6] - 2025-10-28

### Changed
- **Merge Page: "Save as Current" Enhancement**
  - One-time only button
  - Added `savedAsCurrent` state (sessionStorage)
  - Button becomes disabled after first use
  - Tooltip explains: "Current merged file has already been saved as current"
  - Summary card shows confirmation

- **Merge Page: Verbose Logging (Linux-style)**
  - Dynamic terminal-style logging with prefixes
  - `[*]` - Information/ongoing (blue)
  - `[+]` - Success/completed (green)
  - `[✓]` - Major success (green)
  - `[!]` - Warnings (yellow)
  - `[✗]` - Errors (red)
  - All phases logged: initialization → download → merge → write → completion

- **Progress Bar Visibility**
  - New `showProgressBar` state
  - Only shown during active merge
  - Hidden when "Clear Log" clicked
  - Auto-reset on component mount

### Fixed
- Green download button now always targets current version
- Removed 14-day download option pending URL confirmation

---

## [0.3.5] - 2025-10-28

### Changed
- **Archives Table:** Removed "Type" column, moved icon indicator beside filename
- **Archives Page:** Added legend section explaining status indicators

---

## [0.3.4] - 2025-10-28

### Fixed
- Archives table delete button now works correctly

---

## [0.3.3] - 2025-10-28

### Added
- **Days Included Column** in Archives table (shows 3, 7, or 14)
- MergePage displays current timeframe and feed type

### Fixed
- **Timeframe Persistence:** Now properly used in merge execution (was defaulting to 3)
- Timeframe selection no longer resets during page navigation

### Changed
- SourcesPage shows current preferences info box
- MergePage shows active timeframe and feed type

---

## [0.3.2] - 2025-10-28

### Added
- **Days Left Column** in Archives table
- Color-coded urgency indicators
  - 🟢 Green (3+ days) - Safe
  - 🟠 Orange (2 days) - Warning
  - 🟡 Yellow (1 day) - Urgent
  - 🔴 Red (0 days) - Expired

- Sortable Days Left column
- Enhanced legend explaining color scheme

### Technical
- Enhanced `calculateDaysLeft()` function for accurate calculations
- Formula: `created_at + days_included - today`

---

## [0.3.1] - 2025-10-28

### Added
- **Archive Versioning**
  - Unique temporary merge filenames with timestamp: `merged_YYYYMMDD_HHMMSS.xml.gz`
  - Archive metadata persistence (channels, programs, size, timestamp)
  - Automatic archiving of previous merge when saving new merge as current

- **Database Changes**
  - Archives table with metadata schema
  - Proper archive record creation on initialization

### Fixed
- **Merge Overwrites Issue**
  - Now creates unique temp files instead of overwriting
  - Previous versions properly archived with timestamp
  - "Save as Current" promotes temp to live location

### Changed
- **Merge Flow**
  - Execute creates temp file → User reviews → "Save as Current" promotes + archives previous
  - Archive filenames timestamped: `merged.xml.gz.YYYYMMDD_HHMMSS`
  - Improved logging during merge and archive operations

---

## [0.3.0] - 2025-10-27

### Added
- **Complete Settings Page Implementation**
  - Output filename configuration
  - Real-time cron expression generator
  - Merge schedule configuration (daily/weekly with time picker)
  - Custom day selection for weekly schedules
  - Download timeout settings (10-600 seconds)
  - Merge timeout settings (30-1800 seconds)
  - Quality control thresholds (channel drop %)
  - Archive retention policy configuration
  - Discord webhook support
  - Settings persistence to SQLite backend

- **Form Validation**
  - Filename format validation (.xml or .xml.gz)
  - Webhook URL format validation
  - Timeout range validation

- **User Feedback**
  - Real-time validation errors
  - Success confirmation messages
  - Cron expression display

### Changed
- Enhanced navbar with active Settings tab
- Improved settings UI/UX with helper text
- All settings now backed by SQLite database

### Fixed
- Settings page fully integrated and functional

---

## [0.2.1] - 2025-10-26

### Added
- **Archives Page Implementation**
  - Table view of all archives
  - Download functionality for each file
  - Archive metadata display (size, date, channels, programs)
  - Current file indicator

- **Merge Progress Enhancements**
  - Detailed merge logging
  - Color-coded terminal output
  - Better archive metadata storage

### Changed
- Improved MergePage UI with progress visualization
- Enhanced ProgressBar component with smooth animations
- Updated useApi hook with better error handling
- Improved archive service with detailed formatting
- Better merge service progress reporting

### Fixed
- Progress bar display issues
- Terminal log rendering improvements
- Error message handling

---

## [0.2.0] - 2025-10-25

### Added
- **Modular Installation System**
  - Fresh install mode
  - Update/upgrade mode (preserves data)
  - Reinstall mode (backup + fresh)
  - Custom directory selection during installation
  - Automatic backup creation during updates
  - Version detection and compatibility checking
  - Separate build and update scripts
  - Configuration persistence across updates
  - Backup and restore utilities
  - Version management script
  - Uninstaller with data preservation options

### Changed
- Restructured installation script for better maintainability
- Improved directory management
- Enhanced error handling and logging
- Service configuration now uses environment variables

### Fixed
- Installation path hardcoding issues
- Update process data preservation

---

## [0.1.0] - 2025-10-24

### Added
- **Initial Stable Release**
  - Sources selection and management
  - Channel filtering from sources
  - XML merge functionality
  - Archive management with download
  - Settings configuration
  - Dark/light mode theme
  - Export/import channel backups
  - Current merge tracking
  - Archive with timestamps
  - Real-time progress tracking
  - Terminal-style logging

### Technical Foundation
- FastAPI backend (Python 3.11+)
- React 18 frontend
- SQLite database
- Systemd service deployment
- Docker support
- Comprehensive test suite

---

## Version Management

Starting with v0.4.1, version is managed from a **single source of truth**:
- **Edit:** `backend/version.py` only
- **Auto-sync:** Frontend, installer, and documentation during build
- **Update CONTEXT.md:** After each version change

---

## Release Schedule

- **Patch releases** (0.X.Y): Weekly or as bugs found
- **Minor releases** (0.X.0): Monthly with new features
- **Major releases** (X.0.0): As needed for breaking changes

---

## Categories Used

- **Added:** New features
- **Changed:** Modified behavior
- **Fixed:** Bug fixes
- **Removed:** Deleted features
- **Deprecated:** Obsolete features
- **Security:** Security-related changes
- **Technical:** Internal improvements

---

**Latest Version:** 0.4.5  
**Maintainer:** di5cord20  
**Repository:** https://github.com/di5cord20/epg-merge