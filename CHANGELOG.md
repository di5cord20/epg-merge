# Changelog

All notable changes to EPG Merge Application will be documented in this file.

## [0.4.1] - 2025-10-29

### Changed
- **Backend Persistence:** Consolidated localStorage + SQLite pattern (SQLite now single source of truth)
- **Version Management:** Centralized in `backend/version.py` only (no manual syncing needed)
- **Database Layer:** Removed redundant methods, cleaner schema, better error handling
- **Settings Service:** Centralized defaults in `SettingsService.DEFAULTS` (removed duplicates)
- **Job History:** Added batch cleanup utility for old job records

### Fixed
- Eliminated duplicate settings storage patterns
- Removed version syncing across 6 different files (now automatic)
- Simplified database connection management

### Technical Details
- Database schema unchanged (backward compatible)
- All APIs unchanged (no frontend modifications needed)
- Performance improved: fewer redundant database calls
- Code cleaner: ~15% reduction in backend complexity

### Migration Notes
- Existing databases auto-migrate on startup
- No data loss
- Automatic backward compatibility

## [0.4.0] - 2025-10-29

### Added
- Cron job to automate merge
 
## [0.3.7] - 2025-10-28

### Changed
- Setting page: cosmetic changes + discord test notification button
- App.css/js: removed light mode
 
## [0.3.6] - 2025-10-28

### Changed
- Merge page:
  1. Save as Current - One-Time Only
  - Added savedAsCurrent state that persists in sessionStorage
  - Button becomes disabled after clicking
  - Tooltip shows: "Current merged file has already been saved as current"
  - Summary card shows "✓ Already saved as current merge" confirmation
  
  2. Verbose Logging - Linux-style Output
  - Changed from hardcoded messages to dynamic terminal-style logging
  - Uses consistent prefix notation:
    - [*] - Information/ongoing tasks (blue)
    - [+] - Success/completed tasks (green)
    - [✓] - Major success (green)
    - [!] - Warnings (yellow)
    - [✗] - Errors (red)
  - All phases logged: initialization → download → merge → write → completion
  - Matches Linux terminal update style
  3. Progress Bar Visibility
   - New showProgressBar state controls visibility
   - Only shows during active merge
   - Hidden when "Clear Log" is clicked
   - Hidden when navigating away and returning (auto-reset on component mount)
   - No more orphaned "%" indicator

### Fixed
- Merge page - Green download button will always download current version
- Removed 14 day download option - need to confirm urls with jesmann

## [0.3.5] - 2025-10-28

### Changed
- Archives table: removed Type column and moved icon indicator beside filename
- Archives page: added legend under table
  
# [0.3.4] - 2025-10-28

### Fixed
- Archives table - delete archived file button now works

## [0.3.3] - 2025-10-28

### Added
- Days Included column in Archives table showing timeframe (3, 7, 14)
- MergePage displays current timeframe and feed type being used

### Fixed
- Timeframe now properly used in merge execution (was always defaulting to 3 days)
- Timeframe selection no longer resets when navigating between pages

### Changed
- SourcesPage shows current preferences info box
- MergePage info box displays active timeframe and feed type
- Archives table column order: Programs → Days Included → Days Left

## [0.3.2] - 2025-10-28

### Added
- Days Left column in Archives table showing remaining days of programming
- Color-coded urgency indicators for Days Left:
  - Red (0 days) - expired
  - Yellow (1 day) - urgent
  - Orange (2 days) - warning
  - Green (3+ days) - safe
- Days Left column is sortable
- Enhanced legend explaining color scheme

### Changed
- Archives table layout improved with new Days Left column after Programs

### Technical
- Enhanced `calculateDaysLeft()` function for accurate date calculations
- Days left calculation based on `created_at + days_included - today`

## [0.3.1] - 2025-10-28

### Added
- Proper archive versioning with unique temporary merge filenames
- Archive metadata persistence (channels, programs, size, timestamp)
- Automatic archiving of previous merge when saving new merge as current

### Fixed
- Merge overwrites issue - now creates unique temp files instead
- "Save as Current" now properly archives previous version with timestamp
- Database schema - archives table creation on initialization

### Changed
- Merge flow: execute creates temp file → user reviews → "Save as Current" promotes it
- Archive filenames now timestamped (merged.xml.gz.YYYYMMDD_HHMMSS)
- Improved logging during merge and archive operations

## [0.3.0] - 2025-10-27

### Added
- Complete Settings page implementation
- Real-time cron expression generator
- Merge schedule configuration (daily/weekly)
- Custom timeout settings (download & merge)
- Quality control thresholds
- Archive retention policy
- Discord webhook support
- Settings persistence to backend database
- Form validation and user feedback

### Changed
- Enhanced navbar with active Settings tab
- Improved settings UI/UX with helper text
- Settings now fully backed by SQLite database

### Fixed
- Settings page now fully functional and integrated

## [0.2.1] - 2025-10-26

### Added
- Complete Archives page implementation with table view
- Download functionality for all archived files
- Enhanced merge progress tracking with detailed logs
- Color-coded terminal output in merge page
- Better archive metadata display

### Changed
- Improved MergePage UI with better progress visualization
- Enhanced ProgressBar component with smoother animations
- Updated useApi hook with better error handling
- Improved archive service with detailed formatting
- Better merge service progress reporting

### Fixed
- Progress bar display issues
- Terminal log rendering improvements
- Error message handling in merge operations
 
## [0.2] - 2025-10-25

### Added
- Modular installation system with upgrade support
- Custom directory selection during installation
- Automatic backup creation during updates
- Version detection and compatibility checking
- Separate build and update scripts
- Configuration persistence across updates
- Backup and restore utilities
- Version management script
- Uninstaller with data preservation options

### Changed
- Restructured installation script for maintainability
- Improved directory management
- Enhanced error handling and logging
- Service configuration now uses environment variables

### Fixed
- Installation path hardcoding issues
- Update process data preservation

## [0.1] - 2025-10-24

### Added
- Initial stable release
- Sources selection and management
- Channel filtering from sources
- XML merge functionality
- Archive management with download
- Settings configuration
- Dark/light mode theme
- Export/import channel backups
- Current merge tracking
- Archive with timestamps
```

3. Save

**Location**: `UPGRADE.md`

1. In root folder, create `UPGRADE.md`
2. Copy content from **Artifact #9** (xml_merge_upgrade_guide)
3. Save

**Location**: `MAINTAINER.md`

1. In root folder, create `MAINTAINER.md`
2. Copy content from **Artifact #11** (xml_merge_maintainer_readme)
3. Save

**Location**: `docs/QUICK_REFERENCE.md`

1. Navigate to `docs` folder, create `QUICK_REFERENCE.md`
2. Copy content from **Artifact #12** (xml_merge_quick_reference)
3. Save

**Location**: `LICENSE`

1. In root folder, create `LICENSE`
2. Choose a license (MIT example):
```
MIT License

Copyright (c) 2025 di5cord20

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.