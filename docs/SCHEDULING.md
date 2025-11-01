# Job Scheduling Guide

Configure automated merge jobs to run on a schedule.

---

## Overview

EPG Merge includes complete job scheduling infrastructure. Merges can be configured to run automatically at specified times (daily or weekly).

**Current Status:**
- ✅ Infrastructure complete and fully tested
- ✅ Database schema ready
- ✅ API endpoints working
- ✅ Cron expression generation ready
- 🔄 Scheduled execution not yet active in production (infrastructure ready to enable)

---

## Configuration

### Where to Configure

Settings are managed through the Settings UI (Settings → Schedule panel) or via API.

### Settings Keys

```json
{
  "merge_schedule": "daily",              // "daily" or "weekly"
  "merge_time": "02:30",                  // UTC time HH:MM
  "merge_days": [1, 3, 5],                // Weekdays (0=Sun, 6=Sat), weekly only
  "archive_retention_cleanup_expired": true  // Auto-cleanup old archives
}
```

---

## Examples

### Daily Merge at 2:30 AM UTC

**Settings:**
```json
{
  "merge_schedule": "daily",
  "merge_time": "02:30"
}
```

**Cron Expression:** `30 2 * * *` (runs every day at 02:30 UTC)

**UI Steps:**
1. Go to Settings → Schedule
2. Set "Schedule" to "Daily"
3. Set "Time" to "02:30"
4. Click "Save"

### Weekly Merge (Mon, Wed, Fri at 3:00 AM UTC)

**Settings:**
```json
{
  "merge_schedule": "weekly",
  "merge_time": "03:00",
  "merge_days": [1, 3, 5]
}
```

**Cron Expression:** `0 3 * * 1,3,5` (Mondays, Wednesdays, Fridays at 03:00 UTC)

**UI Steps:**
1. Go to Settings → Schedule
2. Set "Schedule" to "Weekly"
3. Set "Time" to "03:00"
4. Check: Monday, Wednesday, Friday
5. Click "Save"

### Weekends Only at Midnight

**Settings:**
```json
{
  "merge_schedule": "weekly",
  "merge_time": "00:00",
  "merge_days": [0, 6]
}
```

**Cron Expression:** `0 0 * * 0,6` (Saturdays and Sundays at 00:00 UTC)

---

## API Usage

### Check Schedule Status

```bash
curl http://localhost:9193/api/jobs/status
```

Response includes next scheduled run time:

```json
{
  "is_running": false,
  "next_scheduled_run": "2025-11-02T02:30:00Z",
  "schedule_cron": "30 2 * * *",
  "latest_job": {
    "job_id": "merge_20251101_143000",
    "status": "success",
    "started_at": "2025-11-01T14:30:00Z",
    "completed_at": "2025-11-01T14:35:42Z",
    "execution_time_seconds": 342,
    "channels_included": 145,
    "programs_included": 8234
  }
}
```

### View Job History

```bash
curl http://localhost:9193/api/jobs/history?limit=10
```

Shows all recent jobs (scheduled and manual):

```json
{
  "jobs": [
    {
      "job_id": "merge_20251101_143000",
      "status": "success",
      "started_at": "2025-11-01T14:30:00Z",
      "completed_at": "2025-11-01T14:35:42Z",
      "execution_time_seconds": 342,
      "channels_included": 145,
      "programs_included": 8234,
      "file_size": "5.2 MB"
    }
  ],
  "total": 47
}
```

### Get Latest Job

```bash
curl http://localhost:9193/api/jobs/latest
```

### Manually Trigger a Job

```bash
curl -X POST http://localhost:9193/api/jobs/execute
```

This runs a merge immediately regardless of schedule.

### Cancel Running Job

```bash
curl -X POST http://localhost:9193/api/jobs/cancel
```

---

## Database Schema

Jobs are tracked in the `job_history` table:

```sql
CREATE TABLE job_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT UNIQUE NOT NULL,          -- merge_YYYYMMDD_HHMMSS
  status TEXT NOT NULL,                 -- pending|running|success|failed
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  merge_filename TEXT,                  -- e.g., merged.xml.gz
  channels_included INTEGER,
  programs_included INTEGER,
  file_size TEXT,                       -- e.g., "5.2 MB"
  error_message TEXT,                   -- If status=failed
  execution_time_seconds REAL
);
```

### Query Examples

```bash
# Connect to database
sqlite3 /config/app.db

# View all jobs
SELECT job_id, status, started_at, execution_time_seconds FROM job_history;

# View failed jobs
SELECT job_id, error_message FROM job_history WHERE status = 'failed';

# Count successful jobs
SELECT COUNT(*) FROM job_history WHERE status = 'success';
```

---

## Notifications

### Discord Notifications

When a scheduled job completes, optionally send a notification to Discord.

**Setup:**

1. Create Discord server webhook:
   - Server Settings → Integrations → Webhooks
   - Copy webhook URL

2. Save to EPG Merge settings:
   - Settings → Schedule → Discord Webhook
   - Paste URL
   - Click "Save"

3. (Optional) Test notification:
   - Run a manual merge: `POST /api/jobs/execute`
   - Check Discord channel for notification

**Webhook URL Format:**
```
https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
```

**Notification Example:**

```
📊 Merge Complete - Success

Job ID: merge_20251101_143000
Time: 5m 42s
Channels: 145
Programs: 8,234
File Size: 5.2 MB
Status: ✅ Success
```

---

## Advanced Configuration

### Cron Expression Reference

Cron syntax: `minute hour day month dayofweek`

| Field | Range | Examples |
|-------|-------|----------|
| minute | 0-59 | 0 (every hour), 30 (at :30) |
| hour | 0-23 | 2 (2 AM), 14 (2 PM) |
| day | 1-31 | * (every day), 15 (15th) |
| month | 1-12 | * (every month), 1 (January) |
| dayofweek | 0-6 | 1 (Monday), 0,6 (weekends) |

**Examples:**
- `30 2 * * *` = Every day at 02:30
- `0 3 * * 1,3,5` = Mon/Wed/Fri at 03:00
- `0 0 * * 0,6` = Weekends at midnight
- `*/15 * * * *` = Every 15 minutes
- `0 9 * * 1-5` = Weekdays at 9 AM

---

## Monitoring

### View Current Jobs

```bash
ps aux | grep epg-merge
```

### Check Service Status

```bash
systemctl status epg-merge
```

### Monitor Logs

**Live logs:**
```bash
journalctl -u epg-merge -f
```

**Recent logs:**
```bash
journalctl -u epg-merge -n 50 --no-pager
```

**Search for merge jobs:**
```bash
journalctl -u epg-merge | grep "Job execution"
```

### Verify Execution

After job completion, check:

```bash
# Get latest job result
curl http://localhost:9193/api/jobs/latest | jq

# Check if new archive was created
curl http://localhost:9193/api/archives/list | jq '.data.archives | .[0]'

# Verify merged file exists
ls -lh /config/app.db
```

---

## Troubleshooting

### Jobs Not Running?

**Check schedule status:**
```bash
curl http://localhost:9193/api/jobs/status | jq
```

**Verify settings:**
```bash
curl http://localhost:9193/api/settings/get | jq '.data | {merge_schedule, merge_time, merge_days}'
```

**Check service is running:**
```bash
systemctl status epg-merge
```

**View logs for errors:**
```bash
journalctl -u epg-merge -n 50 --no-pager | grep -i error
```

### Job Timeout?

**Increase timeout in settings:**
```bash
curl -X POST http://localhost:9193/api/settings/set \
  -H "Content-Type: application/json" \
  -d '{"merge_timeout": 900}'
```

Valid range: 30-1800 seconds (30 seconds to 30 minutes)

### Discord Notification Not Sent?

**Verify webhook is configured:**
```bash
curl http://localhost:9193/api/settings/get | jq '.data.discord_webhook'
```

**Test with manual job:**
```bash
curl -X POST http://localhost:9193/api/jobs/execute
```

**Check logs for webhook errors:**
```bash
journalctl -u epg-merge | grep -i discord
```

### Job History Grows Too Large?

Archive cleanup is automatic if enabled in settings:

```bash
curl http://localhost:9193/api/settings/get | jq '.data.archive_retention_cleanup_expired'
```

Enable if disabled:

```bash
curl -X POST http://localhost:9193/api/settings/set \
  -H "Content-Type: application/json" \
  -d '{"archive_retention_cleanup_expired": true}'
```

---

## Enabling Scheduled Execution (When Ready)

The infrastructure is 100% complete and ready. To enable scheduled execution when appropriate:

1. Edit `backend/services/job_service.py`
2. Uncomment scheduler initialization
3. Restart service: `systemctl restart epg-merge`
4. Verify in logs: `journalctl -u epg-merge -f`

See [ARCHITECTURE.md](ARCHITECTURE.md) for code details.

---

## Best Practices

✅ **DO:**
- Use UTC timezone (what times are displayed in)
- Test schedule with a near-future time first
- Monitor first run to ensure it works
- Set up Discord notifications for visibility
- Review job history monthly

❌ **DON'T:**
- Schedule overlapping jobs (system prevents this)
- Set extreme timeout values (keep reasonable)
- Ignore failed jobs (check logs)
- Rely on scheduling without testing manually first

---

## Common Schedules

### Once Daily (Night)
```json
{"merge_schedule": "daily", "merge_time": "02:00"}
```

### Twice Daily (Morning & Evening)
Not supported directly. Use two separate instances or manual triggers.

### Business Hours (Weekdays 9-5)
```json
{
  "merge_schedule": "weekly",
  "merge_time": "09:00",
  "merge_days": [1, 2, 3, 4, 5]
}
```

### Weekly Sunday Afternoon
```json
{
  "merge_schedule": "weekly",
  "merge_time": "14:00",
  "merge_days": [0]
}
```

---

## Related Documentation

- [API Specification](API-SPEC.md) - Detailed endpoint documentation
- [Maintenance](MAINTENANCE.md) - Monitoring and backups
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues
- [Architecture](ARCHITECTURE.md) - System design and job service details

---

**Questions?** Check [Troubleshooting](TROUBLESHOOTING.md) or see [API-SPEC.md](API-SPEC.md) for endpoint details.