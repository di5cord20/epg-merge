# Local Development - Quick Start Guide

## One-Time Setup

### Clone & Navigate
```bash
git clone https://github.com/di5cord20/epg-merge.git
cd epg-merge
```

### Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create local config directory
mkdir -p ../config
```

### Frontend Setup
```bash
cd frontend

# Install Node packages
npm install --legacy-peer-deps
```

## Daily Development Workflow

### Terminal 1 - Backend
```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --host 0.0.0.0 --port 9193 --reload
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
# Opens http://localhost:3000
```

**Notes:**
- API: `http://localhost:9193`
- Frontend: `http://localhost:3000`
- Backend auto-reloads on changes
- Frontend auto-reloads on changes
- Check console for errors (Ctrl+Shift+I)

## Common Tasks

### Run Tests
```bash
# Backend
cd backend
pytest tests/ -v
pytest tests/ --cov=services --cov-report=html

# Frontend (coming soon)
cd frontend
npm test
```

### View Database
```bash
sqlite3 config/app.db
.tables  # See all tables
SELECT * FROM settings;
SELECT * FROM channels_selected;
.quit
```

### Check Cache
```bash
ls -lh config/epg_cache/
du -sh config/epg_cache/
```

### View Archives
```bash
ls -lh config/archives/
```

### Clear Local Data
```bash
# Backup first!
rm -rf config/
mkdir -p config
# Restart backend
```

## Debugging

### Backend Logs
- **Live logs**: See Terminal 1 output
- **Detailed logs**: Add `--log-level debug` to uvicorn command
- **Error trace**: Check full stack trace in terminal

### Frontend Logs
- **Console errors**: Press F12, check Console tab
- **Network requests**: Press F12, check Network tab
- **React errors**: Check Console tab for component errors

### Database Issues
```bash
# Check integrity
sqlite3 config/app.db "PRAGMA integrity_check;"

# Reset if corrupted
rm config/app.db
# Restart backend to recreate
```

### API Testing
```bash
# Health check
curl http://localhost:9193/api/health

# List sources
curl http://localhost:9193/api/sources/list

# Get selected channels
curl http://localhost:9193/api/channels/selected

# Check settings
curl http://localhost:9193/api/settings/get
```

## Version Info

### Check Current Version
```bash
# Python
python backend/version.py

# From API
curl http://localhost:9193/api/health | grep version

# From file
cat backend/version.py | grep __version__
```

## Environment Variables

### Optional (all have defaults)
```bash
export CONFIG_DIR=./config
export ARCHIVE_DIR=./config/archives
export CACHE_DIR=./config/epg_cache
export ENVIRONMENT=development
export LOG_LEVEL=INFO
```

### Frontend Build
```bash
export REACT_APP_API_BASE=http://localhost:9193
npm start
```

## Git Workflow

### Create Feature Branch
```bash
git checkout -b feature/my-feature
```

### Commit Changes
```bash
git add .
git commit -m "feat: description of change"
git push origin feature/my-feature
```

### Create Pull Request
- Go to GitHub
- Create PR from your branch
- Request review
- Merge after approval

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 9193 already in use | `lsof -i :9193` then kill process or use different port |
| venv not activating | Reinstall: `rm -rf backend/venv && python3 -m venv backend/venv` |
| npm dependencies fail | Delete `node_modules`: `rm -rf node_modules package-lock.json && npm install` |
| Database corrupted | `rm config/app.db` and restart backend |
| API 404 errors | Check backend is running on port 9193 |
| Frontend won't load | Clear browser cache: Ctrl+Shift+Delete |
| Changes not reflecting | Hard refresh: Ctrl+Shift+R |

## Code Quality

### Format Code
```bash
# Python
pip install black
black backend/

# JavaScript
npm install -g prettier
prettier frontend/src --write
```

### Run Linter
```bash
# Python
pip install pylint
pylint backend/

# JavaScript
npm run lint  # if configured
```

---

**Quick Commands Copy-Paste:**
```bash
# Full setup
git clone https://github.com/di5cord20/epg-merge.git && cd epg-merge
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
cd ../frontend && npm install --legacy-peer-deps

# Run dev
# Terminal 1:
cd backend && source venv/bin/activate && python -m uvicorn main:app --host 0.0.0.0 --port 9193 --reload
# Terminal 2:
cd frontend && npm start
```

**Last Updated**: 2025-10-27