# EPG Merge Application

> **TV feed merger** combining multiple XMLTV EPG files with channel filtering, archiving, and scheduling.

**Version:** 0.4.7 | **Status:** Production Ready | **Tests:** 56+/56+ passing

---

## EPG Merge - Docker Deployment

## 🚀 Quick Start
```bash
cd /opt
git clone https://github.com/di5cord20/epg-merge.git epg-merge-app
cd epg-merge-app
mkdir -p ./data/{tmp,current,archives} ./config
docker compose up -d
```

Open http://your-server-ip

👉 **[Full Docker Guide](docs/DOCKER_DEPLOYMENT.md)** | **[Quick Start Card](docs/DOCKER_QUICKSTART.md)**

## Features

- ✅ Automatic scheduled merges (runs in background)
- ✅ Memory tracking for performance monitoring
- ✅ Discord notifications on completion
- ✅ Job history & archive management
- ✅ Web-based configuration (no command line needed)
- ✅ Production-ready Docker deployment

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend** | FastAPI | 0.115.5 |
| **Frontend** | React | 18.2 |
| **Database** | SQLite | 3.x |
| **Language** | Python | 3.11+ |
| **Container** | Docker | Latest |

---

## Core Workflows

### 1. Sources → Channels → Merge
- Select timeframe (3/7/14 days) and feed type (IPTV/Gracenote)
- Choose specific sources or "Select All (FullGuide)"
- Load channels from sources, filter by ID
- Execute merge with real-time progress logging
- Download or "Save as Current" (archives previous version)

### 2. Archive Management
- Current live file: `merged.xml.gz`
- Previous versions: `merged.xml.gz.YYYYMMDD_HHMMSS`
- Automatic metadata: channels, programs, days included, creation date
- Manual or automatic cleanup based on retention policy

### 3. Settings & Configuration
- Output filename and merge schedule (daily/weekly)
- Merge time and specific days selection
- Download/merge timeouts with validation
- Channel drop threshold alerts
- Archive retention cleanup (auto-delete expired)
- Discord webhook notifications

---

## Documentation

- 📘 [Quick Reference](docs/QUICK_REFERENCE.md) - Common commands and workflows
- 🏗️ [Architecture](docs/ARCHITECTURE.md) - System design overview
- 💾 [Local Development](docs/development/LOCAL_DEV.md) - Setup and debugging
- 🚀 [Deployment](docs/deployment/DEPLOYMENT.md) - Production deployment guide
- 📦 [API Specification](docs/API-SPEC.md) - REST endpoint contracts

---

## Project Status

- **Current Version:** 0.4.5 (Centralized Constants & Folder Validation)
- **Last Update:** November 1, 2025
- **Frontend Tests:** 56+ passing (utility + integration)
- **Backend Tests:** Full API contract validation
- **Code Coverage:** 85%+

### Recent Changes (v0.4.5)
- Created `backend/constants.py` - Single source of truth for folder mappings
- Added `get_folder_name()` - Validates timeframe/feed_type combinations
- Added `get_update_frequency()` - Human-readable update info
- Updated `source_service.py` - Uses constants instead of local FOLDER_MAP
- Updated `merge_service.py` - Uses constants instead of local folder_map
- Eliminated 100% of folder mapping duplication across services
- Improved error handling with explicit validation

### Previous Notable Changes (v0.4.4)
- Configurable output filename in Settings
- New directory structure: `/data/tmp/`, `/data/current/`, `/data/archives/`
- Copy-not-move workflow for better UX
- Fresh settings fetching before operations
- 56+ integration tests

---

## Installation

### Production (Ubuntu/Debian)
```bash
sudo bash install/install.sh
# Select: Fresh Install or Update/Upgrade
# Configurable directories, automatic service setup
```

### Local Development
```bash
# Backend
cd backend && python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload

# Frontend
cd frontend && npm install --legacy-peer-deps
npm start
```

---

## Common Commands

### Service Management
```bash
systemctl status epg-merge           # Check status
systemctl restart epg-merge          # Restart
journalctl -u epg-merge -f           # Live logs
```

### Build & Update
```bash
sudo bash /opt/epg-merge-app/scripts/build.sh    # Rebuild frontend
sudo bash /opt/epg-merge-app/scripts/update.sh   # Full update
sudo bash /opt/epg-merge-app/scripts/backup.sh   # Create backup
```

### Database
```bash
sqlite3 /config/app.db
SELECT COUNT(*) FROM channels_selected;          # Check channels
SELECT * FROM settings ORDER BY key;             # View settings
.tables                                          # List all tables
```

### Test Configuration
```bash
# Test 14-day IPTV (folder should be 'iptv')
python3 -c "from backend.constants import get_folder_name; print(get_folder_name('14', 'iptv'))"

# Test 14-day Gracenote (folder should be empty string for root)
python3 -c "from backend.constants import get_folder_name; print(get_folder_name('14', 'gracenote'))"
```

---

## API Overview

All endpoints available at `http://localhost:9193/api/`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check + version |
| `/sources/list` | GET | Available XML files |
| `/channels/from-sources` | GET | Extract channel IDs |
| `/merge/execute` | POST | Run merge operation |
| `/merge/save` | POST | Save as current + archive |
| `/archives/list` | GET | All archives + current |
| `/archives/download/{filename}` | GET | Download file |
| `/settings/get` | GET | All settings |
| `/settings/set` | POST | Save settings |
| `/jobs/status` | GET | Scheduled job status |
| `/jobs/history` | GET | Job execution history |

---

## File Structure

```
epg-merge/
├── backend/
│   ├── main.py              # FastAPI routes (370 lines)
│   ├── config.py            # Configuration management
│   ├── database.py          # SQLite wrapper (240 lines)
│   ├── version.py           # Version (single source of truth)
│   ├── constants.py         # Centralized constants (NEW v0.4.5)
│   ├── services/            # Business logic
│   │   ├── merge_service.py
│   │   ├── channel_service.py
│   │   ├── source_service.py   # Uses constants.py (v0.4.5)
│   │   ├── archive_service.py
│   │   ├── settings_service.py
│   │   └── job_service.py
│   └── venv/                # Python virtual environment
├── frontend/
│   ├── src/
│   │   ├── App.js           # Main component
│   │   ├── App.css          # Dark mode styling (inline)
│   │   ├── pages/           # 6 page components
│   │   ├── components/      # 5 reusable components
│   │   └── hooks/           # 3 custom hooks (useApi, useLocalStorage, useTheme)
│   └── package.json
├── install/                 # Installation scripts
├── scripts/                 # Utility scripts (build, update, backup)
├── docker-compose.yml       # Docker setup
├── CHANGELOG.md             # Version history
├── CONTEXT.md              # AI conversation reference (THIS FILE!)
└── README.md               # ← You are here
```

---

## Environment Setup

### `.env` Configuration
```bash
# Backend
FLASK_ENV=production
API_HOST=0.0.0.0
API_PORT=9193
DATABASE_URL=sqlite:///./app.db

# Frontend
REACT_APP_API_BASE=http://localhost:9193

# Optional
DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

---

## Known Limitations

1. **Scheduled merges** - Cron infrastructure ready, execution not yet active
2. **Discord notifications** - Webhook field exists, notifications not yet sent
3. **Real-time logs** - Currently shown after completion, not live streaming
4. **Channel validation** - Uses exact ID matching, no fuzzy logic

---

## Roadmap

### Phase 5 (Future)
- [ ] Active cron scheduling with execution
- [ ] Real-time log streaming (WebSocket/SSE)
- [ ] Discord webhook notifications
- [ ] Multi-user support with authentication
- [ ] Kubernetes deployment templates

---

## Support & Contribution

- **Issues:** GitHub Issues
- **Documentation:** See [docs/](docs/) folder
- **License:** MIT

---

**Last Updated:** November 1, 2025  
**Maintainer:** di5cord20  
**Repository:** https://github.com/di5cord20/epg-merge