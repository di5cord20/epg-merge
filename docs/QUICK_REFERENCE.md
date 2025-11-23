# Quick Reference - EPG Merge Application

Fast lookup for common commands, workflows, and troubleshooting.

---

## 🚀 Quick Start

### Production Installation
```bash
sudo bash install/install.sh
# Select: Fresh Install or Update/Upgrade
# Choose directories when prompted
```

### Local Development
```bash
# Terminal 1 - Backend
cd backend && python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --reload

# Terminal 2 - Frontend
cd frontend && npm install --legacy-peer-deps
npm start
# Opens http://localhost:3000
```

### Docker
```bash
docker-compose up -d
# Visit http://localhost:9193
```

---

## 📋 Common Commands

### Service Management
```bash
# Check status
systemctl status epg-merge

# Restart service
systemctl restart epg-merge

# View live logs
journalctl -u epg-merge -f

# Stop service
systemctl stop epg-merge

# Start service
systemctl start epg-merge
```

### Build & Deploy
```bash
# Rebuild frontend (run from server)
sudo bash /opt/epg-merge-app/scripts/build.sh

# Full update (code + dependencies)
sudo bash /opt/epg-merge-app/scripts/update.sh

# Create backup
sudo bash /opt/epg-merge-app/scripts/backup.sh

# Restore from backup
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_20251101_120000
```

### Database
```bash
# Connect to SQLite
sqlite3 /config/app.db

# Count selected channels
sqlite3 /config/app.db "SELECT COUNT(*) FROM channels_selected;"

# View all settings
sqlite3 /config/app.db "SELECT * FROM settings ORDER BY key;"

# List all tables
sqlite3 /config/app.db ".tables"

# Export database
sqlite3 /config/app.db ".dump" > backup.sql

# Check database integrity
sqlite3 /config/app.db "PRAGMA integrity_check;"

# Reset database (recreates on restart)
rm /config/app.db
```

### Testing
```bash
# All frontend tests
npm test

# With coverage report
npm test -- --coverage

# Specific test file
npm test -- frontend.test.js

# Integration tests only
npm test -- integration.test.js

# Watch mode
npm test -- --watch
```

---

## 🔍 Troubleshooting

### Service Won't Start
```bash
# Check what's wrong
journalctl -u epg-merge -n 50

# Common causes:
# 1. Port already in use
lsof -i :9193
kill -9 <PID>

# 2. Bad configuration
cat /opt/epg-merge-app/.install_config

# 3. Permissions issue
ls -la /config/
chmod -R 755 /config

# Try again
systemctl restart epg-merge
```

### Frontend Not Loading
```bash
# Clear frontend cache
rm -rf /opt/epg-merge-app/backend/static

# Rebuild
sudo bash /opt/epg-merge-app/scripts/build.sh

# Check API is responding
curl http://localhost:9193/api/health | jq .
```

### Database Corrupted
```bash
# Check integrity
sqlite3 /config/app.db "PRAGMA integrity_check;"

# If corrupted, backup old and reset
cp /config/app.db /config/app.db.backup
rm /config/app.db

# Restart service (recreates database)
systemctl restart epg-merge
```

### Port Already In Use
```bash
# Find process using port 9193
lsof -i :9193

# Kill the process
kill -9 <PID>

# Or change port in .install_config and rebuild
```

### API Connection Errors
```bash
# Test API health
curl http://localhost:9193/api/health

# Test with verbose output
curl -v http://localhost:9193/api/health

# Check if service is running
systemctl is-active epg-merge

# Check firewall
sudo ufw status
sudo ufw allow 9193
```

### Merge Fails
```bash
# Check logs for detailed error
journalctl -u epg-merge -n 100

# Common issues:
# 1. No channels selected
# 2. No sources selected
# 3. Download timeout (increase in Settings)
# 4. Network issue (check internet connection)

# Try manual merge via API
curl -X POST http://localhost:9193/api/merge/execute \
  -H "Content-Type: application/json" \
  -d '{"sources":["canada.xml.gz"],"channels":["channel1","channel2"],"timeframe":"3","feed_type":"iptv"}'
```

---

## 📁 File Locations

### Configuration
- Database: `/config/app.db`
- Installation config: `/opt/epg-merge-app/.install_config`
- Version: `/opt/epg-merge-app/.version`

### Data
- Archives: `/config/archives/`
- Cache: `/config/epg_cache/`
- Backups: `/opt/epg-merge-app/backups/`

### Code
- Backend: `/opt/epg-merge-app/backend/`
- Frontend: `/opt/epg-merge-app/frontend/`
- Scripts: `/opt/epg-merge-app/scripts/`

### Logs
- Service logs: `journalctl -u epg-merge`
- Application logs: Inside service output

---

## 🔌 API Quick Reference

### Health & Status
```bash
# Health check
curl http://localhost:9193/api/health

# Detailed status
curl http://localhost:9193/api/status
```

### Sources
```bash
# List available sources
curl "http://localhost:9193/api/sources/list?timeframe=3&feed_type=iptv"

# Save selected sources
curl -X POST http://localhost:9193/api/sources/select \
  -H "Content-Type: application/json" \
  -d '{"sources":["canada.xml.gz","usa.xml.gz"]}'
```

### Channels
```bash
# Load channels from sources
curl "http://localhost:9193/api/channels/from-sources?sources=canada.xml.gz,usa.xml.gz"

# Get selected channels
curl http://localhost:9193/api/channels/selected

# Save selected channels
curl -X POST http://localhost:9193/api/channels/select \
  -H "Content-Type: application/json" \
  -d '{"channels":["channel1","channel2","channel3"]}'

# Export channels as JSON
curl -X POST http://localhost:9193/api/channels/export > channels.json

# Import channels from JSON
curl -X POST http://localhost:9193/api/channels/import \
  -H "Content-Type: application/json" \
  -d @channels.json

# Save channels with versioning
curl -X POST http://localhost:9193/api/channels/save \
  -H "Content-Type: application/json" \
  -d '{"channels":["ch1","ch2"],"sources_count":2}'

# Get all channel versions
curl http://localhost:9193/api/channels/versions

# Download channel version
curl http://localhost:9193/api/archives/download-channel/channels.json -o channels.json

# Delete archived channel version
curl -X DELETE http://localhost:9193/api/archives/delete-channel/channels.json.20251122_162638
```

### Merge
```bash
# Execute merge
curl -X POST http://localhost:9193/api/merge/execute \
  -H "Content-Type: application/json" \
  -d '{"sources":["canada.xml.gz"],"channels":["ch1","ch2"],"timeframe":"3","feed_type":"iptv"}'

# Get current merge info
curl http://localhost:9193/api/merge/current

# Save as current (archive previous)
curl -X POST http://localhost:9193/api/merge/save \
  -H "Content-Type: application/json" \
  -d '{"filename":"merged_20251101_120000.xml.gz","channels":150,"programs":10000,"days_included":3}'
```

### Archives
```bash
# List all archives
curl http://localhost:9193/api/archives/list

# Download archive
curl http://localhost:9193/api/archives/download/merged.xml.gz -o merged.xml.gz

# Delete archive
curl -X DELETE http://localhost:9193/api/archives/delete/merged.xml.gz.20251101_120000

# Cleanup old archives
curl -X POST http://localhost:9193/api/archives/cleanup
```

### Settings
```bash
# Get all settings
curl http://localhost:9193/api/settings/get

# Set settings
curl -X POST http://localhost:9193/api/settings/set \
  -H "Content-Type: application/json" \
  -d '{"output_filename":"custom.xml.gz","merge_schedule":"daily","merge_time":"14:30"}'
```

### Jobs
```bash
# Get job status
curl http://localhost:9193/api/jobs/status

# Get job history
curl "http://localhost:9193/api/jobs/history?limit=10"

# Get latest job
curl http://localhost:9193/api/jobs/latest

# Manually trigger merge job
curl -X POST http://localhost:9193/api/jobs/execute

# Cancel running job
curl -X POST http://localhost:9193/api/jobs/cancel
```

---

## 📊 Version Management

### Check Current Version
```bash
# From file
cat /opt/epg-merge-app/backend/version.py | grep __version__

# From API
curl http://localhost:9193/api/health | jq .version

# From service
systemctl status epg-merge | grep Version
```

### Update Version
```bash
# Only edit ONE file (single source of truth)
nano /opt/epg-merge-app/backend/version.py

# Change this line:
__version__ = "0.4.4"  # Was 0.4.3

# Version auto-syncs to all other files during build
bash /opt/epg-merge-app/scripts/build.sh
```

---

## 🧪 Testing Workflows

### Full Test Suite
```bash
# Frontend tests
cd /opt/epg-merge-app/frontend
npm test -- --coverage

# Backend tests
cd /opt/epg-merge-app/backend
source venv/bin/activate
pytest tests/ -v
```

### Integration Testing
```bash
# Start service and run integration tests
systemctl status epg-merge  # Should be running

# Test each workflow
# 1. Load sources
curl http://localhost:9193/api/sources/list?timeframe=3

# 2. Load channels
curl http://localhost:9193/api/channels/from-sources?sources=canada.xml.gz

# 3. Execute merge (small test)
curl -X POST http://localhost:9193/api/merge/execute \
  -H "Content-Type: application/json" \
  -d '{"sources":["test.xml.gz"],"channels":["ch1"],"timeframe":"3","feed_type":"iptv"}'

# 4. Check archives
curl http://localhost:9193/api/archives/list
```

---

## 🔄 Git Workflow

### Before Starting Work
```bash
# Update local copy
git pull origin main

# Check current status
git status

# Check what branch you're on
git branch -a
```

### During Development
```bash
# Stage changes
git add -A

# Check what's staged
git status

# Commit with descriptive message
git commit -m "feat: Description - v0.4.4"

# View commit history
git log --oneline -10
```

### After Completing Feature
```bash
# Push changes
git push origin main

# If creating release
git tag -a v0.4.4 -m "Version 0.4.4 - Feature name"
git push origin v0.4.4

# Verify it's there
git tag -l
```

---

## 💡 Performance Tips

### Reduce Merge Time
```bash
# Download timeout - increase if on slow connection
# In Settings: download_timeout = 180 seconds

# Merge timeout - increase for large merges
# In Settings: merge_timeout = 600 seconds

# Use smaller timeframe (3 days instead of 14)
```

### Clear Cache
```bash
# If seeing stale data
rm -rf /config/epg_cache/*

# Will re-download next merge
```

### Optimize Archive Storage
```bash
# Check archive size
du -sh /config/archives/

# Enable auto-cleanup in Settings
archive_retention_cleanup_expired = true

# Or manually clean old archives
find /config/archives -name "*.xml.gz.*" -mtime +30 -delete
```

---

## 🔐 Security Quick Checks

### Permissions
```bash
# Check ownership
ls -la /config/
ls -la /opt/epg-merge-app/

# Fix if needed
sudo chown root:root /config
sudo chmod 755 /config
```

### Service Access
```bash
# Service runs as root (adjust if needed)
systemctl cat epg-merge | grep User

# Check open ports
sudo netstat -tulpn | grep 9193

# Check firewall
sudo ufw status
```

### Database Security
```bash
# Check who can access database
ls -la /config/app.db

# If needed, restrict
sudo chmod 640 /config/app.db
```

---

## 📞 When to Check Each Resource

| Issue | Check |
|-------|-------|
| "Service won't start" | `journalctl -u epg-merge -n 50` |
| "Frontend blank/404" | `curl http://localhost:9193/api/health` |
| "Database corrupted" | `sqlite3 /config/app.db "PRAGMA integrity_check;"` |
| "Port already in use" | `lsof -i :9193` |
| "Settings not saving" | `sqlite3 /config/app.db "SELECT * FROM settings;"` |
| "Merge failed" | `journalctl -u epg-merge -n 100` |
| "Archive not showing" | `ls -la /config/archives/` |
| "Performance slow" | Check `du -sh /config/epg_cache/` and clear if needed |

---

## 🚀 Deployment Checklist

Before going live:
- [ ] Service starts without errors: `systemctl restart epg-merge`
- [ ] API responds: `curl http://localhost:9193/api/health`
- [ ] Frontend loads: Visit http://server-ip:9193
- [ ] Database intact: `sqlite3 /config/app.db "PRAGMA integrity_check;"`
- [ ] Tests pass: `npm test` or `pytest tests/`
- [ ] Backups configured: Check `/opt/epg-merge-app/backups/`
- [ ] Version updated: Check `/opt/epg-merge-app/backend/version.py`

---

**Last Updated:** November 23, 2025  
**For detailed guides:** See docs/ folder