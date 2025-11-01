# EPG Merge Application - Context for AI Conversations

---

⚠️ **IMPORTANT:** Update this file after each commit to keep it current for future AI conversations.  
**Last Updated:** November 1, 2025

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
3. Lists the specific files needed for review in this format:

```
## Files Needed for Review

Based on your request, I'll need to review these files:

**Frontend Files:**
- frontend/src/pages/SettingsPage.js (reason: orchestrates settings layout)
- frontend/src/pages/settings/SettingsNotifications.js (reason: where Discord config lives)

**Backend Files:**
- backend/services/job_service.py (reason: job execution and notifications)
- backend/main.py (reason: API endpoints)

**Database Files:**
- backend/database.py (reason: job_history table schema)

**Test Files:**
- backend/tests/integration/test_api.py (reason: API contract tests)

**Documentation Files:**
- CONTEXT.md (reason: needs updating after changes)
```

4. **Asks you to confirm** or adjust the file list

**What you do:**
- Review the suggested files
- Add or remove any that are relevant
- Provide the files when asked
- Confirm you're ready to proceed

---

### Phase 2: Code Review & Implementation

**What the AI does:**
1. Reviews your provided code files
2. Provides recommendations (explains before implementing)
3. Creates code artifacts for:
   - New files to create
   - Significant modifications to existing files
   - Database schema changes
   - API endpoint changes
4. Explains changes in plain English
5. Highlights any dependencies

**What you do:**
- Review the recommendations
- Ask clarifying questions
- Provide feedback or additional context
- Copy code into your IDE when ready

---

### Phase 3: Testing & Validation

**What the AI does:**
1. Asks: "Should I create tests for this feature?"
2. Creates test artifacts if needed (Jest/pytest)
3. Provides test commands to run locally
4. Validates breaking changes to existing APIs

**What you do:**
- Run tests locally: `npm test` or `pytest tests/`
- Report any failures
- Confirm all tests pass before moving to Phase 4

---

### Phase 4: Documentation Updates

**What the AI does:**
Once code is complete, updates all documentation:

1. **CONTEXT.md** - Add/modify feature sections
   - Feature name and description
   - Which files implement it
   - Database schema changes (if any)
   - API endpoints (if changed)
   - Shows the diffs/updated sections

2. **README.md** - Update if applicable
   - Features list
   - Tech stack changes
   - File structure
   - Shows the diffs/updated sections

3. **CHANGELOG.md** - Add new version entry
   - Format: Added/Changed/Fixed
   - Specific changes (not generic)
   - Provides complete section ready to copy

4. **Other docs** - Checks if needed
   - docs/ARCHITECTURE.md (if architecture changed)
   - docs/API-SPEC.md (if APIs changed)
   - Asks before modifying

**What you do:**
- Review all documentation changes
- Copy-paste the updated sections into your files
- Confirm everything is accurate

---

### Phase 5: Git Commit Instructions

**What the AI does:**
Provides ready-to-copy git commands:

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "feat: Feature Name - v0.4.4

- Specific change 1
- Specific change 2
- Updated CONTEXT.md, README.md, CHANGELOG.md"

# Tag the version (if releasing)
git tag -a v0.4.4 -m "Version 0.4.4 - Feature Name"

# Push changes
git push origin main
git push origin v0.4.4  # If tagged
```

**What you do:**
- Copy-paste the commands
- Run them in your terminal
- Verify the commit succeeded
- **Remember to update CONTEXT.md after pushing** (for next conversation)

---

## How to Start a Conversation

**Copy this template and fill it in:**

```
I'm working on a feature for EPG Merge Application.

Here's my CONTEXT.md (current project state):
[PASTE ALL OF CONTEXT.md]

Here's what I want to change:
[DESCRIBE YOUR REQUEST]

I'm ready to proceed to Phase 1 and provide files.
```

**That's it!** The AI will take it from there and guide you through all 5 phases.

---

## Important Principles

- **One feature per workflow** - If you have 3 changes, do 3 separate workflows (cleaner commits)
- **CONTEXT.md is your single source of truth** - Update it after every commit
- **Avoid token waste** - Only ask for specific files, never the entire repo
- **Test everything** - Even small changes can have side effects
- **Documentation-first** - Update docs before committing so nothing is forgotten

---

---

## 📊 Current Project State

**Current Version:** 0.4.3  
**Last Updated:** November 1, 2025  
**Status:** Production Ready | Tests: 64/64 passing

---

## 🎯 Project Purpose

**EPG Merge** is a production-grade application that combines multiple XMLTV EPG (Electronic Program Guide) files from share.jesmann.com, filters them by selected channels, and produces merged XML files with full archive versioning, metadata tracking, and optional scheduling.

**Key Use Case:** TV service providers need to merge multiple region-specific program guides into a single, deduplicated guide with specific channel filtering.

---

## 📊 Technology Stack

```
Frontend:  React 18.2 (dark mode only, no light mode)
Backend:   FastAPI 0.115.5 with SQLite
Database:  SQLite 3.x (single file, /config/app.db)
Deployment: Docker / Systemd on Ubuntu/Debian
Testing:   Jest (frontend) + Pytest (backend) - 64 tests passing
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│ Frontend (React 18)                     │
│ - 6 Pages + 10 Sub-components           │
│ - 3 Custom Hooks                        │
│ - Inline CSS (dark mode)                │
└────────────────┬────────────────────────┘
                 │ HTTP REST API
                 ↓
┌────────────────────────────────────────┐
│ Backend (FastAPI)                      │
│ - 6 Services (business logic)          │
│ - 13 API endpoints                     │
│ - Database layer (SQLite)              │
└────────────────────────────────────────┘
                 │
                 ↓
        ┌────────────────┐
        │ SQLite (app.db)│
        └────────────────┘
```

---

## 📂 Code Organization - By Feature

### Feature: Source Selection & Loading
**Files:**
- `frontend/src/pages/SourcesPage.js` - UI for selecting timeframe, feed type, sources
- `backend/services/source_service.py` - Fetches available XML files from share.jesmann.com
- `backend/main.py` → `/api/sources/list` - GET endpoint
- `backend/main.py` → `/api/sources/select` - POST endpoint

**What it does:**
1. Fetches available XML files from share.jesmann.com based on timeframe (3/7/14 days) and feed type (iptv/gracenote)
2. Displays available vs. selected sources in dual-list UI
3. Persists selection to localStorage (client) and backend settings

**To modify:** Start in `SourcesPage.js` for UI, then `source_service.py` for backend logic.

---

### Feature: Channel Management
**Files:**
- `frontend/src/pages/ChannelsPage.js` - Channel selection UI with export/import
- `backend/services/channel_service.py` - Load channels from sources, save selections
- `backend/main.py` → `/api/channels/*` - Multiple endpoints
- `frontend/src/components/DualListSelector.js` - Reusable dual-list component

**What it does:**
1. Loads channel IDs from `*_channel_list.txt` files on share.jesmann.com
2. Filters channels by ID during merge
3. Supports backup/restore of channel selections as JSON

**To modify:** `ChannelsPage.js` for UI, `channel_service.py` for logic, `DualListSelector.js` for list behavior.

---

### Feature: Merge Execution & Progress
**Files:**
- `frontend/src/pages/MergePage.js` - Merge UI with progress, logs, download
- `backend/services/merge_service.py` - Core merge logic (iterparse XML streaming)
- `frontend/src/components/Terminal.js` - Log display with color coding
- `frontend/src/components/ProgressBar.js` - Progress visualization
- `backend/main.py` → `/api/merge/execute` - Merge endpoint
- `backend/main.py` → `/api/merge/save` - Save as current endpoint

**What it does:**
1. Downloads XML files with smart caching (HTTP HEAD checks)
2. Uses iterparse for memory-efficient streaming
3. Filters channels by ID, deduplicates programs
4. Creates temporary timestamped file for review
5. User can download or "Save as Current" (archives previous)

**Key Logic:**
- Temp file naming: `merged_YYYYMMDD_HHMMSS.xml.gz`
- Current file: `merged.xml.gz`
- Archive format: `merged.xml.gz.YYYYMMDD_HHMMSS`

**To modify:** `merge_service.py` for merge logic, `MergePage.js` for UI/UX, Terminal/ProgressBar for display.

---

### Feature: Archive Management
**Files:**
- `frontend/src/pages/ArchivesPage.js` - Archive table orchestrator
- `frontend/src/pages/archives/ArchivesTable.js` - Sortable table component
- `frontend/src/pages/archives/ArchivesLegend.js` - Status/urgency guide
- `backend/services/archive_service.py` - Archive list, cleanup, metadata
- `backend/main.py` → `/api/archives/*` - Archive endpoints
- `backend/database.py` - Archives table schema

**What it does:**
1. Lists current file + all timestamped archives with metadata
2. Shows color-coded "Days Left" urgency (Green→Orange→Red)
3. Supports download and delete (prevents deleting current)
4. Automatic cleanup based on retention policy

**Database:**
```sql
CREATE TABLE archives (
  filename TEXT PRIMARY KEY,
  created_at TIMESTAMP,
  channels INTEGER,
  programs INTEGER,
  days_included INTEGER,
  size_bytes INTEGER
)
```

**To modify:** `ArchivesPage.js` for orchestration, `ArchivesTable.js` for display, `archive_service.py` for backend logic.

---

### Feature: Settings Configuration
**Files:**
- `frontend/src/pages/SettingsPage.js` - Settings orchestrator (sidebar + panels)
- `frontend/src/pages/settings/*.js` - 7 sub-components (Summary, Output, Schedule, Timeouts, Quality, Notifications)
- `backend/services/settings_service.py` - Settings CRUD with defaults
- `backend/main.py` → `/api/settings/get`, `/api/settings/set`
- `backend/database.py` - Settings table

**What it does:**
1. Manages 9 configuration keys (see below)
2. Panel-based UI with individual Save buttons
3. Centralized defaults in `SettingsService.DEFAULTS`
4. Real-time cron expression generation for scheduling

**Settings Keys:**
```python
output_filename: string (default: "merged.xml.gz")
merge_schedule: "daily" | "weekly"
merge_time: "HH:MM" (UTC)
merge_days: JSON array of 0-6 (weekdays)
download_timeout: int (seconds)
merge_timeout: int (seconds)
channel_drop_threshold: string ("" = disabled)
archive_retention_cleanup_expired: boolean
discord_webhook: string (optional)
```

**To modify:** Sub-components in `settings/` for individual panels, `SettingsPage.js` for orchestration, `settings_service.py` for backend.

---

### Feature: Dashboard & Job Monitoring
**Files:**
- `frontend/src/pages/DashboardPage.js` - Pure monitoring display
- `backend/services/job_service.py` - Job execution, history, notifications
- `backend/main.py` → `/api/jobs/*` - Job endpoints
- `backend/database.py` - Job history table

**What it does:**
1. Shows job status (running/idle)
2. Displays next scheduled run time
3. Shows latest job execution details
4. Lists job history with filters

**Note:** Dashboard is **read-only** (no "Run Now" button). Merges run via schedule or manual API calls.

**To modify:** `DashboardPage.js` for UI, `job_service.py` for job execution logic.

---

### Feature: Scheduled Merge Execution (Infrastructure Ready)
**Files:**
- `backend/services/job_service.py` - Full implementation ready
- `backend/main.py` → `/api/jobs/execute` - Manual trigger endpoint
- `backend/database.py` - Job history table

**Current State:** Infrastructure is 100% complete and working. Scheduled execution via cron is **not yet active** in production but can be enabled.

**What's ready:**
- Cron expression generation
- Job execution with error handling
- Job history tracking
- Discord notifications (code present, not triggering)
- Database persistence

**To enable:** Activate cron scheduler in job_service.py initialization.

**To modify:** `job_service.py` for scheduling logic.

---

### Feature: Database & Persistence
**Files:**
- `backend/database.py` - SQLite wrapper (240 lines)
- `backend/config.py` - Environment and path configuration
- Database location: `/config/app.db` (production) or `config/app.db` (dev)

**Tables:**
```sql
channels_selected      -- Selected channel IDs
settings               -- Configuration key-value pairs
archives               -- Archive metadata
job_history            -- Scheduled job records
```

**To modify:** `database.py` for schema changes, `config.py` for path/env handling.

---

## 🔌 API Endpoints Summary

### Sources
```
GET  /api/sources/list?timeframe=3&feed_type=iptv
POST /api/sources/select
```

### Channels
```
GET  /api/channels/from-sources?sources=file1.xml.gz,file2.xml.gz
GET  /api/channels/selected
POST /api/channels/select
POST /api/channels/export
POST /api/channels/import
```

### Merge
```
POST /api/merge/execute
GET  /api/merge/current
POST /api/merge/save
```

### Archives
```
GET /api/archives/list
GET /api/archives/download/{filename}
DELETE /api/archives/delete/{filename}
POST /api/archives/cleanup
```

### Settings
```
GET  /api/settings/get
POST /api/settings/set
```

### Jobs (Scheduled)
```
GET  /api/jobs/status
GET  /api/jobs/history?limit=50
GET  /api/jobs/latest
POST /api/jobs/execute          -- Manual trigger
POST /api/jobs/cancel
```

### Health
```
GET /api/health
GET /api/status
```

---

## 📚 Documentation

**Structure:** Flat organization in `/docs` folder (no subdirectories)  
**Total Files:** 10 main documentation files + 1 historical archive folder  
**Last Updated:** November 1, 2025  
**Status:** All current for v0.4.3

### Main Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `docs/README.md` | Documentation hub and navigation map | Everyone - start here! |
| `docs/QUICK_START.md` | 5-minute local setup guide | New developers |
| `docs/ARCHITECTURE.md` | System design, components, database | Developers, architects |
| `docs/API-SPEC.md` | Complete REST API documentation with examples | Developers, integrators |
| `docs/DEPLOYMENT.md` | Production deployment workflows and procedures | DevOps, operators |
| `docs/SCHEDULING.md` | Job scheduling and automation setup | Operators, developers |
| `docs/DEVELOPMENT.md` | Local dev environment, testing, coding standards | Developers |
| `docs/TROUBLESHOOTING.md` | Common issues, diagnostics, solutions | Everyone |
| `docs/MAINTENANCE.md` | Monitoring, backups, updates, database maintenance | Operators |
| `docs/QUICK_REFERENCE.md` | Commands, templates, checklists | Developers, operators |

### Historical Archive

- `docs/archive/` - Previous documentation versions (preserved for reference)
  - Contains: CONTEXT-ACTIVE.md, CONTEXT_CURRENT.md, DESIGN-PATTERNS.md, etc.
  - Purpose: Historical reference, not used in current workflows

### How Docs Are Organized

The docs are organized by **user task**, not by system component:

1. **New user?** → Start with `docs/README.md`, then `docs/QUICK_START.md`
2. **Want to understand the system?** → Read `docs/ARCHITECTURE.md`
3. **Need to integrate via API?** → See `docs/API-SPEC.md`
4. **Setting up production?** → Follow `docs/DEPLOYMENT.md`
5. **Stuck with an issue?** → Check `docs/TROUBLESHOOTING.md`
6. **Contributing code?** → See `docs/DEVELOPMENT.md`

### Key Features

- ✅ **No duplication** - Each topic documented once, in the right place
- ✅ **Flat structure** - All docs at same level, easy to navigate
- ✅ **Cross-linked** - Clear links between related topics
- ✅ **Copy-paste ready** - Commands, code examples, templates ready to use
- ✅ **Version aligned** - All current for v0.4.3

### Recent Documentation Changes (v0.4.3)

**What changed:**
- Consolidated 8 files from `deployment/`, `development/`, `maintenance/` directories
- Eliminated 100% of documentation duplication
- Created new QUICK_START.md for onboarding
- Created new SCHEDULING.md for job automation
- Expanded MAINTENANCE.md with comprehensive guidance
- Expanded API-SPEC.md with all current endpoints
- Updated README.md to serve as documentation hub

**File count reduction:**
- Before: 18 files across 4 directories (46.9 KB)
- After: 10 files in flat structure (31 KB)
- Reduction: 58% fewer files, zero duplication

---

## 🧪 Testing

**Frontend Tests (64 total):**
- `frontend/src/__tests__/frontend.test.js` - 32 utility + config tests
- `frontend/src/__tests__/integration.test.js` - 32 API contract + workflow tests

**Run Tests:**
```bash
npm test                    # All tests
npm test -- --coverage     # With coverage report
npm test -- frontend.test.js  # Frontend only
npm test -- integration.test.js  # Integration only
```

**Backend Tests:**
- `backend/tests/unit/test_database.py` - Database layer
- `backend/tests/integration/test_api.py` - API endpoints

---

## 💾 Database Schema

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

### job_history
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
job_id TEXT UNIQUE NOT NULL
status TEXT (pending|running|success|failed)
started_at TIMESTAMP NOT NULL
completed_at TIMESTAMP
merge_filename TEXT
channels_included INTEGER
programs_included INTEGER
file_size TEXT
error_message TEXT
execution_time_seconds REAL
```

---

## 🚀 Deployment Files

### Installation
- `install/install.sh` - Full automated installer (fresh/update mode)
- `install/uninstall.sh` - Safe uninstaller with backup

### Utilities
- `scripts/build.sh` - Build frontend, deploy to backend, restart
- `scripts/backup.sh` - Create comprehensive backups
- `scripts/restore.sh` - Restore from backups
- `scripts/update.sh` - Update app and dependencies
- `scripts/version.sh` - Version info and health checks

### Docker
- `docker-compose.yml` - Multi-container setup
- `backend/Dockerfile` - Backend image (Python 3.11)
- `frontend/Dockerfile` - Frontend image (Node → Nginx)
- `frontend/nginx.conf` - Nginx reverse proxy config

### Systemd
- `systemd/epg-merge.service` - Service unit file

---

## 📋 Common Development Tasks

### Add a New Setting
1. Add key to `SettingsService.DEFAULTS` in `backend/services/settings_service.py`
2. Create UI component in `frontend/src/pages/settings/SettingsXXX.js`
3. Add to `SettingsPage.js` navigation
4. Test via `/api/settings/get` and `/api/settings/set`

### Add an API Endpoint
1. Add service method in appropriate `backend/services/` file
2. Add route in `backend/main.py`
3. Add test in `backend/tests/integration/test_api.py`
4. Call from frontend via `useApi()` hook

### Modify Merge Logic
1. Edit XML processing in `backend/services/merge_service.py`
2. Test locally: `cd backend && python -m pytest tests/`
3. Update integration tests if behavior changes

### Modify Archive Metadata
1. Update `archives` table schema in `backend/database.py`
2. Update archive saving in `backend/services/archive_service.py`
3. Update frontend display in `frontend/src/pages/archives/ArchivesTable.js`

---

## 🔄 Workflow for AI Conversations

### When you want to **work on a specific feature:**

1. **Tell me the feature** (e.g., "I want to modify the merge progress display")
2. **I'll reference this CONTEXT** to show you which files matter
3. **Include only relevant code** from the files listed
4. **We iterate** without needing the entire repo

### Example Conversation Starter:

> "I want to improve the archive cleanup logic. Here's the relevant code: [paste from CONTEXT.md Feature section] and [paste current implementation]. What would you recommend?"

**This saves tokens and keeps conversations focused!**

---

## 📝 Version History Summary

| Version | Date | Major Changes |
|---------|------|---------------|
| 0.4.3 | Nov 1, 2025 | Documentation cleanup: consolidated 8 files, flat structure, zero duplication |
| 0.4.2 | Oct 29, 2025 | Component refactoring, archive retention cleanup |
| 0.4.1 | Oct 29, 2025 | Backend persistence, version centralization |
| 0.4.0 | Oct 29, 2025 | Cron job infrastructure |
| 0.3.7 | Oct 28, 2025 | Removed light mode |
| 0.3.0 | Oct 27, 2025 | Settings page implementation |
| 0.2.1 | Oct 26, 2025 | Archives page, merge progress |
| 0.2.0 | Oct 25, 2025 | Modular installation |
| 0.1.0 | Oct 24, 2025 | Initial stable release |

---

## 🎓 Key Concepts

**Timeframe:** 3, 7, or 14 days of EPG data (user selects)
**Feed Type:** IPTV or Gracenote (user selects)
**Channel Filtering:** Exact ID matching against `*_channel_list.txt`
**Smart Caching:** HTTP HEAD to check if remote file changed before redownloading
**Archive Workflow:** Temp file → Review → "Save as Current" → Previous archived
**Days Left:** Calculated as `created_at + days_included - today`

---

## 🐛 Quick Debugging

**Service not starting?**
```bash
journalctl -u epg-merge -n 50  # See last 50 log lines
systemctl status epg-merge      # Check status
```

**Database issue?**
```bash
sqlite3 /config/app.db "PRAGMA integrity_check;"  # Check integrity
rm /config/app.db                                   # Reset (will recreate)
```

**Frontend not loading?**
```bash
curl http://localhost:9193/api/health               # Test API
rm -rf /opt/epg-merge-app/backend/static            # Clear cache
bash /opt/epg-merge-app/scripts/build.sh            # Rebuild
```

---

## 📞 Support Resources

- **Documentation:** See `docs/README.md` for docs index - **START HERE!**
- **Quick Start:** `docs/QUICK_START.md` - 5-minute setup
- **API Help:** `docs/API-SPEC.md` - All endpoints with examples
- **Troubleshooting:** `docs/TROUBLESHOOTING.md` - Common issues
- **Issue Tracker:** GitHub Issues
- **Logs:** `journalctl -u epg-merge -f`

---

**🎯 Remember:** This file is your AI companion. Update it after every commit so future conversations stay in sync with your codebase.