# Scheduling Guide - EPG Merge v0.4.9

Configure automated merge jobs to run on a schedule using cron-based scheduling.

---

## Overview

EPG Merge v0.4.9 includes a **production-ready cron-based scheduler** that automatically executes merges on a configurable schedule.

**Current Status:**
- ✅ Fully implemented and tested
- ✅ Runs as background async task
- ✅ Auto-recovers from stuck jobs
- ✅ Timeout enforcement with hard-kill
- ✅ Peak memory tracking
- ✅ Discord notifications

---

## Quick Setup (5 minutes)

### 1. Select Sources & Channels
- Go to **Sources** page → Select timeframe, feed type, files → Save
- Go to **Channels** page → Load from sources → Select channels → Save

### 2. Configure Schedule
- Go to **Settings** → **Schedule** panel
- Set **Schedule Frequency** (Daily or Weekly)
- Set **Merge Time** (HH:MM format, UTC)
- If Weekly: Select **Merge Days**
- Set **EPG Timeframe** (3, 7, or 14 days)
- Select **Source Configuration** to use
- Select **Channels Version** to use
- Click **Save**

### 3. Monitor
- Go to **Dashboard** to see:
  - Job status (Running or Idle)
  - Next scheduled run time
  - Latest job details (memory, duration, channels, programs)
  - Job execution history

✅ **Done!** Merges now run automatically on your schedule.

---

## Configuration

### Settings Keys

All settings stored in SQLite database. Access via **Settings** page or API.

| Setting | Type | Default | Purpose |
|---------|------|---------|---------|
| `merge_schedule` | string | "daily" | "daily" or "weekly" |
| `merge_time` | string | "00:00" | HH:MM format (UTC) |
| `merge_days` | JSON array | "[0-6]" | Days 0=Sun...6=Sat (weekly only) |
| `merge_timeframe` | string | "3" | EPG timeframe: "3", "7", or "14" days |
| `merge_channels_version` | string | "current" | Which channels.json to use |
| `selected_sources` | JSON array | "[]" | Source files to merge |
| `merge_timeout` | int | 300 | Hard timeout in seconds |
| `discord_webhook` | string | "" | Discord webhook for notifications |

### Schedule Types

#### Daily
Merge runs every day at specified time:
```json
{
  "merge_schedule": "daily",
  "merge_time": "02:30"
}
```
**Cron:** `30 2 * * *`

#### Weekly
Merge runs on selected days at specified time:
```json
{
  "merge_schedule": "weekly",
  "merge_time": "14:00",
  "merge_days": ["1", "3", "5"]
}
```
**Cron:** `0 14 * * 1,3,5` (Monday, Wednesday, Friday at 2 PM)

---

## How It Works

### Scheduler Architecture

```
Application Startup
  ↓
Detect & recover stuck jobs (2+ hours threshold)
  ↓
SCHEDULER LOOP:
  1. Load settings (merge_schedule, merge_time, merge_days, selected_sources)
  2. Build cron expression
  3. Calculate next run time
  4. Sleep until scheduled time (check every 60s for setting changes)
  5. If settings changed → recalculate and loop
  6. If another job running → skip this execution
  7. EXECUTE MERGE with timeout enforcement
  8. Save job record to database
  9. Send Discord notification (if configured)
  10. Loop back to step 1
```

### Key Features

**Dynamic Recalculation:**
- Scheduler checks for setting changes every 60 seconds during sleep
- If merge_time or merge_schedule changes, scheduler immediately recalculates
- **No restart needed!** Changes take effect within 60 seconds

**Timeout Enforcement:**
- Merges exceeding `merge_timeout` (default 300s) are hard-killed
- Uses `asyncio.wait_for()` for enforcement
- Job marked as TIMEOUT status in history

**Memory Tracking:**
- Peak memory usage monitored during each merge
- Reported in MB via job history
- View in Dashboard → Latest Job Details

**Auto-Recovery:**
- On startup, detects jobs stuck in RUNNING state for 2+ hours
- Automatically recovers and marks as failed
- Scheduler can then resume normally

**Discord Notifications:**
- Success: 8 statistics (filename, channels, programs, size, memory, duration, days, timestamp)
- Failure: Error message and job ID
- Optional - set webhook URL in Settings → Notifications

---

## Examples

### Daily Merge at 2:30 AM UTC

**Settings:**
1. Go to **Settings** → **Schedule**
2. Set **Schedule Frequency** to "Daily"
3. Set **Merge Time** to "02:30"
4. Click **Save**

**Verification:**
```bash
curl http://localhost:9193/api/jobs/status
# Response includes: "next_scheduled_run": "2025-11-27T02:30:00"
```

### Weekly Merge (Mon, Wed, Fri at 3:00 PM UTC)

**Settings:**
1. Go to **Settings** → **Schedule**
2. Set **Schedule Frequency** to "Weekly"
3. Set **Merge Time** to "15:00"
4. Check: Monday, Wednesday, Friday
5. Click **Save**

**Cron:** `0 15 * * 1,3,5`

### Different Sources/Channels per Merge

**Setup:**
1. Save multiple source configurations: **Settings** → **Schedule** → Source Configuration dropdown
2. Save multiple channel versions: **Channels** page → Save multiple times
3. In **Settings** → **Schedule**, select which to use for scheduled merges
4. Different from UI selections (which only affect manual merges)

---

## Monitoring

### Dashboard (Easiest)

Go to **Dashboard** page to see:
- **Job Status** card - Running or Idle
- **Next Scheduled Run** card - When next merge will execute
- **Last Run** card - Results from most recent job
- **Latest Job Details** - Full statistics from last execution
- **Recent Job History** table - Last 10 jobs with sortable columns
- **Buttons** - Refresh, Clear History, Cancel Job

### API Endpoints

```bash
# Current status
curl http://localhost:9193/api/jobs/status

# Job history (last 50)
curl http://localhost:9193/api/jobs/history?limit=50

# Latest job
curl http://localhost:9193/api/jobs/latest

# Manual trigger (for testing)
curl -X POST http://localhost:9193/api/jobs/execute-now

# Cancel running job
curl -X POST http://localhost:9193/api/jobs/cancel

# Clear all job history
curl -X POST http://localhost:9193/api/jobs/clear-history
```

### Logs

```bash
# View scheduler logs
docker compose logs backend | grep -i scheduler

# Or via systemd
journalctl -u epg-merge | grep -i scheduler

# Follow in real-time
docker compose logs -f backend | grep -i scheduler
```

**Example output:**
```
🚀 SCHEDULER LOOP STARTED
📅 Cron expression: 30 14 * * *
⏱️ Next scheduled run: 2025-11-27 14:30:00 (89245s from now)
😴 Sleeping until scheduled time...
▶️ ===== EXECUTING SCHEDULED MERGE =====
✅ Merge completed in 45.2s
▶️ ===== MERGE COMPLETE: success =====
```

---

## Troubleshooting

### Issue: Scheduler shows "No sources configured"

**Cause:** `selected_sources` not saved to database

**Fix:**
1. Go to **Settings** → **Schedule**
2. Select a source configuration from dropdown
3. Click **Save**
4. Verify: 
   ```bash
   sqlite3 /config/app.db "SELECT value FROM settings WHERE key='selected_sources';"
   # Should return: '["source1.xml.gz", "source2.xml.gz"]'
   ```

### Issue: Scheduler recalculates but doesn't run at new time

**Cause:** Old sleep timer still active from previous calculation

**Fix:** Scheduler now checks every 60 seconds. If you changed `merge_time`:
- Scheduler will detect the change within 60 seconds
- Will break out of sleep loop
- Will recalculate
- Will resume sleeping until new time

**No restart needed!**

### Issue: Merge never starts

**Possible causes:**
1. No sources selected - Go to **Settings** → **Schedule**, select source configuration
2. No channels selected - Go to **Channels** page, select and save channels
3. Job already running - Wait for it to finish, or click **Cancel Job** on Dashboard
4. Time hasn't arrived - Check Dashboard for next scheduled time

### Issue: "Cannot read properties of undefined" error

**Cause:** Missing null checks in component before array operations

**Fix:** Always use defensive coding:
```javascript
// CORRECT
{Array.isArray(data) && data.length > 0 && data.map(item => ...)}

// CORRECT - Optional chaining
{version?.sources?.length || 0}

// WRONG - Will crash if data is undefined
{data.map(...)}
```

### Issue: Health check times out during merge

**Cause:** Merges are CPU/IO intensive and can temporarily block API

**Fix:** Increase healthcheck timeout in docker-compose.yml:
```yaml
healthcheck:
  timeout: 35s  # Increase from default 10s
```

---

## Discord Setup

### Create Webhook

1. Open Discord server
2. Go to **Server Settings** → **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Copy webhook URL

### Configure EPG Merge

1. Go to **Settings** → **Notifications**
2. Paste webhook URL in **Discord Webhook** field
3. Click **Save**

### Test Notification

1. Go to **Dashboard**
2. Click **Refresh** button
3. Or run manual merge: **Merge** page → **Start Merge**
4. Check Discord channel for notification

### Notification Format

**Success:**
```
✅ Scheduled Merge Completed

📋 Filename: merged.xml.gz
📅 Created: 2025-11-26 14:30:15
📦 Size: 45.2 MB
🎬 Channels: 250
📺 Programs: 15000
📆 Days: 3
🧠 Memory: 256.50 MB
⏱️ Duration: 45.23s
```

**Failure:**
```
❌ Scheduled Merge Failed

Error: Merge exceeded timeout limit of 300 seconds
Job ID: scheduled_merge_20251126_143015
```

---

## Performance Tuning

### For Large Merges

If merges are timing out:

1. **Increase merge_timeout:**
   - Go to **Settings** (or add custom setting)
   - Increase to 600+ seconds
   - Click **Save**

2. **Reduce EPG timeframe:**
   - **Settings** → **Schedule** → **EPG Timeframe**
   - Use 3 days instead of 7/14
   - Fewer days = faster merge

3. **Reduce channels:**
   - **Channels** page
   - Select fewer channels
   - Click **Save Channels**

4. **Monitor memory:**
   - **Dashboard** → **Latest Job Details** → **Memory**
   - If using all available RAM, reduce timeframe or channels

### For Faster Merges

1. Schedule during off-peak hours (e.g., 3 AM)
2. Use smaller timeframe (3 days vs 14)
3. Select only needed channels
4. Ensure sufficient disk space (merges need temp space)

---

## Common Schedules

**Once Daily (Night):**
```
Schedule: Daily
Time: 02:00 UTC
```

**Business Hours (Weekdays 9-5):**
```
Schedule: Weekly
Time: 09:00 UTC
Days: Monday-Friday
```

**Weekly Sunday Afternoon:**
```
Schedule: Weekly
Time: 14:00 UTC
Days: Sunday
```

**Twice Daily:**
Not directly supported. Options:
- Run two instances of EPG Merge
- Use external scheduler (cron) to trigger manual merge via API

---

## FAQ

**Q: What timezone is used?**
A: UTC by default. Set `TZ` environment variable in docker-compose.yml to change.

**Q: Can I change the schedule without restarting?**
A: Yes! Scheduler detects changes within 60 seconds and recalculates.

**Q: What happens if a merge takes longer than the next scheduled time?**
A: Scheduler skips that run. Resumes on following scheduled time.

**Q: Can I use different channels for different schedules?**
A: Yes! Save multiple channel versions, select which to use in Settings.

**Q: Are Discord notifications required?**
A: No, completely optional. Leave webhook URL blank to disable.

**Q: How long does a merge take?**
A: Depends on timeframe and channels. Typically:
- 3 days: 30-40s
- 7 days: 50-70s
- 14 days: 80-120s

**Q: Can I manually run a merge outside schedule?**
A: Yes! Go to **Merge** page → **Start Merge**, or click **Execute** on Dashboard.

---

## Related Documentation

- [Dashboard Monitoring](README.md) - How to use Dashboard page
- [API Reference](API-SPEC.md) - Job endpoints documentation
- [Deployment](DEPLOYMENT.md) - Scheduler deployment considerations
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

---

**Last Updated:** November 26, 2025 (v0.4.9 - Full Implementation)