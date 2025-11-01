# Maintenance & Operations Guide

Keep EPG Merge running smoothly with regular maintenance and monitoring.

---

## Regular Maintenance Tasks

### Daily (5 minutes)

```bash
# Check service is running
systemctl status epg-merge

# Monitor logs for errors
journalctl -u epg-merge -n 20 --no-pager
```

### Weekly (15 minutes)

```bash
# Verify recent jobs completed
curl http://localhost:9193/api/jobs/history?limit=10 | jq '.data.jobs[] | {job_id, status, execution_time_seconds}'

# Check disk space
df -h /config

# Review any error patterns
journalctl -u epg-merge --since "1 week ago" | grep -i error | head -10
```

### Monthly (30 minutes)

```bash
# Create manual backup
sudo bash /opt/epg-merge-app/scripts/backup.sh --compress

# Review full job history
curl http://localhost:9193/api/jobs/history?limit=100 | jq

# Test restore procedure
sudo bash /opt/epg-merge-app/scripts/restore.sh <test-backup-name>

# Check database optimization
sqlite3 /config/app.db "PRAGMA optimize;"

# Review and rotate old backups (keep last 30 days)
ls -lh /opt/epg-merge-app/backups/ | tail -20
```

---

## Backups

### Automatic Backups

Backups run automatically before deployments and can be configured for other scenarios.

**Backup includes:**
- SQLite database (`/config/app.db`)
- Current merged file
- Archive metadata
- Configuration files

### Manual Backup

Create a backup anytime:

```bash
# Create compressed backup
sudo bash /opt/epg-merge-app/scripts/backup.sh --compress

# Backup is saved to
ls -lh /opt/epg-merge-app/backups/ | head -5

# Backup format
# backup_YYYYMMDD_HHMMSS.tar.gz (compressed)
# or
# backup_YYYYMMDD_HHMMSS/ (uncompressed)
```

### Backup Storage

**Recommended strategy:**
- Daily backups: Keep 7 days
- Weekly backups: Keep 4 weeks
- Monthly backups: Keep 12 months

```bash
# Find old backups (older than 30 days)
find /opt/epg-merge-app/backups/ -type f -name "*.tar.gz" -mtime +30

# Archive very old backups (optional)
tar -czf /archive/backups-before-2025-10.tar.gz /opt/epg-merge-app/backups/backup_202509* /opt/epg-merge-app/backups/backup_202510*

# Delete old local backups
rm /opt/epg-merge-app/backups/backup_202509*.tar.gz
```

### Backup Verification

```bash
# List contents of backup
tar -tzf /opt/epg-merge-app/backups/backup_YYYYMMDD_HHMMSS.tar.gz | head -20

# Verify backup integrity
tar -tzf /opt/epg-merge-app/backups/backup_YYYYMMDD_HHMMSS.tar.gz > /dev/null && echo "OK" || echo "CORRUPTED"
```

### Restore from Backup

```bash
# List available backups
ls -lh /opt/epg-merge-app/backups/

# Restore specific backup
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_YYYYMMDD_HHMMSS

# Verify restoration
systemctl status epg-merge
curl http://localhost:9193/api/health
```

---

## Monitoring

### Service Health

**Quick health check:**
```bash
curl http://localhost:9193/api/health | jq
```

Expected response:
```json
{
  "status": "ok",
  "version": "0.4.3",
  "uptime_seconds": 86400
}
```

**Full status:**
```bash
curl http://localhost:9193/api/status | jq
```

### Performance Metrics

**Memory usage:**
```bash
ps aux | grep epg-merge | grep -v grep | awk '{print $6 " KB memory"}'
free -h
```

**Disk usage:**
```bash
du -sh /config/
du -sh /opt/epg-merge-app/

# Breakdown
du -sh /config/*
```

**Database size:**
```bash
ls -lh /config/app.db
sqlite3 /config/app.db "SELECT page_count * page_size as 'Size (bytes)' FROM pragma_page_count(), pragma_page_size();"
```

### Log Monitoring

**Real-time logs:**
```bash
journalctl -u epg-merge -f
```

**Filter by level:**
```bash
# Errors only
journalctl -u epg-merge -p err

# Warnings and errors
journalctl -u epg-merge -p warning -p err
```

**Time-based filtering:**
```bash
# Last hour
journalctl -u epg-merge --since "1 hour ago"

# Specific date range
journalctl -u epg-merge --since "2025-11-01 00:00:00" --until "2025-11-01 23:59:59"
```

**Search logs:**
```bash
# Find merge-related entries
journalctl -u epg-merge | grep -i merge

# Find errors
journalctl -u epg-merge | grep -i error

# Find warnings
journalctl -u epg-merge | grep -i warn
```

---

## Updates & Upgrades

### Check for Updates

```bash
cd /opt/epg-merge-app

# Fetch latest info
git fetch origin

# See what's new
git log --oneline main..origin/main

# See current version
cat .version
```

### Apply Updates

**For small updates (patches):**
```bash
cd /opt/epg-merge-app

# Create backup first
sudo bash scripts/backup.sh --compress

# Pull and deploy
git pull origin main
sudo bash scripts/build.sh

# Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

**For major updates:**
```bash
# Same as above, but also:

# Check changelog
cat CHANGELOG.md

# Review breaking changes
git log --oneline -20

# Test in staging first (if available)
```

### Version Management

```bash
# Check current version
cat /opt/epg-merge-app/.version

# See all versions
cd /opt/epg-merge-app && git tag -l | sort -V

# Revert to specific version
git checkout v0.4.3
sudo bash scripts/build.sh
```

---

## Database Maintenance

### Check Database Health

```bash
# Run integrity check
sqlite3 /config/app.db "PRAGMA integrity_check;"

# Should output: ok
```

### Optimize Database

```bash
# Vacuum (reclaim space)
sqlite3 /config/app.db "VACUUM;"

# Optimize query performance
sqlite3 /config/app.db "PRAGMA optimize;"

# Analyze for query planner
sqlite3 /config/app.db "ANALYZE;"
```

### View Database Statistics

```bash
# Connect to database
sqlite3 /config/app.db

# Inside sqlite3 prompt:
sqlite> SELECT name FROM sqlite_master WHERE type='table';
sqlite> SELECT COUNT(*) FROM archives;
sqlite> SELECT COUNT(*) FROM job_history;
sqlite> SELECT COUNT(*) FROM channels_selected;
sqlite> SELECT COUNT(*) FROM settings;

# See table schema
sqlite> .schema archives
sqlite> .schema job_history

# Exit
sqlite> .exit
```

### Database Troubleshooting

**If database is locked:**
```bash
# Find process using database
lsof /config/app.db

# Kill process if needed
kill -9 <PID>

# Restart service
sudo systemctl restart epg-merge
```

**If database corrupted:**
```bash
# Backup corrupted database
cp /config/app.db /config/app.db.corrupt

# Remove corrupted database
rm /config/app.db

# Restart service (creates new database)
sudo systemctl restart epg-merge

# Verify
curl http://localhost:9193/api/health
```

---

## Archive Management

### View Archives

```bash
# List all archives
curl http://localhost:9193/api/archives/list | jq

# Download archive
curl -O http://localhost:9193/api/archives/download/merged.xml.gz.20251101_120000
```

### Archive Cleanup

**Manual cleanup:**
```bash
curl -X POST http://localhost:9193/api/archives/cleanup
```

**Automatic cleanup:**
- Enable in Settings: `archive_retention_cleanup_expired`
- Runs automatically based on retention policy

**Delete specific archive:**
```bash
curl -X DELETE http://localhost:9193/api/archives/delete/merged.xml.gz.20251101_120000
```

### Storage Management

**Check what's using space:**
```bash
du -sh /config/archives/*
```

**Disk space optimization:**
```bash
# Free up space by cleaning old archives
curl -X POST http://localhost:9193/api/archives/cleanup

# Or delete manually
rm /config/archives/merged.xml.gz.202510*
```

---

## Log Management

### Log Rotation

Logs are managed by journalctl (system logs). To view rotation settings:

```bash
# Check log settings
journalctl --disk-usage

# Limit log size (optional)
# Edit /etc/systemd/journald.conf
sudo nano /etc/systemd/journald.conf

# Set: SystemMaxUse=1G (example)
# Then restart: sudo systemctl restart systemd-journald
```

### Log Cleanup (if needed)

```bash
# See current usage
journalctl --disk-usage

# Keep only recent logs (e.g., last 7 days)
sudo journalctl --vacuum-time=7d

# Or limit to size
sudo journalctl --vacuum-size=500M
```

---

## Monitoring Setup (Optional)

### Setup Simple Health Check

```bash
# Add to crontab
crontab -e

# Add line (checks every hour)
0 * * * * curl -s http://localhost:9193/api/health || echo "EPG Merge DOWN at $(date)" | mail admin@example.com
```

### Setup Status Dashboard

```bash
# Simple status script
cat > /usr/local/bin/epg-status << 'EOF'
#!/bin/bash
echo "=== EPG Merge Status ==="
echo "Service: $(systemctl is-active epg-merge)"
echo "Version: $(curl -s http://localhost:9193/api/health | jq -r .version)"
echo "Memory: $(ps aux | grep epg-merge | grep -v grep | awk '{print $6}') KB"
echo "Disk: $(du -sh /config | awk '{print $1}')"
echo "Database: $(ls -lh /config/app.db | awk '{print $5}')"
curl -s http://localhost:9193/api/jobs/status | jq '.data | {is_running, next_scheduled_run}'
EOF

chmod +x /usr/local/bin/epg-status
epg-status  # Run status check
```

### External Monitoring (Advanced)

For production systems, consider:
- **Uptime Kuma** - Lightweight uptime monitoring
- **Nagios** - Enterprise monitoring
- **Prometheus** - Metrics and alerting
- **Grafana** - Dashboard visualization

---

## Common Maintenance Issues

| Issue | Diagnosis | Solution |
|-------|-----------|----------|
| Disk filling up | `df -h /config` showing >80% | Run archive cleanup, delete old backups |
| Service hanging | Check `ps aux`, see hung process | Kill process, restart service |
| Memory creeping up | Monitor with `watch -n 5 'free -h'` | Restart service regularly |
| Database slow | Query takes long time | Run `VACUUM` and `ANALYZE` |
| Logs growing | `journalctl --disk-usage` | Rotate or vacuum logs |

---

## Disaster Recovery

### Quick Recovery Checklist

```bash
# 1. Identify the problem
journalctl -u epg-merge -n 50 --no-pager

# 2. Create backup of current state
sudo bash /opt/epg-merge-app/scripts/backup.sh

# 3. Identify last good backup
ls -lh /opt/epg-merge-app/backups/ | head -5

# 4. Restore from backup
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_YYYYMMDD_HHMMSS

# 5. Verify restoration
systemctl status epg-merge
curl http://localhost:9193/api/health

# 6. Monitor after recovery
journalctl -u epg-merge -f
```

### If Database Lost

```bash
# 1. Restore database from backup
sudo bash /opt/epg-merge-app/scripts/restore.sh <backup-name>

# 2. Or if no backup, recreate
rm /config/app.db
sudo systemctl restart epg-merge

# 3. Reconfigure settings
# Re-select sources, channels, schedule
```

### If Configuration Lost

```bash
# 1. Check git history
cd /opt/epg-merge-app && git log --oneline -20

# 2. Restore from previous commit
git checkout <commit-hash> -- CONTEXT.md README.md

# 3. Or restore from backup
sudo bash /opt/epg-merge-app/scripts/restore.sh <backup-name>
```

---

## Best Practices

✅ **DO:**
- Back up regularly (at least weekly)
- Monitor service health daily
- Test restore procedure monthly
- Keep logs for analysis
- Update regularly
- Document custom configurations
- Set up alerts if available

❌ **DON'T:**
- Skip backups to save storage
- Ignore errors in logs
- Mix active and backup systems
- Delete backups immediately
- Ignore disk space warnings
- Manually edit database (unless necessary)
- Deploy untested updates to production

---

## Related Documentation

- [Deployment](DEPLOYMENT.md) - Deployment procedures
- [Troubleshooting](TROUBLESHOOTING.md) - Diagnosing issues
- [Scheduling](SCHEDULING.md) - Job monitoring
- [Quick Reference](QUICK_REFERENCE.md) - Quick commands

---

**Schedule maintenance reminder:** Add calendar events for weekly and monthly tasks!

For help: Check [Troubleshooting](TROUBLESHOOTING.md) or see [README.md](README.md) for documentation index.