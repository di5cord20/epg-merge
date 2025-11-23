# EPG Merge Application - Context for AI Conversations

---

⚠️ **IMPORTANT:** Update this file after each commit to keep it current for future AI conversations.  
**Current Version:** 0.4.8
**Last Updated:** November 23, 2025 (Channels Versioning & Configurable Paths Complete)  
**Status:** Production Ready | Tests: 56+/56+ passing

---

## 🚀 AI Development Workflow

This section guides how to use CONTEXT.md for productive AI conversations. Follow these phases for each development task.

### Setup: Before You Start

Prepare your request by providing:
1. This CONTEXT.md file (everything below)
2. A clear description of what you want to change
3. Access to provide code files when asked

### Phase 1: File Analysis & Planning

**What the AI does:**
1. Reads this CONTEXT.md to understand project architecture
2. Uses the **"Code Organization - By Feature"** section to identify affected files
3. Lists the specific files needed for review
4. **Asks you to confirm** or adjust the file list

**What you do:**
- Review the suggested files
- Add or remove any that are relevant
- Provide the files when asked
- Confirm you're ready to proceed

### Phase 2: Code Review & Implementation

**What the AI does:**
1. Reviews your provided code files
2. Provides recommendations (explains before implementing)
3. Creates code artifacts for changes
4. Explains changes in plain English
5. Highlights any dependencies

**What you do:**
- Review the recommendations
- Ask clarifying questions
- Provide feedback or additional context
- Copy code into your IDE when ready

### Phase 3: Testing & Validation

**What the AI does:**
1. Asks: "Should I create tests for this feature?"
2. Creates test artifacts if needed
3. Provides test commands to run locally
4. Validates breaking changes to existing APIs

**What you do:**
- Run tests locally
- Report any failures
- Confirm all tests pass before moving to Phase 4

### Phase 4: Documentation Updates

**What the AI does:**
Once code is complete, updates all documentation:
1. **CONTEXT.md** - Add/modify feature sections with diffs
2. **README.md** - Update if applicable with diffs
3. **CHANGELOG.md** - Add new version entry
4. **Other docs** - Checks if needed

**What you do:**
- Review all documentation changes
- Copy-paste updated sections into your files
- Confirm everything is accurate

### Phase 5: Git Commit Instructions

**What the AI does:**
Provides ready-to-copy git commands

**What you do:**
- Copy-paste the commands
- Run them in your terminal
- Verify the commit succeeded
- **Remember to update CONTEXT.md after pushing**

---

## 📊 Current Project State

**Current Version:** 0.4.8  
**Last Updated:** November 23, 2025 (Channels Versioning Complete)  
**Status:** Production Ready | Tests: 56+/56+ passing

---

## 🎯 Project Purpose

**EPG Merge** is a production-grade application that combines multiple XMLTV EPG (Electronic Program Guide) files from share.jesmann.com, filters them by selected channels, and produces merged XML files with full archive versioning, metadata tracking, optional scheduling, and channel version management.

**Key Use Case:** TV service providers need to merge multiple region-specific program guides into a single, deduplicated guide with specific channel filtering and scheduled automation.

---

## 📊 Technology Stack

```
Frontend:  React 18.2 (dark mode only, no light mode)
Backend:   FastAPI 0.115.5 with SQLite
Database:  SQLite 3.x (single file, /config/app.db)
Deployment: Docker / Systemd on Ubuntu/Debian
Testing:   Jest (frontend) + Pytest (backend) - 56+ tests passing
```

---

## 🗽 Architecture Overview

```
Architecture Overview (v0.4.8)

┌──────────────────────────────────────────────────────┐
│ Frontend (React 18)                     │
│ - 6 Pages + 10 Sub-components           │
│ - Fetches fresh settings before merge   │
│ - Download from /api/merge/download/    │
│ - Clear Log calls /api/merge/clear-temp │
└──────────────────────┬──────────────────┘
                 │ HTTP REST API
                 ↓
┌──────────────────────────────────────────────────────┐
│ Backend (FastAPI) - v0.4.8              │
│ ┌────────────────────────────────────┐   │
│ │ main.py (63 lines)               │   │
│ │ - Orchestrator pattern           │   │
│ │ - Service initialization         │   │
│ │ - Router registration            │   │
│ │ - Lifecycle & error handlers     │   │
│ └────────────────────────────────────┘   │
│               ↓                         │
│ ┌────────────────────────────────────────────┐ │
│ │ 7 Modular Routers (routers/)       │ │
│ │ - health.py (40 lines)             │ │
│ │ - sources.py (45 lines)            │ │
│ │ - channels.py (120 lines)          │ │
│ │ - merge.py (110 lines)             │ │
│ │ - archives.py (160 lines)          │ │
│ │ - settings.py (35 lines)           │ │
│ │ - jobs.py (110 lines)              │ │
│ └────────────────────────────────────────────┘ │
│               ↓                         │
│ ┌────────────────────────────────────────────┐ │
│ │ 6 Services (business logic)        │ │
│ │ - Source, Channel, Merge, Archive, │ │
│ │   Settings, Job Services           │ │
│ └────────────────────────────────────────────┘ │
│               ↓                         │
│ ┌────────────────────────────────────────────┐ │
│ │ Database & Configuration           │ │
│ │ - SQLite (app.db)                  │ │
│ │ - Environment variables            │ │
│ └────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────┘
                 │
        ┌────────┴────────┬─────────────┐
        ↓                 ↓             ↓
    /data/tmp/       /data/current/  /data/archives/
  (temporary)        (live file)     (timestamped backups)
        │                 │             │
        └─────────────────┴─────────────┘
                         ↓
                  /data/channels/
              (channel version backups)
                         │
                         +
              /config/app.db
          /data/epg_cache/
```

---

## 📁 Code Organization - By Feature

### Feature: Application Version (v0.4.8)
**Files:**
- `backend/version.py` - Single source of truth for version number
- `backend/routers/health.py` - Returns version via API

**What it does:**
- Centralized version management
- API returns version via `/api/health` endpoint
- Frontend fetches and displays version in navbar

**Important:** Use full import path in routers: `from backend.version import get_version`

---

### Feature: Configurable Directory Paths (v0.4.8)
**Files:**
- `backend/config.py` - Default path configuration
- `backend/services/settings_service.py` - Settings with new path keys
- `frontend/src/pages/settings/SettingsOutput.js` - UI for path configuration

**Settings Added:**
- `current_dir` - Where live merged files are stored (default: `/data/current`)
- `archive_dir` - Where archived files are stored (default: `/data/archives`)
- `channels_dir` - Where channel versions are stored (default: `/data/channels`)

**What it does:**
1. Users can customize directory locations in Settings → Output & Paths
2. All directory paths validated and required
3. Defaults match standard Docker structure
4. Services use configured paths for all file operations

**To modify:** Edit Settings Output panel or update `settings_service.py` DEFAULTS

---

### Feature: Channel Versioning with Archive/History (v0.4.8)
**Files:**
- `frontend/src/pages/ChannelsPage.js` - Save button triggers versioning workflow
- `backend/services/channel_service.py` - `save_selected_channels()` implements archive logic
- `backend/routers/channels.py` - `/api/channels/save` and `/api/channels/versions` endpoints
- `backend/database.py` - `channel_versions` table for metadata
- `frontend/src/pages/archives/ArchivesChannels.js` - New table component for channels
- `frontend/src/pages/ArchivesPage.js` - Updated to show channels panel

**What it does:**
1. User clicks "Save Channels" on Channels page
2. Backend archives previous version (if exists) with timestamp to `/data/channels/`
3. Saves current selection to `/data/channels/channels.json`
4. Stores metadata in `channel_versions` table
5. Archives page shows both current and archived channel versions
6. Users can download or delete archived versions

**Save Workflow:**
```
/data/channels/channels.json (current)
↓ (when saving new)
Archive → /data/channels/channels.json.{timestamp}
New save → /data/channels/channels.json (current)
```

**Database Table:**
```sql
CREATE TABLE channel_versions (
    filename TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    sources_count INTEGER,
    channels_count INTEGER,
    size_bytes INTEGER
)
```

**To modify:** Edit `channel_service.py` for save logic or `ArchivesChannels.js` for display

---

### Feature: Scheduled Merge with Dynamic Settings (v0.4.8)
**Files:**
- `backend/services/settings_service.py` - New settings keys
- `frontend/src/pages/settings/SettingsSchedule.js` - Enhanced UI
- `backend/services/job_service.py` - Updated `execute_scheduled_merge()`

**Settings Added:**
- `merge_timeframe` - EPG timeframe for scheduled jobs (3, 7, or 14 days)
- `merge_channels_version` - Which channels JSON to use for scheduled merge

**What it does:**
1. Settings → Schedule panel shows radio buttons for timeframe (3/7/14 days)
2. Dropdown to select which channels version to use
3. Scheduled merge uses these settings (not UI selections)
4. Jobs can use different channel versions without manual intervention

**UI Changes:**
- Timeframe selection (3/7/14 days) - separate from Sources page selection
- Channels version dropdown - dynamically populated from `/api/channels/versions`

**To modify:** Edit `SettingsSchedule.js` for UI or `job_service.py` for execution logic

---

### Feature: Application Constants (v0.4.5)
**Files:**
- `backend/constants.py` - Centralized configuration constants
- `backend/services/source_service.py` - Uses constants
- `backend/services/merge_service.py` - Uses constants

**What it does:**
1. Defines `FOLDER_MAP` - Single source of truth for folder mappings
2. Defines `UPDATE_FREQUENCIES` - Human-readable update info by timeframe
3. Provides `get_folder_name(timeframe, feed_type)` - Validates and returns folder path
4. Provides `get_update_frequency(timeframe)` - Returns update frequency description

**Folder Mapping:**
```python
FOLDER_MAP = {
    "3": {"iptv": "3dayiptv", "gracenote": "3daygracenote"},
    "7": {"iptv": "7dayiptv", "gracenote": "7daygracenote"},
    "14": {"iptv": "iptv", "gracenote": ""}
}
```

**To modify:** Edit `constants.py` to update mappings or validation functions

---

### Feature: Backend Router Architecture (v0.4.6)
**Files:**
- `backend/main.py` - Clean orchestrator (63 lines)
- `backend/routers/__init__.py` - Router package initialization
- 7 Router files in `backend/routers/` directory

**What it does:**
1. Modular routers (each 35-160 lines, focused)
2. `main.py` becomes clean orchestrator with dependency injection
3. Each router has `init_*_routes(dependencies)` function
4. All endpoints preserved at same paths
5. Follows FastAPI best practices

**Benefits:**
- Easy to locate endpoints by feature
- Easy to test independently
- Easy to extend with new routers
- Better code organization
- Faster development

**To modify:** Edit specific router for that endpoint

---

### Feature: Scheduled Merge Execution with Monitoring (v0.4.7)
**Files:**
- `backend/services/job_service.py` - Job execution with memory tracking
- `backend/routers/jobs.py` - Job management endpoints
- `backend/main.py` - Scheduler initialization
- `frontend/src/pages/DashboardPage.js` - Job history display

**What it does:**
1. Runs scheduled merges based on user settings
2. Tracks peak memory usage via `psutil`
3. Sends Discord notifications with 8 statistics
4. Stores job history with execution details
5. Clear History button to delete all job records
6. Manual merge trigger for testing

**Scheduler:**
- Runs as background async task
- Reads merge_schedule, merge_time, merge_days, merge_timeframe
- Calculates next run using croniter
- Survives settings changes (recalculates on each cycle)
- Logs to container via docker compose logs

**To modify:** `job_service.py` for scheduling or notification logic

---

### Feature: Source Selection & Loading
**Files:**
- `frontend/src/pages/SourcesPage.js` - UI for selecting timeframe and sources
- `backend/services/source_service.py` - Fetches available XML files
- `backend/constants.py` - Folder mapping constants
- `backend/routers/sources.py` - REST endpoints

**What it does:**
1. Fetches available XML files from share.jesmann.com
2. Displays available vs. selected sources in dual-list UI
3. Persists selection to localStorage and backend
4. Uses validated folder paths from constants

**To modify:** Start in `SourcesPage.js` for UI, then `source_service.py`

---

### Feature: Channel Management
**Files:**
- `frontend/src/pages/ChannelsPage.js` - Channel selection UI
- `backend/services/channel_service.py` - Load channels and versioning
- `backend/routers/channels.py` - Channel endpoints
- `frontend/src/components/DualListSelector.js` - Reusable dual-list component

**What it does:**
1. Loads channel IDs from `*_channel_list.txt` files
2. Filters channels by ID during merge
3. Supports save/export/import of channels
4. Implements channel versioning with archive

**To modify:** `ChannelsPage.js` for UI, `channel_service.py` for logic

---

### Feature: Merge Execution & Download (v0.4.4+)
**Files:**
- `frontend/src/pages/MergePage.js` - Orchestrates merge workflow
- `backend/services/merge_service.py` - XML merging logic
- `backend/routers/merge.py` - Merge endpoints
- `backend/constants.py` - Folder validation

**What it does:**
1. User starts merge with sources, channels, timeframe, feed_type
2. Backend clears `/data/tmp/`, fetches and merges files
3. Merge creates temp file: `/data/tmp/{output_filename}`
4. User downloads from temp or saves as current
5. Save archives previous version and copies to `/data/current/`
6. User can download again from temp or current

**Key Improvements:**
- Configurable output filename (v0.4.4)
- Folder validation via constants (v0.4.5)
- Configurable directory paths (v0.4.8)

**To modify:** `merge_service.py` for logic, constants for folder mappings

---

### Feature: Archive Management (v0.4.8)
**Files:**
- `frontend/src/pages/ArchivesPage.js` - Main orchestrator
- `frontend/src/pages/archives/ArchivesTable.js` - Merged files table
- `frontend/src/pages/archives/ArchivesChannels.js` - Channels table (NEW v0.4.8)
- `backend/services/archive_service.py` - Archive operations
- `backend/routers/archives.py` - Archive endpoints
- `backend/database.py` - Archives and channel_versions tables

**What it does:**
1. **Merged Files Panel:**
   - Lists current file (from `/data/current/`) + archived files
   - Green indicator for current, archive icon for older versions
   - Shows color-coded "Days Left" urgency
   - Download/delete actions
   
2. **Channel Versions Panel (NEW):**
   - Lists current and archived channel JSON files
   - Shows sources count, channels count, created date, size
   - Download/delete actions (cannot delete current)
   - Independent sorting

**Database:**
```sql
archives table - merged EPG file metadata
channel_versions table - channel JSON file metadata
```

**Download/Delete Logic:**
- Merged files: Use `archive_service.get_archive_path()` → works with configured paths
- Channels: Use `channel_service.get_channel_version_path()` → works with configured channels_dir

**To modify:** `ArchivesPage.js` for orchestration, table components for display, services for logic

---

### Feature: Settings Configuration
**Files:**
- `frontend/src/pages/SettingsPage.js` - Settings orchestrator
- `frontend/src/pages/settings/*.js` - 8 sub-components (v0.4.8: added Paths)
- `backend/services/settings_service.py` - Settings CRUD
- `backend/routers/settings.py` - Settings endpoints
- `backend/database.py` - Settings table

**What it does:**
1. Manages 16+ configuration keys (see below)
2. Panel-based UI with individual Save buttons
3. Centralized defaults in `SettingsService.DEFAULTS`
4. Real-time cron expression generation

**Settings Keys (v0.4.8):**
```python
# Output Files
output_filename: "merged.xml.gz"
channels_filename: "channels.json"

# Directory Paths
current_dir: "/data/current"
archive_dir: "/data/archives"
channels_dir: "/data/channels"

# Merge Schedule
merge_schedule: "daily" | "weekly"
merge_time: "HH:MM"
merge_days: JSON array
merge_timeframe: "3" | "7" | "14"
merge_channels_version: "channels.json"

# Timeouts & Quality
download_timeout: int (seconds)
merge_timeout: int (seconds)
channel_drop_threshold: string

# Retention & Notifications
archive_retention_cleanup_expired: boolean
discord_webhook: string

# UI Selections (not used by scheduler)
selected_timeframe: "3" | "7" | "14"
selected_feed_type: "iptv" | "gracenote"
```

**To modify:** Sub-components in `settings/` for individual panels

---

### Feature: Dashboard & Job Monitoring
**Files:**
- `frontend/src/pages/DashboardPage.js` - Pure monitoring display
- `backend/services/job_service.py` - Job execution and history
- `backend/routers/jobs.py` - Job endpoints
- `backend/database.py` - Job history table

**What it does:**
1. Shows job status (running/idle)
2. Displays next scheduled run time
3. Shows latest job execution details
4. Lists job history with pagination

**To modify:** `DashboardPage.js` for UI, `job_service.py` for execution logic

---

### Feature: Database & Persistence (v0.4.8)
**Files:**
- `backend/database.py` - SQLite wrapper with automatic migrations
- `backend/config.py` - Path and environment configuration

**Tables:**
```sql
channels_selected       -- Selected channel IDs
settings               -- Configuration key-value pairs
archives               -- Archive metadata (merged files)
channel_versions       -- Channel version metadata (NEW v0.4.8)
job_history            -- Scheduled job execution records
```

**To modify:** `database.py` for schema, `config.py` for paths

---

## 📌 API Endpoints Summary

### Sources
```
GET  /api/sources/list?timeframe=3&feed_type=iptv
POST /api/sources/select
```

### Channels
```
GET  /api/channels/from-sources?sources=file1.xml.gz,file2.xml.gz
POST /api/channels/select (legacy)
POST /api/channels/save (with versioning)
GET  /api/channels/selected
GET  /api/channels/versions
POST /api/channels/export
POST /api/channels/import
```

### Merge
```
POST /api/merge/execute
GET  /api/merge/download/{filename}
GET  /api/merge/current
POST /api/merge/save
POST /api/merge/clear-temp
```

### Archives
```
GET  /api/archives/list
GET  /api/archives/download/{filename}
GET  /api/archives/download-channel/{filename} (NEW v0.4.8)
DELETE /api/archives/delete/{filename}
DELETE /api/archives/delete-channel/{filename} (NEW v0.4.8)
POST /api/archives/cleanup
```

### Settings
```
GET  /api/settings/get
POST /api/settings/set
```

### Jobs
```
GET  /api/jobs/status
GET  /api/jobs/history?limit=50
GET  /api/jobs/latest
POST /api/jobs/execute
POST /api/jobs/execute-now
POST /api/jobs/cancel
```

### Health
```
GET /api/health
GET /api/status
```

---

## 📚 Documentation

**Structure:** Flat `/docs` folder  
**Total Files:** 10 main documentation files + historical archive  
**Status:** Current for v0.4.8

| File | Purpose |
|------|---------|
| `docs/README.md` | Documentation hub and navigation |
| `docs/QUICK_START.md` | 5-minute setup guide |
| `docs/ARCHITECTURE.md` | System design and components |
| `docs/API-SPEC.md` | Complete REST API documentation |
| `docs/DEPLOYMENT.md` | Production deployment workflows |
| `docs/SCHEDULING.md` | Job scheduling setup |
| `docs/DEVELOPMENT.md` | Local dev environment |
| `docs/TROUBLESHOOTING.md` | Common issues and solutions |
| `docs/MAINTENANCE.md` | Monitoring and backups |
| `docs/QUICK_REFERENCE.md` | Commands and templates |

---

## 🧪 Testing

**Frontend Tests:** 64 total  
**Backend Tests:** Unit + Integration  
**Run Tests:**
```bash
npm test                    # All tests
npm test -- --coverage     # With coverage
```

---

## 💾 Database Schema (v0.4.8)

### channels_selected
```sql
channel_name TEXT PRIMARY KEY
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### settings
```sql
key TEXT PRIMARY KEY
value TEXT
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

### archives
```sql
filename TEXT PRIMARY KEY
created_at TIMESTAMP
channels INTEGER
programs INTEGER
days_included INTEGER
size_bytes INTEGER
```

### channel_versions (NEW v0.4.8)
```sql
filename TEXT PRIMARY KEY
created_at TIMESTAMP
sources_count INTEGER
channels_count INTEGER
size_bytes INTEGER
```

### job_history
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
job_id TEXT UNIQUE NOT NULL
status TEXT (pending|running|success|failed|timeout)
started_at TIMESTAMP NOT NULL
completed_at TIMESTAMP
merge_filename TEXT
channels_included INTEGER
programs_included INTEGER
file_size TEXT
peak_memory_mb REAL
days_included INTEGER
error_message TEXT
execution_time_seconds REAL
```

---

## 🚀 Deployment Files

### Installation
- `install/install.sh` - Automated installer
- `install/uninstall.sh` - Safe uninstaller

### Utilities
- `scripts/build.sh` - Build and restart
- `scripts/backup.sh` - Create backups
- `scripts/restore.sh` - Restore from backups
- `scripts/update.sh` - Update app
- `scripts/version.sh` - Version info

### Docker
- `docker-compose.yml` - Multi-container setup
- `backend/Dockerfile` - Python 3.11
- `frontend/Dockerfile` - Node → Nginx
- `frontend/nginx.conf` - Reverse proxy

### Systemd
- `systemd/epg-merge.service` - Service unit

---

## 📋 Common Development Tasks

### Add a New Setting
1. Add key to `SettingsService.DEFAULTS`
2. Create UI component in `frontend/src/pages/settings/SettingsXXX.js`
3. Add to `SettingsPage.js` navigation
4. Test via `/api/settings/get` and `/api/settings/set`

### Add an API Endpoint
1. Add service method in `backend/services/`
2. Add route in appropriate `backend/routers/` file
3. Add test in `backend/tests/`
4. Call from frontend via `useApi()` hook

### Modify Merge Logic
1. Edit `backend/services/merge_service.py`
2. Test locally: `cd backend && python -m pytest tests/`
3. Update integration tests if behavior changes

### Add Completely New Router
1. Create `backend/routers/newfeature.py` with `init_newfeature_routes()`
2. Import in `main.py` and call `init_newfeature_routes()`
3. Register with `app.include_router(router)`

---

## 🛠 Quick Debugging

**Service not starting?**
```bash
docker compose logs backend
```

**Database issue?**
```bash
sqlite3 /config/app.db "PRAGMA integrity_check;"
```

**Frontend not loading?**
```bash
curl http://localhost:9193/api/health
```

**Import errors in routers?**
- Use full import path: `from backend.module import function`
- Example: `from backend.version import get_version`

---

## 📝 Version History Summary (Recent)

| Version | Date | Major Changes |
|---------|------|---------------|
| 0.4.8 | Nov 23, 2025 | Channel versioning, configurable paths, merge_timeframe setting, merged Archives UI with channels panel |
| 0.4.7 | Nov 2, 2025 | Scheduled merge monitoring, memory tracking, enhanced Discord notifications |
| 0.4.6 | Nov 2, 2025 | Router refactoring, modular architecture |
| 0.4.5 | Nov 1, 2025 | Centralized constants, folder validation |
| 0.4.4 | Nov 1, 2025 | Configurable filename, new directory structure |

---

## 🎓 Key Concepts

**Timeframe:** 3, 7, or 14 days of EPG data  
**Feed Type:** IPTV or Gracenote  
**Channel Filtering:** Exact ID matching against channel lists  
**Smart Caching:** HTTP HEAD to check for remote changes  
**Archive Workflow:** Temp file → Review → "Save as Current" → Previous archived  
**Channel Versioning:** Current + timestamped archives with metadata  
**Directory Structure:** /data/{tmp, current, archives, channels, epg_cache}  
**Merge Workflow:** Temp → Download → Save as Current (copies, not moves) → Archive previous  
**Scheduled Jobs:** Uses merge_timeframe and merge_channels_version settings  

---

## ✅ Git Commit Checklist

Before committing, ensure:
- [ ] All tests pass locally
- [ ] Code follows existing patterns
- [ ] No console errors in browser
- [ ] Backend logs clean (docker compose logs)
- [ ] CONTEXT.md updated with new features
- [ ] README.md updated if user-facing changes
- [ ] Version bumped if needed

---

## 📞 Support Resources

- **Documentation:** `docs/README.md`
- **Quick Start:** `docs/QUICK_START.md`
- **API Help:** `docs/API-SPEC.md`
- **Troubleshooting:** `docs/TROUBLESHOOTING.md`

---

**🎯 Remember:** This file is your persistent memory. Update it after every commit so the next AI conversation stays perfectly in sync with your codebase!