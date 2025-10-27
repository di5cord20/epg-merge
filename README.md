# EPG Merge Application - Project Context

## Purpose
A production-grade TV feed merger application that combines multiple XMLTV EPG (Electronic Program Guide) files from share.jesmann.com, filters them by selected channels, and produces a merged XML file.

**Tech Stack:**
- Backend: FastAPI (Python) + SQLite
- Frontend: React 18 + CSS
- Deployment: Systemd service on Debian/Ubuntu
- API: RESTful endpoints + optional WebSocket

---

## Core Features (Completed ✅)

### 1. **Sources Tab**
- Fetches available `.xml.gz` files from share.jesmann.com
- Radio buttons for timeframe (3/7/14 days) and feed type (IPTV/Gracenote)
- Dual-list interface: available sources (left) ↔ selected sources (right)
- Search filtering on both sides
- "Select All (FullGuide)" shortcut
- Saves selections to localStorage (persistent across sessions)

### 2. **Channels Tab**
- "Load from Sources" fetches channel IDs from `*_channel_list.txt` files
- Dual-list interface: available channels ↔ selected channels
- Search filtering
- Move all/clear all buttons (⇒⇒ / ⇐⇐)
- **New:** Download/Upload backup buttons
  - Export selected channels as JSON file
  - Import previously backed-up channels from JSON
- Saves selections to SQLite + localStorage

### 3. **Merge Tab**
- Displays detailed merge log with color-coded output (success/error/warning)
- Real-time progress bar (0-100%)
- Session-persistent download button (survives tab navigation)
- **New:** "Save as Current" button
  - Archives previous `merged.xml.gz` with timestamp
  - Sets new merge as the live `merged.xml.gz`
- Clear Log button (clears session state)

### 4. **Archives Tab**
- Lists current `merged.xml.gz` (marked ✅ Current)
- Lists all archived versions with timestamps (marked 📦 Archive)
- Shows: filename, creation date, file size
- Download button for each archive
- Current file marked as ∞ (never expires)

### 5. **Settings Tab**
- Output filename (default: `merged.xml.gz`)
- Merge schedule (daily/weekly)
- Merge time picker (UTC)
- Live cron expression display
- Download/merge timeout settings (ms with conversion to seconds)
- Channel drop threshold (%)
- Archive retention (days)
- Discord webhook URL (optional)
- All settings persist to localStorage + SQLite

### 6. **Settings Management** (New in v0.3.0)
- Configure output filename
- Set merge schedule (daily/weekly)
- Customize timeout values
- Quality control thresholds
- Archive retention policies
- Discord webhook notifications (optional)

### 7. **Backend API Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sources/list` | GET | Fetch available XML files |
| `/api/sources/select` | POST | Save selected sources |
| `/api/channels/from-sources` | GET | Extract channel IDs from selected sources |
| `/api/channels/selected` | GET | Get previously selected channels |
| `/api/channels/select` | POST | Save selected channels |
| `/api/channels/export` | POST | Export channels as JSON |
| `/api/channels/import` | POST | Import channels from JSON |
| `/api/merge/execute` | POST | Execute merge operation |
| `/api/merge/save` | POST | Save merge to current + archive previous |
| `/api/merge/current` | GET | Get current merged file info |
| `/api/archives/list` | GET | List current + archived files |
| `/api/archives/download/{filename}` | GET | Download any archive file |
| `/api/settings/get` | GET | Get all settings |
| `/api/settings/set` | POST | Save settings |
| `/api/health` | GET | Health check |

---

## Key Technical Details

### File Structure
```
/opt/epg-merge-app/
├── backend/
│   ├── main.py (FastAPI app - complete)
│   ├── venv/ (Python virtual environment)
│   └── static/ (React build output)
├── frontend/
│   ├── src/
│   │   ├── App.js (main React component - complete)
│   │   ├── App.css (all styling)
│   │   └── index.js
│   └── package.json
└── setup-frontend.sh (build script)

/config/
├── app.db (SQLite database)
├── archives/ (merged.xml.gz + versioned backups)
├── epg_cache/ (cached XML files, 24-hour expiry)
└── helptext.json
```

### Database Schema
```sql
CREATE TABLE channels_selected (channel_name TEXT PRIMARY KEY)
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT)
CREATE TABLE archives (filename TEXT, created_at TEXT, channels INT, programs INT, days_included INT)
```

### Storage Strategy
- **localStorage:** Sources, channels, settings, merge session state (client-side, persistent)
- **sessionStorage:** Merge log, progress, filename (survives tab navigation, cleared on browser close)
- **SQLite:** Channels, settings (server-side persistent database)
- **Filesystem:** EPG cache (24-hour TTL), archives with timestamps

### Merge Process
1. Download/cache XML files from share.jesmann.com
2. Use iterparse for memory-efficient streaming (not loading entire XML into memory)
3. Filter channels by ID match
4. Extract matching programmes
5. Write gzipped output to `/config/archives/`
6. Store metadata in SQLite
7. Return to frontend with file details

### Caching & Optimization
- XML files cached for 24 hours before re-downloading
- Channel lists fetched from `.txt` files (lightweight, not full XML)
- Iterparse used for XML processing (memory efficient for large files)
- 24-hour cache age check before download

### UI Features
- Dark mode toggle (🌙/☀️) persisted to localStorage
- Responsive design (works on desktop, tablet, mobile)
- Real-time progress tracking
- Color-coded terminal-style log output
- Persistent session state for merge completion

---

## Installation
```bash
sudo bash /path/to/install.sh
```

Creates complete app with all dependencies, systemd service, and initial frontend build.

## Common Commands
```bash
systemctl status epg-merge              # Check service status
systemctl restart epg-merge             # Restart service
journalctl -u epg-merge -f              # View live logs
bash /opt/epg-merge-app/setup-frontend.sh  # Rebuild frontend
```

## Access
- **URL:** `http://server-ip:9193`
- **Backend:** Runs on port 9193
- **Database:** `/config/app.db`
- **Archives:** `/config/archives/`
- **Cache:** `/config/epg_cache/`

---

## Current Version
- **v1.0.0 (Stable)**
- Last Updated: October 2025
- All core features complete and tested

## Known Limitations
- Channel lists must exist on share.jesmann.com (returns empty if not found)
- Archive retention is manual (no automatic cleanup)
- Discord notifications not yet implemented
- Cron scheduling not yet implemented

---

## Next Phase Features (Potential)
- [ ] Automatic scheduled merges (cron execution)
- [ ] Discord webhook notifications
- [ ] Channel validation against FullGuide baseline
- [ ] Web UI for archive retention management
- [ ] Merge statistics dashboard
- [ ] API authentication/tokens
- [ ] Multi-user support