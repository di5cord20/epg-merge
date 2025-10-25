# EPG Merge App - Project Context Document

## Quick Overview

**EPG Merge App** is a production-grade TV feed merger application that combines multiple XMLTV EPG (Electronic Program Guide) files from share.jesmann.com, filters them by selected channels, and produces merged XML files.

**Current Version**: 0.1 (Beta)
**Tech Stack**: FastAPI (Python) + React 18 + SQLite
**Deployment**: Systemd service on Debian/Ubuntu

---

## Core Purpose

The app allows users to:
1. Select XML EPG source files from share.jesmann.com
2. Filter channels from those sources
3. Merge selected sources/channels into a single XML file
4. Manage and archive merged outputs
5. Configure merge settings and schedules

---

## Architecture

### Backend (FastAPI - Python)
- **Location**: `/opt/epg-merge-app/backend/`
- **Main File**: `main.py`
- **Database**: SQLite at `/config/app.db`
- **Port**: 9193 (configurable)
- **Service**: `epg-merge.service` via systemd

### Frontend (React 18)
- **Location**: `/opt/epg-merge-app/frontend/`
- **Build Output**: `/opt/epg-merge-app/backend/static/`
- **Components**: App.js (monolithic), App.css
- **Storage**: localStorage + sessionStorage for client state

### Data Storage
- **SQLite Tables**:
  - `channels_selected` - User's selected channels
  - `settings` - App configuration
  - `archives` - Metadata for merged files
  
- **Filesystem**:
  - `/config/app.db` - Database
  - `/config/archives/` - Merged XML files
  - `/config/epg_cache/` - Cached source XML files (24hr TTL)
  - `/opt/epg-merge-app/backups/` - Backup archives

---

## Application Features (5 Tabs)

### 1. **Sources Tab**
- Fetches `.xml.gz` files from share.jesmann.com
- Radio buttons: Timeframe (3/7/14 days) + Feed Type (IPTV/Gracenote)
- Dual-list interface: Available ↔ Selected
- Search filtering on both sides
- "Select All (FullGuide)" shortcut
- Saves to localStorage

### 2. **Channels Tab**
- "Load from Sources" button fetches channel IDs from `*_channel_list.txt`
- Dual-list interface with search
- Move all/clear all buttons (⇒⇒ / ⇐⇐)
- Download/Upload backup (JSON export/import)
- Saves to SQLite + localStorage

### 3. **Merge Tab**
- Color-coded terminal-style log output
- Real-time progress bar (0-100%)
- Download button (session-persistent)
- "Save as Current" - archives previous `merged.xml.gz` with timestamp
- Clear log button

### 4. **Archives Tab**
- Lists current `merged.xml.gz` (✅ Current, ∞ retention)
- Lists timestamped archives (📦 Archive)
- Shows: filename, date, size
- Download buttons for each

### 5. **Settings Tab**
- Output filename
- Merge schedule (daily/weekly)
- Merge time (UTC) with live cron preview
- Download/merge timeout (ms → seconds)
- Channel drop threshold (%)
- Archive retention (days)
- Discord webhook URL (optional, not implemented)

---

## API Endpoints (RESTful)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/sources/list` | GET | Fetch available XML files |
| `/api/sources/select` | POST | Save selected sources |
| `/api/channels/from-sources` | GET | Extract channel IDs from sources |
| `/api/channels/selected` | GET | Get saved channels |
| `/api/channels/select` | POST | Save selected channels |
| `/api/channels/export` | POST | Export channels as JSON |
| `/api/channels/import` | POST | Import channels from JSON |
| `/api/merge/execute` | POST | Execute merge operation |
| `/api/merge/save` | POST | Save merge + archive previous |
| `/api/merge/current` | GET | Get current merge info |
| `/api/archives/list` | GET | List all archives |
| `/api/archives/download/{filename}` | GET | Download archive |
| `/api/settings/get` | GET | Get all settings |
| `/api/settings/set` | POST | Save settings |

---

## Technical Details

### Merge Process
1. Downloads XML files from `share.jesmann.com/{folder}/`
2. Caches files in `/config/epg_cache/` (24hr expiry)
3. Uses `iterparse` for memory-efficient streaming
4. Filters channels by exact ID match
5. Extracts matching `<programme>` elements
6. Outputs gzipped XML to `/config/archives/`
7. Returns metadata to frontend

### Storage Strategy
- **localStorage**: Sources, channels, settings (persistent)
- **sessionStorage**: Merge log, progress (survives tab nav, cleared on close)
- **SQLite**: Channels, settings (server-side persistent)
- **Filesystem**: XML cache, archives

### Caching & Optimization
- XML files cached 24 hours before re-download
- Channel lists fetched from lightweight `.txt` files
- Iterparse for memory efficiency with large XMLs
- Cache age check before download

---

## Installation System (v0.1)

### Modular Installer Features
- **3 Installation Modes**:
  1. Fresh Install - New installation
  2. Update/Upgrade - Preserves data, updates code
  3. Reinstall - Fresh install + backup existing data

- **Custom Directory Selection**: User chooses all paths during install
- **Automatic Backups**: Created before updates
- **Version Tracking**: `.version` file + upgrade compatibility checks
- **Configuration Persistence**: `.install_config` stores all settings

### Key Scripts
- `install/install.sh` - Main modular installer
- `install/uninstall.sh` - Safe removal with data preservation options
- `scripts/build.sh` - Rebuild frontend
- `scripts/update.sh` - Update app (backup → update → restart)
- `scripts/backup.sh` - Create backups (regular or compressed)
- `scripts/restore.sh` - Restore from backups
- `scripts/version.sh` - Version info, health check, update check

### Default Paths (Configurable)
```
/opt/epg-merge-app/           # Application code
├── backend/                  # FastAPI app + venv
├── frontend/                 # React source
├── scripts/                  # Utility scripts
├── backups/                  # Backup archives
├── .version                  # Current version
└── .install_config           # Installation config

/config/                      # Data directory
├── app.db                    # SQLite database
├── archives/                 # Merged XML files
│   └── merged.xml.gz         # Current live file
└── epg_cache/                # Cached source files

/etc/systemd/system/
└── epg-merge.service         # Systemd service
```

---

## Current Implementation Status

### ✅ Completed Features
- All 5 tabs fully functional
- Source selection and persistence
- Channel filtering and backup/restore
- XML merge with progress tracking
- Archive management with download
- Settings configuration
- Dark/light mode toggle
- Session-persistent merge state
- Modular installer with upgrade support
- Backup/restore utilities
- Version management
- Health checking

### ⚠️ Pending Features (Not Yet Implemented)
- Automatic scheduled merges (cron execution)
- Discord webhook notifications
- Channel validation against FullGuide baseline
- Automatic archive retention cleanup
- Merge statistics dashboard
- API authentication/tokens
- Multi-user support

---

## Key Design Patterns

### Frontend
- **No localStorage/sessionStorage in artifacts** (Claude.ai restriction)
- React state (useState) for all data management
- Monolithic App.js component (not split into separate files)
- Axios/fetch for API calls
- Terminal-style log with color coding

### Backend
- Streaming XML processing (iterparse)
- 24-hour cache strategy
- CORS enabled for development
- No authentication (internal use)
- Gzip compression for outputs

### Data Flow
```
User Selection → localStorage → API → SQLite
                              ↓
Source Files → Cache → Merge Process → Archive
```

---

## Common Commands

```bash
# Service Management
sudo systemctl status epg-merge
sudo systemctl restart epg-merge
sudo journalctl -u epg-merge -f

# Maintenance
sudo bash /opt/epg-merge-app/scripts/build.sh
sudo bash /opt/epg-merge-app/scripts/update.sh
sudo bash /opt/epg-merge-app/scripts/backup.sh
sudo bash /opt/epg-merge-app/scripts/version.sh

# Database
sqlite3 /config/app.db

# Version Check
cat /opt/epg-merge-app/.version
```

---

## External Dependencies

### Data Source
- **Base URL**: `https://share.jesmann.com/`
- **Folders**: `3dayiptv`, `7dayiptv`, `14dayiptv`, `3daygracenote`, `7daygracenote`, `14daygracenote`
- **Channel Lists**: `https://share.jesmann.com/IPTV_Channel_List/{country}_channel_list.txt`

### Python Packages
```
fastapi==0.104.1
uvicorn==0.24.0
python-multipart==0.0.6
aiofiles==23.2.1
sqlalchemy==2.0.23
pydantic==2.5.0
httpx==0.25.2
beautifulsoup4==4.12.2
croniter==2.0.1
lxml==4.9.3
```

### Node Packages
```
react@18.2.0
react-dom@18.2.0
axios@1.6.0
react-scripts@5.0.1
```

---

## Known Limitations

1. Channel lists must exist on share.jesmann.com (empty if not found)
2. No automatic archive cleanup (manual only)
3. Discord notifications configured but not implemented
4. Cron scheduling UI exists but execution not implemented
5. No multi-user support or authentication
6. Single worker (not horizontally scalable)

---

## Development Environment

**IDE**: code-server
**OS**: Debian/Ubuntu
**Git**: Repository ready for GitHub
**Aliases**: `em-*` commands (em-start, em-stop, em-logs, etc.)

---

## Recent Changes (Context)

- **Rebranded**: XML Merge App → EPG Merge App
- **Directory**: `/opt/xml-merge-app` → `/opt/epg-merge-app`
- **Cache**: `/config/xml_cache` → `/config/epg_cache`
- **Service**: `xml-merge` → `epg-merge`
- **Version**: Changed from 2.0.0 to 0.1 (beta release)
- **Aliases**: `xm-*` → `em-*`

---

## Important Notes for AI Assistants

1. **Always use `epg-merge` in service commands** (not xml-merge)
2. **Cache directory is `epg_cache`** (not xml_cache)
3. **Current version is 0.1** (beta, not 2.0.0)
4. **App directory is `/opt/epg-merge-app/`**
5. **Service file is `epg-merge.service`**
6. **All artifacts have been updated** to reflect rebranding
7. **User prefers modular, maintainable code** with version control
8. **Installation supports custom directories** (not hardcoded)
9. **Backup/restore functionality is critical** for updates

---

## Use This Document When:

- Starting a new conversation about the EPG Merge App
- Debugging issues (check paths, service names, versions)
- Adding new features (understand existing architecture)
- Updating documentation (ensure consistency)
- Helping with Git repository setup
- Troubleshooting installation/deployment issues

---

**Document Version**: 1.0
**Last Updated**: 2025-10-24
**App Version**: 0.1