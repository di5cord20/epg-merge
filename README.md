# EPG Merge Application

> **Combine multiple XMLTV EPG files** into a single merged guide with automatic scheduling, channel filtering, and archive management. Perfect for users that want to select specific channels and/or consolidate multiple program guides consolidated into one.

---

## 🚀 Quick Start with Docker

Get up and running in 3 commands:

```bash
cd /opt
git clone https://github.com/di5cord20/epg-merge.git epg-merge-app
cd epg-merge-app

# Create data directories
mkdir -p ./data/{tmp,current,archives} ./config

# Start the application
docker compose up -d

# Wait for startup
sleep 30
```

**Open your browser:** http://your-server-ip

---

## 📖 How to Use EPG Merge

### Step 1: Select and Save Sources

1. Open the app and go to **Sources** page
2. Choose your preferences:
   - **Timeframe:** 3, 7, or 14 days of EPG data
   - **Feed Type:** IPTV or Gracenote
3. Click **Refresh Files** to fetch available sources
4. Select which source files you want to include (use search to filter)
5. Click **Save Sources**

✅ **Sources are now saved and ready**

---

### Step 2: Select and Save Channels

1. Go to **Channels** page
2. Click **Load from Sources** to extract available channels
3. Browse the list and select only the channels you want to keep (use search to filter)
4. Click **Save Channels**
5. Click **Export Channels** to save a json of your selection.
6. Click **Import Channels** to import your previously save backup.

✅ **Channels are now configured**

---

### Step 3: Test Manual Merge

1. Go to **Merge** page
2. Click **Start Merge** to process your first EPG
3. Watch the progress log in real-time
4. Choose what to do with the result:
   - **Download:** Save the file directly
   - **Save as Current:** Stores as your live EPG file

✅ **Merge is complete!**

---

### Step 4: View Your Files

1. Go to **Archives** page
2. See your current live file and all previous versions
3. Download any version or delete old backups

✅ **Your EPG files are safely archived**

---

### Step 5: Set Up Automatic Scheduling

1. Go to **Settings** page
2. Configure:
   - **Merge Schedule:** Daily or Weekly
   - **Merge Time:** What time to run (uses your timezone)
   - **Merge Days:** If weekly, which days to run
   - *Optional:* **Discord Webhook** for completion notifications

✅ **Merges now run automatically!**

---

### Step 6: Monitor Progress

1. Go to **Dashboard** to see:
   - Current job status (running or idle)
   - Next scheduled merge time
   - Recent job history
   - Memory usage and execution times
   - Latest job details

✅ **Stay informed about your merges**

---

## 📍 Application Pages

| Page | Purpose |
|------|---------|
| **Sources** | Select which EPG files to merge (3/7/14 days, IPTV/Gracenote) |
| **Channels** | Filter to include only specific TV channels |
| **Merge** | Manually run a merge, download, or save as current live file |
| **Archives** | View all your EPG files (current + backups) |
| **Dashboard** | Monitor scheduled job status and execution history |
| **Settings** | Configure automation, scheduling, timeouts, and Discord notifications |

---

## ⚙️ Settings Explained

| Setting | Purpose | Default |
|---------|---------|---------|
| **Output Filename** | Name of your merged EPG file | `merged.xml.gz` |
| **Merge Schedule** | Run daily or specific days weekly | Daily |
| **Merge Time** | What time to run (HH:MM format, UTC) | 00:00 |
| **Merge Days** | Which days to run (if weekly) | All days |
| **Merge Timeframe** | EPG timeframe for scheduled jobs (3/7/14 days) | 3 days |
| **Channel Version** | Which saved channels to use for scheduled merge | current |
| **Current Directory** | Where live merged file is stored | /data/current |
| **Archive Directory** | Where archived files are stored | /data/archives |
| **Channels Directory** | Where channel versions are stored | /data/channels |
| **Download Timeout** | Seconds to wait when downloading files | 120 |
| **Merge Timeout** | Seconds to wait for merge to complete | 300 |
| **Channel Drop Threshold** | Alert if channels drop below this count | (disabled) |
| **Archive Retention** | Automatically delete archives that don't have any scheduled programs remaining | enabled |
| **Discord Webhook** | Send notifications to Discord when merge completes | (optional) |

---

## 🎯 Common Workflows

### I want to merge daily at 2 AM
1. Go to **Settings**
2. Set **Merge Schedule:** Daily
3. Set **Merge Time:** 02:00
4. Click **Save**

✅ Merges automatically run daily at 2 AM your time

---

### I want to merge only on weekends
1. Go to **Settings**
2. Set **Merge Schedule:** Weekly
3. Set **Merge Time:** 12:00
4. Set **Merge Days:** Saturday, Sunday
5. Click **Save**

✅ Merges automatically run Saturdays and Sundays at noon

---

### I want Discord notifications
1. Create a Discord webhook (Server Settings → Integrations → Webhooks → New)
2. Copy the webhook URL
3. Go to **Settings → Discord Webhook**
4. Paste the webhook URL
5. Click **Save**

✅ You'll receive a Discord message after each merge with:
- Filename
- Channels included
- Programs included
- File size
- Peak memory usage
- Duration

---

## 🌐 Accessing the Application

| Component | URL |
|-----------|-----|
| **Web Interface** | http://your-server-ip |
| **API Health** | http://your-server-ip:9193/api/health |
| **API Docs** | http://your-server-ip:9193/docs |

---

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Backend** | FastAPI | 0.115.5 |
| **Frontend** | React | 18.2 |
| **Database** | SQLite | 3.x |
| **Container** | Docker | Latest |
| **Memory Tracking** | psutil | 5.8.0+ |

---

## 📚 Documentation

For detailed information, see:

- 📘 **[Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md)** - Complete setup and troubleshooting
- ⚡ **[Quick Start Card](docs/DOCKER_QUICKSTART.md)** - One-page reference
- 🏗️ **[Architecture](docs/ARCHITECTURE.md)** - System design
- 📦 **[API Specification](docs/API-SPEC.md)** - REST endpoints
- 💾 **[Local Development](docs/DEVELOPMENT.md)** - For developers

---

## 🙏 Credits & Inspiration

EPG Merge builds on the excellent work of:

### 📺 Data Source
- **[jesmann.com](https://share.jesmann.com/)** - Provides the XMLTV EPG data feeds that power EPG Merge. Without this data source, this project wouldn't exist. Thank you!

---

## 🐛 Troubleshooting

### Can't access the web interface?
```bash
# Check if services are running
docker compose ps

# View logs
docker compose logs backend

# Test API directly
curl http://your-ip:9193/api/health
```

### Merge not starting?
1. Did you save sources? (Go to **Sources** page)
2. Did you save channels? (Go to **Channels** page)
3. Try a manual merge first (Go to **Merge** page)

### Scheduled merge not running?
1. Check **Dashboard** for next scheduled time
2. Verify settings in **Settings** page
3. View scheduler logs: `docker compose logs backend | grep scheduler`

For more help, see [DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md#troubleshooting)

---

## 📋 Common Commands

```bash
# Check status
docker compose ps

# View logs
docker compose logs -f backend

# Restart
docker compose restart

# Stop
docker compose down

# Update
git pull && docker compose build --no-cache && docker compose up -d
```

---

## 📁 File Structure

```
epg-merge-app/
├── data/                    # Your EPG files (BACKUP THIS!)
│   ├── tmp/                # Temporary merges
│   ├── current/            # Your live EPG file
│   └── archives/           # Previous versions
├── config/                  # Settings database (BACKUP THIS!)
│   └── app.db
├── frontend/               # React web interface
├── backend/                # FastAPI API server
├── docker-compose.yml      # Docker configuration
└── docs/                   # Documentation
```

---

## ⚠️ Important Notes

- **Backup regularly:** Keep copies of `data/` and `config/` directories
- **Disk space:** Monitor `/data/` folder size (especially if keeping many archives)
- **Firewall:** Ensure port 80 (web) and 9193 (API) are accessible

---

## 🔗 Links

- **Repository:** https://github.com/di5cord20/epg-merge
- **EPG Data Source:** https://share.jesmann.com/

---

## 📄 License

MIT License - See **[LICENSE](LICENSE)** file for details

---

**Version:** 0.4.9 | **Last Updated:** November 26, 2025