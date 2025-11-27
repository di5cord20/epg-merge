# Troubleshooting Guide

Diagnose and fix common EPG Merge issues.

---

## Quick Fixes (Try These First)

### Service Won't Start

```bash
# 1. Check what's wrong
journalctl -u epg-merge -n 50 --no-pager

# 2. Common issues:
#    - Syntax error: python -m py_compile backend/main.py
#    - Missing dependency: pip install -r requirements.txt
#    - Port in use: lsof -i :8000 or lsof -i :3000
#    - Database locked: ps aux | grep epg-merge

# 3. Try restart
sudo systemctl restart epg-merge

# 4. If still failing, rollback
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_YYYYMMDD_HHMMSS
```

### Frontend Not Loading

```bash
# 1. Clear cache and rebuild
rm -rf /opt/epg-merge-app/backend/static/*
sudo bash /opt/epg-merge-app/scripts/build.sh

# 2. Clear browser cache (Ctrl+Shift+R in browser)

# 3. Check frontend is running
curl http://localhost/

# 4. Check backend is running
curl http://localhost:9193/api/health
```

### API Returns 500 Error

```bash
# 1. Check logs
journalctl -u epg-merge -n 20 --no-pager | tail -10

# 2. Check database
sqlite3 /config/app.db "PRAGMA integrity_check;"

# 3. Restart service
sudo systemctl restart epg-merge

# 4. If error persists, check specific endpoint
curl http://localhost:9193/api/jobs/status | jq
```

### Database Corrupted

```bash
# 1. Check integrity
sqlite3 /config/app.db "PRAGMA integrity_check;"

# 2. If issues found:
rm /config/app.db

# 3. Restart service (will recreate database)
sudo systemctl restart epg-merge

# 4. Verify
curl http://localhost:9193/api/health
```

### Merge Hangs or Times Out

```bash
# 1. Check if merge is actually running
ps aux | grep merge

# 2. Check timeout setting
curl http://localhost:9193/api/settings/get | jq '.data.merge_timeout'

# 3. Increase timeout
curl -X POST http://localhost:9193/api/settings/set \
  -H "Content-Type: application/json" \
  -d '{"merge_timeout": 900}'

# 4. Try merge again
curl -X POST http://localhost:9193/api/merge/execute

# 5. If still hangs, check disk space
df -h /config
```

---

## Common Issues by Category

### Service Status Issues

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Service won't start | `systemctl status epg-merge` shows error | Check logs: `journalctl -u epg-merge -n 50` |
| Service crashes randomly | Check memory usage: `ps aux` | Increase timeout, restart service |
| Service slow to respond | High CPU/memory usage | Check merge job status, restart if needed |
| Port already in use | `lsof -i :8000` or `lsof -i :3000` | Kill other process or change port |

### Frontend Issues

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Page won't load | Check browser console (F12) | Clear cache, rebuild frontend |
| Styles look wrong | Compare to screenshot | Clear browser cache (Ctrl+Shift+R) |
| Can't select channels | API error in console | Check backend is running |
| Merge button doesn't work | Check network tab in DevTools | See API error response |

### API Issues

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| 404 errors | Endpoint doesn't exist | Check API-SPEC.md for correct path |
| 500 errors | Server error | Check logs, restart service |
| Timeout errors | Long operation | Increase timeout setting |
| Connection refused | Service not running | `systemctl start epg-merge` |

### Merge Process Issues

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Merge produces empty file | No channels selected | Select channels before merging |
| Merge is slow | Large file or slow network | Increase timeout, check network |
| Memory usage high during merge | Check `ps aux` | Normal during large merges, restart after |
| Merge incomplete | Check error logs | Check channel filtering settings |

### Scheduler Issues (v0.4.9)

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Scheduler shows "No sources configured" | `selected_sources` setting is empty | Go to Settings → Schedule, select source version, click Save |
| Scheduler recalculates but doesn't run | Settings changed but old sleep active | Scheduler checks every 60s, breaks sleep on change, recalculates |
| Next run time incorrect | Settings changed but UI not updated | Refresh page or check Dashboard |
| Memory usage high during merge | Normal - peak tracked during execution | Check Dashboard for peak_memory_mb value |
| Job won't cancel | Already completed before cancel sent | Check status, may have already finished |
| Clear History button disabled | No job history exists yet | Run manual merge to create history |

**Debugging Scheduler:**
```bash
docker compose logs backend | grep -i scheduler
curl http://localhost:9193/api/jobs/status | jq
curl -X POST http://localhost:9193/api/jobs/execute-now
```

---

### Archive Issues

| Problem | Diagnosis | Solution |
|---------|-----------|----------|
| Can't download archive | File doesn't exist | Check archive list first |
| Archive not created | Check merge status | Verify merge completed successfully |
| Disk space growing | Old archives not cleaned up | Run cleanup: `POST /api/archives/cleanup` |
| Can't delete archive | Deleting current file | Can only delete previous versions |

---

## Diagnostic Commands

### Check Service Health

```bash
# Is service running?
systemctl status epg-merge

# How long has it been running?
systemctl status epg-merge | grep Active

# Is API responding?
curl http://localhost:9193/api/health

# What processes are running?
ps aux | grep epg-merge | grep -v grep
```

### View Logs

```bash
# Live logs
journalctl -u epg-merge -f

# Last 50 lines
journalctl -u epg-merge -n 50 --no-pager

# Errors only
journalctl -u epg-merge -p err -n 20 --no-pager

# Last 1 hour
journalctl -u epg-merge --since "1 hour ago"

# Specific date range
journalctl -u epg-merge --since "2025-11-01 00:00:00" --until "2025-11-01 23:59:59"

# Follow with grep filter
journalctl -u epg-merge -f | grep -i error
```

### Database Inspection

```bash
# Connect to database
sqlite3 /config/app.db

# Inside sqlite3 prompt:
sqlite> .schema                      # View all tables
sqlite> SELECT * FROM settings;     # View settings
sqlite> SELECT * FROM archives;     # View archives
sqlite> SELECT * FROM job_history;  # View jobs
sqlite> SELECT COUNT(*) FROM channels_selected;  # Count channels
sqlite> PRAGMA integrity_check;     # Check database health
sqlite> .exit                        # Exit
```

### System Resources

```bash
# Memory usage
free -h

# Disk usage
df -h /config

# CPU usage
top -p $(pgrep -f epg-merge | tr '\n' ',')

# Network connections
netstat -tuln | grep 9193
ss -tuln | grep 9193

# Open files
lsof -p $(pgrep -f epg-merge)
```

### Docker Issues (if using Docker)

```bash
# Check container status
docker ps -a | grep epg-merge

# View container logs
docker logs epg-merge-backend
docker logs epg-merge-frontend

# Inspect container
docker inspect epg-merge-backend

# Get into container
docker exec -it epg-merge-backend bash

# Check resource usage
docker stats epg-merge-backend
```

---

## Advanced Troubleshooting

### Enable Debug Logging

```bash
# Set log level (if supported)
# Edit backend/main.py or backend/services/

# Or follow logs with more detail
journalctl -u epg-merge -o verbose -f
```

### Test Individual Components

```bash
# Test backend API
curl http://localhost:9193/api/health
curl http://localhost:9193/api/status

# Test frontend
curl http://localhost/ | head -50

# Test database connection
sqlite3 /config/app.db "SELECT COUNT(*) FROM sqlite_master;"

# Test source connection (if needed)
curl -I https://share.jesmann.com/
```

### Verify Configuration

```bash
# Get all settings
curl http://localhost:9193/api/settings/get | jq

# Check schedule configuration
curl http://localhost:9193/api/settings/get | jq '.data | {merge_schedule, merge_time, merge_days}'

# Check job status
curl http://localhost:9193/api/jobs/status | jq
```

### Monitor Performance

```bash
# Memory over time
watch -n 2 'free -h'

# CPU and memory
watch -n 2 'ps aux | grep epg-merge'

# Disk usage
watch -n 5 'du -sh /config/*'

# Network connections
watch -n 2 'ss -tuln | grep 9193'
```

---

## Disaster Recovery

### If Database Corrupted Beyond Repair

```bash
# 1. Backup corrupted database
cp /config/app.db /config/app.db.corrupt

# 2. Remove corrupted database
rm /config/app.db

# 3. Restart service (will create new database)
sudo systemctl restart epg-merge

# 4. Verify
curl http://localhost:9193/api/health

# 5. Reconfigure settings if needed
# - Set sources
# - Select channels
# - Configure schedule
```

### If Service Completely Broken

```bash
# 1. Identify last working backup
ls -lh /opt/epg-merge-app/backups/

# 2. Restore from backup
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_YYYYMMDD_HHMMSS

# 3. Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

### If Git Repository Corrupted

```bash
# 1. Backup current state
cp -r /opt/epg-merge-app /opt/epg-merge-app.backup

# 2. Reset to last known commit
cd /opt/epg-merge-app
git reset --hard HEAD

# 3. Pull latest
git pull origin main

# 4. Rebuild
sudo bash scripts/build.sh

# 5. Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

---

## When to Rollback

**Rollback immediately if:**
- Service crashes on every merge attempt
- Database becomes corrupted
- API returning 500 on most endpoints
- Data loss occurring
- Frontend completely broken

**Rollback procedure:**

```bash
# 1. Identify last good backup
ls -lh /opt/epg-merge-app/backups/ | head -5

# 2. Stop service
sudo systemctl stop epg-merge

# 3. Restore backup
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_YYYYMMDD_HHMMSS

# 4. Restart service
sudo systemctl start epg-merge

# 5. Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

---

## Getting Help

### Information to Provide

When asking for help, provide:

1. **Symptoms** - What doesn't work?
2. **Logs** - Run: `journalctl -u epg-merge -n 100 --no-pager > logs.txt`
3. **System info** - Run: `uname -a && lsb_release -a`
4. **Version** - Run: `curl http://localhost:9193/api/health`
5. **Recent changes** - What changed before the issue?
6. **Steps to reproduce** - How can someone replicate the issue?

### Resources

- **GitHub Issues** - https://github.com/di5cord20/epg-merge/issues
- **Logs** - `journalctl -u epg-merge -f`
- **Documentation** - See [README.md](README.md) for docs index
- **API** - See [API-SPEC.md](API-SPEC.md)

---

## Performance Troubleshooting

### Slow Merges

**Diagnosis:**
```bash
# Monitor merge progress
watch -n 1 'ps aux | grep merge'

# Check network connectivity
ping -c 3 share.jesmann.com

# Check disk I/O
iostat -x 1 5
```

**Solutions:**
- Increase `merge_timeout` in Settings
- Check network connection to share.jesmann.com
- Reduce number of channels selected
- Merge fewer sources

### High Memory Usage

**Diagnosis:**
```bash
# Check memory
free -h
ps aux | grep epg-merge | grep -v grep

# Check database size
du -h /config/app.db
```

**Solutions:**
- Restart service: `sudo systemctl restart epg-merge`
- Clean up old archives: `POST /api/archives/cleanup`
- Reduce merge timeout
- Reduce database size

### High Disk Usage

**Diagnosis:**
```bash
# Check disk
df -h /config
du -sh /config/*

# Find large files
find /config -size +100M -type f
```

**Solutions:**
- Clean up old archives: `POST /api/archives/cleanup`
- Delete old backups: `rm /opt/epg-merge-app/backups/*.tar.gz`
- Clear merge cache: `rm /tmp/merged_*.xml.gz`

---

## Test Your Fix

After applying a fix, verify:

```bash
# 1. Service is running
systemctl status epg-merge

# 2. API responds
curl http://localhost:9193/api/health

# 3. Frontend loads
curl http://localhost:9193/ | head -20

# 4. Reproduce original problem
# ... perform the operation that was failing ...

# 5. Monitor logs during operation
journalctl -u epg-merge -f
```

---

## Related Documentation

- [Deployment](DEPLOYMENT.md) - Deployment issues
- [Maintenance](MAINTENANCE.md) - Monitoring and backups
- [Scheduling](SCHEDULING.md) - Job scheduling issues
- [Development](DEVELOPMENT.md) - Development/testing issues

---

**Still stuck?** Open an issue: https://github.com/di5cord20/epg-merge/issues