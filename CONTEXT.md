# EPG Merge App v0.3.1 - Context Bootstrap

## Project Overview

**EPG Merge Application** is a production-grade TV feed merger that combines multiple XMLTV EPG (Electronic Program Guide) files from share.jesmann.com, filters them by selected channels, and produces merged XML files with archive versioning.

**Current Version:** v0.3.1 (Archive Versioning & Version Management)
**Repository:** https://github.com/di5cord20/epg-merge
**License:** MIT
**Status:** Fully operational with proper archive management

---

## Core Features (Completed ✅)

### 1. **Sources Management**
- Fetch XML source files from share.jesmann.com
- Filter by timeframe (3, 7, 14 days)
- Select feed type (IPTV or Gracenote)
- Dual-list UI for source selection
- Search and filter capabilities

### 2. **Channel Selection**
- Load channels from selected sources
- Dual-list interface for channel management
- Search and filter channels
- Export/import channels as JSON backups

### 3. **XML Merge with Real-Time Logging**
- Merge selected sources with channel filtering
- Real-time merge logging with detailed cache information
- Progress tracking (0-100%)
- Download merged files
- Three-phase logging: Download → Merge → Summary
- Detailed per-file logging: Cache HIT, MISS, STALE decisions

### 4. **Archive Management with Versioning** ⭐ NEW in v0.3.1
- **Unique temporary filenames**: Each merge creates `merged_YYYYMMDD_HHMMSS.xml.gz`
- **"Save as Current" workflow**: Archives previous version with timestamp before promoting new merge
- Archive naming: `merged.xml.gz` (current) + `merged.xml.gz.YYYYMMDD_HHMMSS` (versioned archives)
- Archive metadata persisted (channels, programs, size, timestamp)
- Orphaned temp file cleanup available
- List, download, delete any archived version
- Sortable archive table (filename, date, type, size, metadata, actions)
- Current file marked with green indicator

### 5. **Smart Caching System**
- HTTP HEAD requests to check if remote files changed
- Compare file sizes to detect updates
- Automatic cache management (24-hour validation)
- Detailed logging for cache decisions
- Caches stored in `/config/epg_cache/`

### 6. **Settings Management** (UI Complete, Backend Partial)
- Configure output filename
- Set merge schedule (daily/weekly)
- Set merge time (UTC)
- Download/merge timeouts
- Channel drop threshold
- Archive retention policy
- Discord webhook support (configured, not yet executed)

---

## Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.12+)
- **Database:** SQLite with archives table
- **Port:** 9193
- **Deployment:** Systemd service (Debian/Ubuntu)
- **Key Libraries:** httpx, lxml, croniter

### Frontend
- **Framework:** React 18
- **State Management:** React Hooks + localStorage
- **Build:** npm/webpack (CI/CD via build.sh)
- **UI Libraries:** lucide-react for icons
- **Key Dependencies:** fetch API, no external HTTP client

### Infrastructure
- **OS:** Debian 13 (Proxmox LXC container for production)
- **Local Dev:** Ubuntu/WSL (tested on Ubuntu 22.04)
- **Backend Port:** 9193
- **Frontend Dev Port:** 3001
- **Data Locations:**
  - App: `/opt/epg-merge-app/` (prod) or `~/github/epg-merge/` (local)
  - Config: `/config/` (prod) or `config/` (local)
  - Archives: `{CONFIG}/archives/`
  - Cache: `{CONFIG}/epg_cache/`
  - Database: `{CONFIG}/app.db`

---

## Version Management (NEW in v0.3.1) ⭐

**Centralized version management** - single source of truth:
- **Source**: `backend/version.py` (e.g., `__version__ = "0.3.1"`)
- **Auto-synced to**: 6 files via build process and installation
- **Files affected**:
  - `backend/main.py` - API responses
  - `frontend/package.json` - Build environment
  - `frontend/src/components/Navbar.js` - UI display
  - `install/install.sh` - Installation script
  - `CONTEXT.md` - Documentation
  - `CHANGELOG.md` - Release notes

**To bump version**:
1. Edit `backend/version.py` (only file to change)
2. All other files auto-sync during build
3. See `VERSION.md` for detailed strategy

---

## API Endpoints

All at `http://localhost:9193/api/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + version |
| `/status` | GET | Detailed app status |
| `/sources/list` | GET | Available XML files |
| `/sources/select` | POST | Save selected sources |
| `/channels/from-sources` | GET | Load channels from sources |
| `/channels/selected` | GET | Get saved channels |
| `/channels/select` | POST | Save selected channels |
| `/channels/export` | POST | Export to JSON backup |
| `/channels/import` | POST | Import from JSON backup |
| `/merge/execute` | POST | Execute merge (creates temp file) |
| `/merge/current` | GET | Current live merge info |
| `/merge/save` | POST | Promote temp to current + archive previous |
| `/archives/list` | GET | All archives + current |
| `/archives/download/{filename}` | GET | Download archive file |
| `/archives/delete/{filename}` | DELETE | Delete archive file |
| `/settings/get` | GET | Get all settings |
| `/settings/set` | POST | Save settings |

---

## Database Schema

### channels_selected
```sql
CREATE TABLE channels_selected (
  channel_name TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### settings
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### archives ⭐ (NEW/Enhanced in v0.3.1)
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

---

## Local Development Setup

### Quick Start (See LOCAL_DEV.md for details)

**Terminal 1 - Backend:**
```bash
cd ~/github/epg-merge/backend
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 9193 --reload
```

**Terminal 2 - Frontend:**
```bash
cd ~/github/epg-merge/frontend
npm install  # first time only
npm start
# Opens http://localhost:3001
```

**Terminal 3 - Testing:**
```bash
# Test API
curl http://localhost:9193/api/health | jq .

# Monitor database
sqlite3 ../backend/config/app.db "SELECT * FROM archives ORDER BY created_at DESC LIMIT 5;"

# Monitor archives directory
watch -n 1 'ls -lh ../backend/config/archives/'
```

### Environment Variables
**File**: `frontend/.env`
```
REACT_APP_API_BASE=http://localhost:9193
```

---

## Recent Changes (v0.3.1)

### Archive Versioning ⭐
- Each merge creates unique temp file: `merged_YYYYMMDD_HHMMSS.xml.gz`
- **Before v0.3.1**: Merges overwrote same file, lost previous data
- **After v0.3.1**: Full version history with metadata, controlled promotion

### Version Management ⭐
- Centralized in `backend/version.py` (single source of truth)
- No more manual updates across 6+ files
- Version auto-synced to all files via build process

### Documentation ⭐
- **LOCAL_DEV.md**: Quick reference for local setup and testing
- **VERSION.md**: Version management strategy and workflow
- **RELEASE.md**: Step-by-step release process with tagging

### Testing Infrastructure ⭐
- `backend/test-comprehensive.sh`: Full archive workflow tests
- `backend/test-save-merge.sh`: Archive save/promote tests

---

## File Structure

```
backend/
├── version.py (⭐ NEW - centralized version)
├── main.py (routes, imports version)
├── config.py (configuration)
├── database.py (SQLite wrapper)
├── services/
│   ├── base_service.py
│   ├── source_service.py
│   ├── channel_service.py
│   ├── merge_service.py (⭐ temp filename + archive logic)
│   ├── archive_service.py (⭐ cleanup method)
│   └── settings_service.py
├── utils/ (logger, errors, validators)
└── tests/ (77%+ coverage)

frontend/
├── src/
│   ├── App.js (main component)
│   ├── App.css (styling)
│   ├── hooks/ (useApi, useLocalStorage, useTheme)
│   ├── components/ (Navbar, Terminal, ProgressBar, DualListSelector, ErrorBoundary)
│   └── pages/ (SourcesPage, ChannelsPage, MergePage, ArchivesPage, SettingsPage)
├── package.json (⭐ refs backend version)
└── .env (REACT_APP_API_BASE)

Root
├── backend/
├── frontend/
├── install/ (install.sh - ⭐ reads backend version)
├── scripts/
│   ├── build.sh
│   ├── backup.sh
│   ├── restore.sh
│   ├── update.sh
│   ├── version.sh
│   └── sync-version.js (⭐ NEW utility)
├── LOCAL_DEV.md (⭐ NEW - dev quick ref)
├── VERSION.md (⭐ NEW - version strategy)
├── RELEASE.md (⭐ NEW - release process)
├── CHANGELOG.md (updated for v0.3.1)
├── DEPLOYMENT.md (updated with release section)
└── CONTEXT.md (this file)
```

---

## Known Limitations & Next Features

### Current Limitations
1. **Settings backend execution**: UI complete, actual scheduling not yet implemented
2. **Scheduled merges**: Cron execution framework ready, not yet active
3. **Discord notifications**: Webhook field exists, not yet implemented
4. **Real-time log streaming**: Logs shown after merge completes, not live

### Next Priority Features
1. **Scheduled merges** - Cron execution for daily/weekly automatic runs
2. **Discord notifications** - Webhook integration for completion alerts
3. **Archive retention cleanup** - Auto-delete based on configured policy
4. **Settings backend implementation** - Activate cron scheduling
5. **Real-time log streaming** - SSE/WebSocket for live logs
6. **Merge statistics dashboard** - Charts and analytics
7. **Multi-user support** - Authentication and per-user settings

---

## Common Development Commands

### Backend
```bash
# Start with reload
python -m uvicorn main:app --reload

# Check health + version
curl http://localhost:9193/api/health | jq .

# View database
sqlite3 config/app.db ".tables"

# Clear data for fresh test
rm config/app.db config/archives/merged* config/epg_cache/*
```

### Frontend
```bash
# Start dev server
npm start

# Build for production
npm run build

# Check for issues
npm run build 2>&1 | tail -20
```

### Git & Release
```bash
# Check version
cat backend/version.py

# Create release
git tag -a v0.3.1 -m "Release message"
git push origin v0.3.1

# See release process
cat RELEASE.md
```

---

## Testing Checklist

Before commit:
- [ ] Backend starts without errors: `python -m uvicorn main:app --reload`
- [ ] Health check returns correct version: `curl http://localhost:9193/api/health | jq .version`
- [ ] Frontend navbar shows correct version
- [ ] Archive test passes: Run comprehensive test script
- [ ] Database maintains integrity: Check archives table has correct metadata
- [ ] LOCAL_DEV.md procedures work end-to-end

---

## Important Notes for Next Session

1. **Version is centralized**: Only edit `backend/version.py`, all other files auto-sync
2. **Archive flow**: Merge creates temp → user reviews → "Save as Current" promotes + archives
3. **Database schema**: archives table has full CRUD, metadata persisted
4. **Frontend version**: Reads from `package.json` env var, displays in Navbar
5. **Local dev**: See LOCAL_DEV.md for quick refresh on setup
6. **Testing**: Comprehensive test scripts in backend/ directory
7. **Release process**: See RELEASE.md for tagging and release steps

---

## Production Deployment

### Quick Deployment
```bash
# On production server
cd /opt/epg-merge-app
sudo bash install/install.sh
# Select: 2) Update/Upgrade
# Uses centralized version from backend/version.py
```

### Check Version on Production
```bash
cat /opt/epg-merge-app/backend/version.py
curl http://10.96.70.113:9193/api/health | jq .version
```

---

**Last Updated:** October 28, 2025
**Version:** v0.3.1 (Archive Versioning + Version Management)
**Status:** Production Ready with Full Archive Support
**Maintainer:** di5cord20
**Repository:** https://github.com/di5cord20/epg-merge