# Quick Start - Local Development

Get EPG Merge running locally in 5 minutes.

---

## Prerequisites (2 minutes)

Make sure you have:
- **Docker & Docker Compose** - [Install](https://docs.docker.com/compose/install/)
- **Git** - `git --version` should work
- **GitHub repo cloned** - `git clone https://github.com/di5cord20/epg-merge.git`

---

## Start Services (1 minute)

```bash
cd ~/github/epg-merge
sudo docker-compose build
sudo docker-compose up -d
```

Wait for containers to start (usually 30 seconds).

---

## Verify Running (1 minute)

Check services are up:

```bash
sudo docker-compose ps
```

Should show:
- `epg-merge-backend` - running
- `epg-merge-frontend` - running

Test API:

```bash
curl http://localhost:9193/api/health
```

Should return: `{"status":"ok","version":"0.4.3"}`

---

## First Use (1 minute)

Open browser: **http://localhost:9193**

You should see the EPG Merge interface. Now:

1. **Select Sources** (first tab)
   - Timeframe: Choose 3, 7, or 14 days
   - Feed Type: Choose IPTV or Gracenote
   - Click "Load Sources" to see available files

2. **Select Channels** (second tab)
   - Click "Load from Selected Sources"
   - Choose channels to include
   - Click "Save Selection"

3. **Run Merge** (third tab)
   - Click "Execute Merge"
   - Watch progress in real-time
   - Download merged XML when complete

---

## View Logs (while running)

In another terminal, see what's happening:

```bash
sudo docker-compose logs -f backend
```

Press `Ctrl+C` to stop viewing.

---

## Stop Services

```bash
sudo docker-compose down
```

---

## Next Steps

### For Development
See [Development Guide](DEVELOPMENT.md) for:
- How to run tests
- How to modify code
- Code style guidelines
- Adding new features

### To Understand the System
See [Architecture](ARCHITECTURE.md) for:
- System design overview
- Database schema
- API endpoints
- Component structure

### To Deploy
See [Deployment Guide](DEPLOYMENT.md) for:
- Production deployment
- Systemd setup
- Docker production builds

### Troubleshooting

**Service won't start?**
```bash
sudo docker-compose logs
```

See [Troubleshooting](TROUBLESHOOTING.md) for more.

**Frontend not loading?**
```bash
sudo docker-compose down -v
sudo docker-compose build --no-cache
sudo docker-compose up -d
```

**Database issue?**
```bash
# Reset database (will recreate on start)
rm config/app.db
sudo docker-compose restart backend
```

---

## Common Commands

```bash
# View all logs
sudo docker-compose logs -f

# View backend logs only
sudo docker-compose logs -f backend

# View frontend logs only
sudo docker-compose logs -f frontend

# Stop all services
sudo docker-compose down

# Stop and remove volumes (fresh start)
sudo docker-compose down -v

# Rebuild after code changes
sudo docker-compose build
sudo docker-compose up -d
```

---

**Stuck?** Check [Troubleshooting](TROUBLESHOOTING.md) or open an [GitHub issue](https://github.com/di5cord20/epg-merge/issues).

**Ready to code?** See [Development Guide](DEVELOPMENT.md) 🚀