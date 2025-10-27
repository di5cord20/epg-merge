# EPG Merge App v0.3.0 - Context Bootstrap

## Project Overview

**EPG Merge Application** is a production-grade TV feed merger that combines multiple XMLTV EPG (Electronic Program Guide) files from share.jesmann.com, filters them by selected channels, and produces merged XML files.

**Current Version:** v0.3.0 (Modular Architecture with Smart Caching)
**Repository:** https://github.com/di5cord20/epg-merge
**License:** MIT
**Status:** Operational and tested locally

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
- Export channels to JSON backup
- Import previously backed-up channels

### 3. **XML Merge with Real-Time Logging**
- Merge selected sources with channel filtering
- Real-time merge logging with detailed cache information
- Progress tracking (0-100%)
- Download merged files
- Archive previous versions automatically
- Detailed per-file logging: cache hit/miss/stale decisions

### 4. **Archives Management**
- List current and historical merged files
- Download any archived version
- Delete archived files
- Sort by filename, date, or size
- Display channels and programs counts (persisted to database)
- Current file marked with green indicator

### 5. **Smart Caching System**
- HTTP HEAD requests to check if remote files changed
- Compare file sizes to detect updates
- Automatic cache management (24-hour validation)
- Detailed logging: Cache HIT, Cache MISS, Cache STALE
- Caches stored in `/config/epg_cache/`

### 6. **Settings** (UI Complete, backend partially complete)
- Configure output filename
- Set merge schedule (daily/weekly)
- Set merge time (UTC)
- Download/merge timeouts
- Channel drop threshold
- Archive retention policy

---

## Tech Stack

### Backend
- **Framework:** FastAPI (Python 3.12+)
- **Database:** SQLite
- **Port:** 9193
- **Deployment:** Systemd service (Debian/Ubuntu)
- **Key Libraries:** httpx, lxml, croniter

### Frontend
- **Framework:** React 18
- **State Management:** React Hooks + localStorage
- **Build:** npm/webpack
- **UI Libraries:** lucide-react for icons
- **Key Dependencies:** axios (optional, using fetch)

### Infrastructure
- **OS:** Debian 13 (Proxmox LXC container)
- **IP Address:** 10.96.70.113 (production) / localhost:3001 (local dev)
- **Backend Port:** 9193
- **Frontend Port:** 3001 (dev)
- **Data Locations:**
  - App: `/opt/epg-merge-app/` (production) or `~/github/epg-merge/` (local)
  - Config: `/config/` (production) or `config/` (local)
  - Archives: `/config/archives/`
  - Cache: `/config/epg_cache/`
  - Database: `/config/app.db`

---

## Recent Improvements (Latest Session)

### Backend Enhancements
- ✅ Smart cache validation using HTTP HEAD requests
- ✅ Detailed logging in `_download_sources()` showing per-file cache decisions
- ✅ Phase-based merge logging (Phase 1: Download, Phase 2: Merge, Phase 3: Summary)
- ✅ Archive metadata persistence (channels/programs counts saved to database)
- ✅ Fixed `save_merge()` to properly archive previous files with timestamps

### Frontend Improvements
- ✅ Archives page table with sortable columns (Filename, Created, Type, Size, Channels, Programs, Actions)
- ✅ Proper download functionality matching Archives page
- ✅ "Save as Current" button that keeps summary card visible
- ✅ MergePage with real-time progress bar
- ✅ Terminal log display showing merge phases and summary
- ✅ Info box directing users to backend terminal for detailed logs
- ✅ Fixed React Hook warnings (useCallback for fetchArchives)

### Infrastructure Fixes
- ✅ Updated `useApi` hook to use `process.env.REACT_APP_API_BASE`
- ✅ Fixed relative API URLs to absolute URLs (http://localhost:9193)
- ✅ Refactored `build.sh` to use actual source files instead of hardcoded App.js/App.css
- ✅ Added lucide-react to package.json dependencies

---

## Known Issues & Limitations

1. **Merge page logging:** Detailed cache logs appear in backend terminal only, not in UI terminal (by design - real-time streaming not yet implemented)
2. **Settings page:** UI complete but backend execution not fully implemented (merge scheduling not active)
3. **No scheduled merges:** Cron execution not yet implemented
4. **No Discord notifications:** Webhook URL field exists but not implemented
5. **Archive cleanup:** Manual only, no automatic retention-based deletion

---

## API Endpoints

All endpoints at `http://localhost:9193/api/`:

| Endpoint | Method | Status |
|----------|--------|--------|
| `/health` | GET | ✅ Working |
| `/status` | GET | ✅ Working |
| `/sources/list` | GET | ✅ Working |
| `/sources/select` | POST | ✅ Working |
| `/channels/from-sources` | GET | ✅ Working |
| `/channels/selected` | GET | ✅ Working |
| `/channels/select` | POST | ✅ Working |
| `/channels/export` | POST | ✅ Working |
| `/channels/import` | POST | ✅ Working |
| `/merge/execute` | POST | ✅ Working |
| `/merge/current` | GET | ✅ Working |
| `/merge/save` | POST | ✅ Working |
| `/archives/list` | GET | ✅ Working |
| `/archives/download/{filename}` | GET | ✅ Working |
| `/archives/delete/{filename}` | DELETE | ✅ Working |
| `/settings/get` | GET | ✅ Working |
| `/settings/set` | POST | ✅ Working |

---

## Local Development Setup

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 9193 --reload
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
npm start
# Opens http://localhost:3001
```

### Environment Variables
**Frontend: `frontend/.env`**
```
REACT_APP_API_BASE=http://localhost:9193
```

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

### archives
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

## Common Commands

### Backend
```bash
# Check status
systemctl status epg-merge

# View logs
journalctl -u epg-merge -f
sudo journalctl -u epg-merge -n 50

# Manual start (dev)
python -m uvicorn main:app --host 0.0.0.0 --port 9193 --reload
```

### Frontend Build
```bash
bash scripts/build.sh
```

### Cache Inspection
```bash
ls -lh /config/epg_cache/
du -sh /config/epg_cache/
```

---

## File Structure

```
backend/
├── main.py (clean routing)
├── config.py (configuration)
├── database.py (SQLite wrapper)
├── services/ (5 modular services)
│   ├── base_service.py
│   ├── source_service.py
│   ├── channel_service.py
│   ├── merge_service.py
│   ├── archive_service.py
│   └── settings_service.py
├── utils/
│   ├── logger.py
│   ├── errors.py
│   └── validators.py
└── tests/ (77%+ coverage)

frontend/
├── src/
│   ├── App.js (main component)
│   ├── App.css (styling)
│   ├── hooks/ (useApi, useLocalStorage, useTheme)
│   ├── components/ (Navbar, Terminal, ProgressBar, DualListSelector, ErrorBoundary)
│   └── pages/ (SourcesPage, ChannelsPage, MergePage, ArchivesPage)
└── package.json (React 18, lucide-react, axios)
```

---

## Next Priority Features

1. **Real-time log streaming** - SSE/WebSocket to show detailed cache logs in UI terminal
2. **Implement scheduled merges** - Cron execution for daily/weekly automatic merges
3. **Archive retention cleanup** - Automatic deletion based on retention policy
4. **Discord notifications** - Webhook integration for merge alerts
5. **Settings page UI completion** - Full backend implementation
6. **Multi-user support** - Authentication and per-user settings
7. **Merge statistics dashboard** - Charts and analytics

---

## Important Notes for Next Session

- **Cache checking logs are in Terminal 1 (backend)**, not in the frontend UI terminal
- Use `ls -lh /config/epg_cache/` to verify cached files and their ages
- File sizes are the primary cache validation method (HTTP HEAD check)
- Archive metadata (channels/programs) is stored in SQLite after each merge
- "Save as Current" properly archives the previous version with timestamp
- All API endpoints are working and tested

---

**Last Updated:** October 26, 2025  
**Status:** Fully Functional (v0.2.0)  
**Contact/Support:** GitHub repository
