# Changelog - EPG Merge Application

All notable changes to the EPG Merge Application are documented in this file.

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

**Latest Version:** 0.4.3  
**Maintainer:** di5cord20  
**Repository:** https://github.com/di5cord20/epg-merge