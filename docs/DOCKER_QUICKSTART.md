# EPG Merge Docker - Quick Start Card

Print this and keep it handy!

---

## 🚀 Installation (5 minutes)

```bash
# 1. Clone
cd /opt && git clone https://github.com/di5cord20/epg-merge.git epg-merge-app
cd epg-merge-app

# 2. Create directories
mkdir -p ./data/{tmp,current,archives} ./config

# 3. Start
docker compose up -d && sleep 30

# 4. Access
# Open: http://your-ip
# API: http://your-ip:9193/api/health
```

---

## ⚙️ First-Time Setup (5 minutes)

1. **Sources:** Select timeframe, feed type, files → Save
2. **Channels:** Load from sources, select channels → Save  
3. **Settings:** Set schedule time, days, optional Discord → Save
4. **Done!** Merges run automatically

---

## 📊 Daily Use

| Task | Where | How |
|------|-------|-----|
| View jobs | Dashboard | See status, history, memory |
| Manual merge | Merge page | Click "Start Merge" |
| Download | Merge/Archives | Click "Download" |
| Change schedule | Settings | Update time/days |
| View notifications | Discord | Auto-sent after each merge |

---

## 🔧 Common Commands

```bash
# Status
docker compose ps

# Logs
docker compose logs -f backend

# Restart
docker compose restart

# Stop
docker compose down

# Update
git pull && docker compose build --no-cache && docker compose up -d

# Backup
tar -czf backup.tar.gz data/ config/
```

---

## ⚠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| Can't access web UI | Check: `docker compose ps` (should be `healthy`) |
| Merge won't start | Did you select sources AND channels? |
| Scheduler not running | Check: `docker compose logs backend \| grep scheduler` |
| Out of disk | Run: `docker system prune -a` |
| Wrong timezone | Set `TZ=Your/Timezone` in docker-compose.yml |

---

## 📁 Important Paths

```
data/          ← Your files (BACK THIS UP!)
  tmp/         ← Temporary merges
  current/     ← Live file
  archives/    ← Backups

config/        ← Settings database (BACK THIS UP!)
  app.db       ← All your settings
```

---

## 🆘 Help

**Logs:** `docker compose logs backend | tail -50`  
**API Health:** `curl http://your-ip:9193/api/health`  
**GitHub:** https://github.com/di5cord20/epg-merge/issues

---

**v0.4.7 • Production Ready • Last Updated: Nov 2, 2025**