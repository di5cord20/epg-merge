# Changelog - EPG Merge Application

All notable changes to the EPG Merge Application are documented in this file.

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