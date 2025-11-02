# EPG Merge - Docker Deployment Guide

**Version:** 0.4.7  
**Status:** Production Ready  
**Estimated Setup Time:** 5-10 minutes

---

## Prerequisites

You need:
- ✅ Docker & Docker Compose installed
- ✅ A Linux server or NAS (Ubuntu, Debian, or similar)
- ✅ ~500MB disk space for initial setup
- ✅ Internet access to download Docker images

**Don't have Docker?** See "Installing Docker" at the bottom.

---

## Quick Start (3 Steps)

### Step 1: Clone Repository

```bash
cd /opt
git clone https://github.com/di5cord20/epg-merge.git epg-merge-app
cd epg-merge-app
```

### Step 2: Create Data Directories

```bash
mkdir -p ./data/tmp
mkdir -p ./data/current
mkdir -p ./data/archives
mkdir -p ./config
```

### Step 3: Start the Application

```bash
docker compose up -d
sleep 30
```

**That's it!** Your app is now running.

---

## Accessing the Application

- **Web Interface:** http://your-server-ip
- **API:** http://your-server-ip:9193/api/
- **Health Check:** http://your-server-ip:9193/api/health

---

## Configuration (Settings)

### Access Settings

1. Open http://your-server-ip in your browser
2. Go to **Settings** (⚙️ icon)
3. Configure:
   - **Output File:** Filename for merged EPG (e.g., `merged.xml.gz`)
   - **Schedule:** Daily or Weekly
   - **Merge Time:** What time to run (UTC timezone)
   - **Merge Days:** Which days to run (if weekly)
   - **Download Timeout:** Seconds to download files (default: 120)
   - **Merge Timeout:** Seconds to complete merge (default: 300)
   - **Discord Webhook:** (Optional) For notifications

### Setting Timezone

By default, times are in UTC. To use your local timezone, edit `docker-compose.yml`:

```yaml
backend:
  environment:
    - TZ=America/New_York  # Change to your timezone
```

Common timezones:
- `America/New_York`
- `America/Los_Angeles`
- `America/Chicago`
- `Europe/London`
- `Europe/Paris`
- `Asia/Tokyo`
- `Australia/Sydney`

Then restart:
```bash
docker compose down
docker compose up -d
```

---

## How to Use

### 1. Select Sources

1. Go to **Sources** page
2. Choose timeframe (3, 7, or 14 days)
3. Choose feed type (IPTV or Gracenote)
4. Click **Refresh Files**
5. Select which files you want
6. Click **Save Sources**

### 2. Select Channels

1. Go to **Channels** page
2. Click **Load from Sources**
3. Channels from your selected sources appear
4. Select which channels you want to keep
5. Click **Save Channels**

### 3. Automatic Merge Schedule

Once you've configured settings, **merges run automatically** at your scheduled time!

**To manually run a merge:**
1. Go to **Merge** page
2. Click **Start Merge**
3. Download the result or save as current

### 4. View Job History

Go to **Dashboard** to see:
- ✅ Current job status
- ✅ Next scheduled run time
- ✅ Recent job history
- 📊 Job statistics (channels, programs, memory, duration)

---

## Discord Notifications (Optional)

Get notified when merges complete:

### Setup

1. Create a Discord server or use existing one
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Copy the webhook URL
5. In EPG Merge Settings, paste the URL in **Discord Webhook** field
6. Save

### What You'll Receive

✅ Success notification with:
- Filename
- Channels included
- Programs included
- Output size
- Peak memory usage
- Duration
- Timestamp

❌ Failure notification with:
- Error message
- Job ID

---

## Common Tasks

### Check If Running

```bash
docker compose ps
```

Should show both `backend` and `frontend` as `healthy` or `running`.

### View Logs

```bash
# All logs
docker compose logs

# Backend only
docker compose logs backend

# Follow logs in real-time
docker compose logs -f backend
```

### Restart Application

```bash
docker compose restart
```

### Stop Application

```bash
docker compose down
```

### Start Application

```bash
docker compose up -d
```

### Update to Latest Version

```bash
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
sleep 30
```

---

## Troubleshooting

### Issue: Can't access web interface

**Check 1:** Is it running?
```bash
docker compose ps
```

Should show both services as `healthy`.

**Check 2:** Is firewall blocking port 80?
```bash
# Try accessing API directly
curl http://your-server-ip:9193/api/health
```

**Check 3:** Check backend logs
```bash
docker compose logs backend | tail -20
```

---

### Issue: Merge doesn't start

**Check:**
1. Did you select sources? Go to **Sources** page
2. Did you select channels? Go to **Channels** page
3. Are both saved? Try the **Merge** page

---

### Issue: Scheduled merge not running

**Check:**
1. Is application running? `docker compose ps`
2. Check next scheduled time: **Dashboard** page
3. Review settings: **Settings → Schedule**
4. Check logs: `docker compose logs backend | grep -i scheduler`

---

### Issue: Out of disk space

```bash
# Clean up Docker
docker system prune -a
docker volume prune

# Check disk usage
df -h

# If needed, clean archives
rm /opt/epg-merge-app/data/archives/*.xml.gz.*
```

---

## File Structure

```
/opt/epg-merge-app/
├── docker-compose.yml      # Main configuration
├── frontend/               # Web interface
├── backend/                # API server
├── data/                   # Your data (persistent)
│   ├── tmp/               # Temporary merges
│   ├── current/           # Current live file
│   └── archives/          # Backup archives
└── config/                # Database & cache
    └── app.db            # Settings database
```

**Important:** Only the `data/` and `config/` directories contain your data. Back these up!

---

## Backup & Restore

### Backup

```bash
# Back up everything
tar -czf epg-merge-backup.tar.gz /opt/epg-merge-app/data /opt/epg-merge-app/config

# Or just settings
cp /opt/epg-merge-app/config/app.db epg-merge-settings-backup.db
```

### Restore

```bash
# Restore from backup
tar -xzf epg-merge-backup.tar.gz -C /

# Or restore just settings
cp epg-merge-settings-backup.db /opt/epg-merge-app/config/app.db
docker compose restart
```

---

## Installing Docker

### Ubuntu/Debian

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group (optional - avoids sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### Other Systems

Visit: https://docs.docker.com/get-docker/

---

## Performance Tips

### 1. Schedule During Off-Peak Hours
Set merge time when your server isn't busy (e.g., 2 AM)

### 2. Monitor Memory
Check **Dashboard** to see memory usage. If merges use lots of memory:
- Reduce number of channels selected
- Reduce timeframe (use 3-day instead of 14-day)

### 3. Archive Cleanup
Old archives are kept by default. To delete files older than 30 days:
```bash
find /opt/epg-merge-app/data/archives -name "*.xml.gz.*" -mtime +30 -delete
```

### 4. Resource Allocation
To limit Docker resources, edit `docker-compose.yml`:

```yaml
backend:
  deploy:
    resources:
      limits:
        memory: 512M
        cpus: '1'
```

---

## Getting Help

### Resources

- **GitHub Issues:** https://github.com/di5cord20/epg-merge/issues
- **Documentation:** Check `/docs/` folder in repository
- **API Docs:** http://your-server-ip:9193/docs (auto-generated)

### Debug Commands

```bash
# Full system status
docker compose ps -a
docker compose logs --tail=100

# Backend health
curl http://localhost:9193/api/health | python3 -m json.tool

# Job status
curl http://localhost:9193/api/jobs/status | python3 -m json.tool

# Settings
curl http://localhost:9193/api/settings/get | python3 -m json.tool
```

---

## FAQ

### Q: How much disk space do I need?
**A:** ~500MB minimum. Depends on:
- Number of channels
- Archive retention (default keeps 30 days)
- Timeframe (14 days uses more than 3 days)

Monitor: `df -h /opt/epg-merge-app/data`

### Q: Can I run this on a NAS?
**A:** Yes! If your NAS supports Docker (Synology, QNAP, etc.), follow the same steps.

### Q: Is it safe to stop the application?
**A:** Yes. Use `docker compose down`. Your settings and history are safe in `/config/app.db`.

### Q: Can I move the data directory?
**A:** Yes. Edit `docker-compose.yml` volumes section and change the path.

### Q: What if I want to change the output filename?
**A:** Go to **Settings → Output File** and change it. New merges will use the new name.

### Q: Can I use this on Windows?
**A:** Yes, if you have Docker Desktop installed. Same commands apply.

---

## Version & Support

- **Current Version:** 0.4.7
- **Release Date:** November 2, 2025
- **Status:** Production Ready

For updates, check: https://github.com/di5cord20/epg-merge/releases

---

**Last Updated:** November 2, 2025