# EPG Merge App v0.2.0 - Context Bootstrap

## Project Overview

**EPG Merge Application** is a production-grade TV feed merger that combines multiple XMLTV EPG (Electronic Program Guide) files from share.jesmann.com, filters them by selected channels, and produces merged XML files.

**Current Version:** v0.2.0 (Modular Architecture Release)  
**Repository:** https://github.com/di5cord20/epg-merge  
**Release Tag:** v0.2.0  
**License:** MIT

---

## Core Features

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

### 3. **XML Merge**
- Merge selected sources with channel filtering
- Real-time merge logging with color-coded output
- Progress tracking (0-100%)
- Download merged files
- Archive previous versions automatically

### 4. **Archive Management**
- List current and historical merged files
- Download any archived version
- Automatic timestamping of archives
- Current file retention (∞)

### 5. **Settings**
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

### Frontend
- **Framework:** React 18
- **State Management:** React Hooks + localStorage
- **Build:** npm/webpack

### Infrastructure
- **OS:** Debian 13 (Proxmox LXC container)
- **IP Address:** 10.96.70.113
- **Deployment Method:** Automated installer script
- **Data Locations:**
  - App: `/opt/epg-merge-app/`
  - Config: `/config/`
  - Archives: `/config/archives/`
  - Cache: `/config/epg_cache/`
  - Database: `/config/app.db`

---

## Architecture (v0.2.0 Refactoring)

### Backend Structure
```
backend/
├── main.py (250 lines - clean routing)
├── config.py (configuration management)
├── database.py (SQLite abstraction)
├── services/ (5 focused services)
│   ├── base_service.py
│   ├── source_service.py
│   ├── channel_service.py
│   ├── merge_service.py
│   ├── archive_service.py
│   └── settings_service.py
├── utils/ (logging, errors, validators)
│   ├── logger.py
│   ├── errors.py
│   └── validators.py
└── tests/ (77%+ coverage)
    ├── unit/
    │   └── test_database.py
    └── integration/
        └── test_api.py
```

### Frontend Structure
```
frontend/
├── src/App.js (50 lines - clean composition)
├── src/hooks/ (custom reusable hooks)
│   ├── useApi.js
│   ├── useLocalStorage.js
│   └── useTheme.js
├── src/components/ (reusable components)
│   ├── Navbar.js
│   ├── ErrorBoundary.js
│   ├── DualListSelector.js
│   ├── Terminal.js
│   └── ProgressBar.js
└── src/pages/ (feature pages)
    ├── SourcesPage.js
    ├── ChannelsPage.js
    └── MergePage.js
```

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Detailed status |
| `/api/sources/list` | GET | Fetch available sources |
| `/api/sources/select` | POST | Save selected sources |
| `/api/channels/from-sources` | GET | Load channels from sources |
| `/api/channels/selected` | GET | Get saved channels |
| `/api/channels/select` | POST | Save selected channels |
| `/api/channels/export` | POST | Export channels to JSON |
| `/api/channels/import` | POST | Import channels from JSON |
| `/api/merge/execute` | POST | Execute merge operation |
| `/api/merge/current` | GET | Get current merge info |
| `/api/merge/save` | POST | Save merge + archive previous |
| `/api/archives/list` | GET | List all archives |
| `/api/archives/download/{filename}` | GET | Download archive file |
| `/api/settings/get` | GET | Get all settings |
| `/api/settings/set` | POST | Save settings |

---

## Common Commands

### Service Management
```bash
# Check status
sudo systemctl status epg-merge

# Start/stop/restart
sudo systemctl start epg-merge
sudo systemctl stop epg-merge
sudo systemctl restart epg-merge

# View logs
sudo journalctl -u epg-merge -f
sudo journalctl -u epg-merge -n 50
```

### Manual Start (for development)
```bash
cd /opt/epg-merge-app/backend
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 9193
```

### Access
- **Web UI:** http://10.96.70.113:9193
- **API:** http://10.96.70.113:9193/api/*

---

## Installation & Deployment

### Current Status
✅ **v0.2.0 Deployed** to Proxmox LXC (10.96.70.113)
- Installed via automated installer script
- Running as systemd service
- Auto-starts on boot
- Auto-restarts on crash

### Installation Method
```bash
cd /tmp
git clone https://github.com/di5cord20/epg-merge.git
cd epg-merge
git checkout v0.2.0
sudo bash install/install.sh
```

---

## Code Quality Metrics (v0.2.0)

| Metric | Before (v0.1) | After (v0.2) |
|--------|---------------|--------------|
| Main files | 1000+ lines | 100-250 lines each |
| Code organization | Monolithic | Modular services |
| Test coverage | 0% | 77%+ |
| Components/Services | Bundled | Separated |
| Error handling | Basic | Hierarchical |
| Logging | Basic | Structured |
| Documentation | Minimal | Comprehensive |

---

## SOLID Principles Applied

- ✅ **Single Responsibility:** Each service handles one domain
- ✅ **Open/Closed:** Extensible without modification
- ✅ **Liskov Substitution:** Consistent service interfaces
- ✅ **Interface Segregation:** Clean, focused APIs
- ✅ **Dependency Injection:** All dependencies injected

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

## Recent Activity & Status

### Completed (October 2025)
- ✅ Full backend refactoring to modular services
- ✅ Frontend split into components and hooks
- ✅ Comprehensive test suite (77%+ coverage)
- ✅ Deployed to production (10.96.70.113)
- ✅ v0.2.0 release on GitHub
- ✅ Updated installer version to 0.2.0

### Current Deployment
- **Status:** Running and operational
- **Address:** http://10.96.70.113:9193
- **Service:** epg-merge (systemd)
- **Data:** Persisted in /config/

### Next Steps (Future)
- [ ] Complete Archives page UI
- [ ] Complete Settings page UI
- [ ] Implement scheduled merges (cron)
- [ ] Add Discord webhook notifications
- [ ] Create merge statistics dashboard
- [ ] Add API authentication
- [ ] Implement multi-user support

---

## Important Notes

1. **Channel Data:** Last export (channels_backup_20251025_234645.json) contains 378 channels from Canada and USA
2. **External Data:** Application fetches EPG data from share.jesmann.com (requires internet)
3. **Automatic Features:** Service starts automatically on boot and auto-restarts on crash
4. **Manual Mode:** Can be stopped with `sudo systemctl stop epg-merge`
5. **Development:** Running on Proxmox LXC via code-server (can also use terminal)

---

## Developer Resources

- **Quality Handbook:** Guidelines for SOLID principles, patterns, code standards
- **Testing Guide:** Examples for unit, integration, and component tests
- **Migration Guide:** Step-by-step refactoring documentation
- **Quick Reference:** Daily development lookup guide
- **Architecture:** Detailed component and service documentation

---

## Version Information

- **Current Version:** 0.2.0
- **Previous Version:** 0.1 (original monolithic architecture)
- **Next Version:** TBD
- **Breaking Changes:** None between v0.1 and v0.2.0
- **Upgrade Path:** v0.1 → v0.2.0 (installer supports both)

---

**Last Updated:** October 26, 2025  
**Status:** Production Ready  
**Contact/Support:** See GitHub repository
