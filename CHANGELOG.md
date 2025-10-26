# Changelog

All notable changes to EPG Merge Application will be documented in this file.

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