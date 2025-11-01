# Deployment Guide

Deploy EPG Merge to production with confidence.

---

## Quick Deploy (< 5 minutes)

For experienced operators deploying a known version:

```bash
# SSH to production server
ssh root@your-server

# Navigate to app
cd /opt/epg-merge-app

# Pull latest code
git pull origin main

# Rebuild and restart (auto-restarts service)
sudo bash scripts/build.sh

# Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

---

## Full Deployment Workflow

### Pre-Deployment Checklist

- [ ] All code changes tested locally
- [ ] All tests passing (`pytest tests/ -v` and `npm test`)
- [ ] Version updated in all files
- [ ] CHANGELOG.md updated with changes
- [ ] Code review complete
- [ ] No debug code or console.logs
- [ ] Production credentials prepared (.env if needed)

### Pre-Deployment Commands (On Dev Machine)

```bash
# Verify working directory is clean
git status

# Pull latest
git pull origin main

# Run tests
cd backend && pytest tests/ -v
cd ../frontend && npm run build

# Review changes
git log -5 --oneline
git diff HEAD~5
```

---

## Deployment Types

### Type 1: Small Patch (Bug fixes, minor changes)

**When to use:** Typo fixes, CSS adjustments, small bug fixes, documentation

**Steps:**

```bash
# On production server
cd /opt/epg-merge-app

# Create backup (always backup first!)
sudo bash scripts/backup.sh --compress

# Pull changes
git pull origin main

# Restart service
sudo systemctl restart epg-merge

# Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

**Time:** ~2 minutes

### Type 2: Feature Deployment (New features, enhancements)

**When to use:** New API endpoints, new UI components, breaking changes

**Steps:**

```bash
# On dev machine
cd ~/github/epg-merge

# Verify everything is clean
git status

# Run full test suite
cd backend && pytest tests/ -v
cd ../frontend && npm test

# Update version in all locations
# - backend/version.py
# - frontend/package.json
# - install/install.sh
# - CONTEXT.md
# - frontend/src/components/Navbar.js

# Commit version bump
git add .
git commit -m "chore: bump version to 0.4.4"

# Tag release
git tag -a v0.4.4 -m "Version 0.4.4 - New features"

# Push to GitHub
git push origin main v0.4.4
```

```bash
# On production server
cd /opt/epg-merge-app

# Create backup
sudo bash scripts/backup.sh --compress

# Pull code
git pull origin main

# Rebuild (auto-restarts)
sudo bash scripts/build.sh

# Verify all components
systemctl status epg-merge
curl http://localhost:9193/api/health
curl http://localhost:9193/

# Check logs
journalctl -u epg-merge -n 20 --no-pager
```

**Time:** ~10-15 minutes

### Type 3: Hotfix (Critical bugs, security issues)

**When to use:** Service crashes, data corruption risk, security vulnerability

**Steps:**

```bash
# On production server (act quickly!)
cd /opt/epg-merge-app

# Create backup immediately
sudo bash scripts/backup.sh --compress

# Check current version
git log --oneline -3

# If service is failing, check logs
journalctl -u epg-merge -n 100 --no-pager

# Try immediate restart
sudo systemctl restart epg-merge

# If restart fails, rollback to previous version
sudo bash scripts/restore.sh backup_YYYYMMDD_HHMMSS

# Verify restoration
systemctl status epg-merge
curl http://localhost:9193/api/health
```

**On dev machine (after stabilizing production):**

```bash
# Create hotfix branch
git checkout -b hotfix/critical-issue

# Fix the issue
# ... edit files ...

# Test fix locally
cd backend && pytest tests/
cd ../frontend && npm run build

# Commit fix
git add .
git commit -m "Hotfix: Brief description of fix

Issue: What went wrong
Fix: How it's fixed
Impact: What this prevents"

# Create minimal tag
git tag -a v0.4.3-hotfix1 -m "Hotfix: Critical issue"

# Push
git push origin main v0.4.3-hotfix1
```

**Time to stabilize:** ~5 minutes  
**Time to fix & redeploy:** ~30 minutes

---

## Deployment Checklists

### Pre-Deployment

```bash
# Development machine
git status                          # Clean working directory?
pytest tests/ -v                   # Tests pass?
npm run build                      # Frontend builds?
grep -r "console.log" backend/     # No debug code?
cat .env.example                   # Secrets needed?
```

### During Deployment

```bash
# Production server
cd /opt/epg-merge-app
sudo bash scripts/backup.sh --compress    # Backed up?
git pull origin main                      # Code pulled?
sudo bash scripts/build.sh                # Built successfully?
```

### Post-Deployment

```bash
# Verify service
systemctl status epg-merge                # Running?
curl http://localhost:9193/api/health     # API OK?
curl http://localhost:9193/                # Frontend loads?

# Check logs
journalctl -u epg-merge -n 20 --no-pager  # Errors?
tail -f /var/log/syslog | grep epg        # System issues?

# Spot check features
# - Open web UI
# - Load a merge
# - Download an archive
# - Check Settings

# Monitor for issues
watch -n 5 'systemctl status epg-merge'   # Keep an eye for 5 min
```

---

## Rollback Procedure

If deployment fails or causes issues, rollback immediately.

### Quick Rollback

```bash
# Stop service
sudo systemctl stop epg-merge

# List available backups
ls -lht /opt/epg-merge-app/backups/ | head -5

# Restore previous backup
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_YYYYMMDD_HHMMSS

# Verify restored version
cat /opt/epg-merge-app/.version

# Restart service
sudo systemctl start epg-merge

# Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

### Rollback to Previous Git Commit

If no backup available:

```bash
cd /opt/epg-merge-app

# See recent commits
git log --oneline -10

# Revert to known-good version
git checkout v0.4.3

# Rebuild
sudo bash scripts/build.sh

# Verify
systemctl status epg-merge
curl http://localhost:9193/api/health
```

---

## Environment Configuration

### Required Environment Variables

Set these in `/opt/epg-merge-app/.env` or systemd service:

```bash
# Database location
DB_PATH=/config/app.db

# Backend port
BACKEND_PORT=8000

# Frontend port
FRONTEND_PORT=3000

# Production mode
ENVIRONMENT=production

# Optional: Discord webhook (set via UI, not env)
# DISCORD_WEBHOOK=https://discord.com/api/webhooks/...
```

### Check Environment

```bash
# View current environment
systemctl cat epg-merge | grep Environment

# View app config
cat /opt/epg-merge-app/.env
```

---

## Docker Compose Deployment

For Docker-based deployment:

```bash
cd /opt/epg-merge-app

# Build images
sudo docker-compose build

# Start services
sudo docker-compose up -d

# Verify
sudo docker-compose ps
curl http://localhost:9193/api/health

# View logs
sudo docker-compose logs -f

# Stop
sudo docker-compose down
```

---

## Monitoring After Deployment

### Critical Metrics (First 1 hour)

- [ ] Service stays running
- [ ] No errors in logs
- [ ] API responds within 1 second
- [ ] Frontend loads without errors
- [ ] No memory leaks (check `ps aux`)
- [ ] Disk space stable (check `df`)

### Ongoing Monitoring

- Check service status daily
- Review error logs weekly
- Monitor disk usage for archives
- Test restore procedure monthly

See [Maintenance](MAINTENANCE.md) for detailed monitoring guide.

---

## Common Deployment Issues

### Service Won't Start

**Check logs:**
```bash
journalctl -u epg-merge -n 100 --no-pager
```

**Common causes:**
- Syntax error in Python/JavaScript
- Missing dependency
- Database locked
- Conflicting port

**Fix:**
```bash
# Check for syntax errors
python -m py_compile backend/main.py

# Check if port is in use
lsof -i :8000
lsof -i :3000

# Restart everything
sudo systemctl restart epg-merge
```

### Database Connection Failed

```bash
# Verify database exists and is accessible
ls -la /config/app.db

# Check permissions
sudo chown -R epg-merge:epg-merge /config/app.db

# Restart service
sudo systemctl restart epg-merge
```

### High Memory Usage

```bash
# Monitor memory
ps aux | grep epg-merge | grep -v grep

# If using too much:
# 1. Restart service: sudo systemctl restart epg-merge
# 2. Check logs for large operations: journalctl -u epg-merge -f
# 3. Increase merge timeout in Settings
```

### Slow API Responses

```bash
# Check if merge is running
curl http://localhost:9193/api/jobs/status

# Check system load
uptime

# Check disk I/O
iostat -x 1 5

# If stuck, restart service
sudo systemctl restart epg-merge
```

---

## Deployment Frequency

| Type | Frequency | Stability |
|------|-----------|-----------|
| Documentation | Daily | Always safe |
| Bug fixes | As needed | Test thoroughly first |
| Features | Weekly/bi-weekly | Full test suite |
| Major changes | Monthly or less | Extensive testing |
| Hotfixes | ASAP | Emergency only |

---

## Best Practices

✅ **DO:**
- Always backup before deploying
- Test in staging/dev first
- Deploy during low-traffic times
- Have rollback plan ready
- Monitor after deployment
- Update documentation with changes
- Use semantic versioning (v0.x.x)
- Tag all releases in git
- Keep backups for at least 30 days

❌ **DON'T:**
- Deploy untested code to production
- Skip backups to save time
- Deploy during high-traffic periods
- Leave old code branches around
- Forget to update version numbers
- Deploy without monitoring first 5 minutes
- Mix multiple features in one deployment
- Deploy without clear rollback strategy

---

## Deployment Troubleshooting

See [Troubleshooting](TROUBLESHOOTING.md) for:
- Service won't start
- Frontend not loading
- Database issues
- Merge hangs/timeouts
- Docker issues
- Advanced debugging

---

## Related Documentation

- [Quick Start](QUICK_START.md) - Local development
- [Development](DEVELOPMENT.md) - Local setup and testing
- [Maintenance](MAINTENANCE.md) - Post-deployment monitoring
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [Scheduling](SCHEDULING.md) - Automated job scheduling

---

**Need help?** Check [Troubleshooting](TROUBLESHOOTING.md) or [QUICK_REFERENCE.md](QUICK_REFERENCE.md).