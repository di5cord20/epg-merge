# API Specification v0.4.3

Complete REST API documentation for EPG Merge.

**Base URL:** `http://localhost:9193/api`  
**Content-Type:** `application/json`  
**Version:** 0.4.3

---

## Response Format

All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "version": "0.4.3"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Description of what went wrong",
  "code": "ERROR_CODE",
  "version": "0.4.3"
}
```

---

## Endpoints

### Health & Status

#### GET /api/health
Check service health.

**Example:**
```bash
curl http://localhost:9193/api/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "0.4.3",
  "uptime_seconds": 3600
}
```

#### GET /api/status
Get current application status.

**Response:**
```json
{
  "status": "idle",
  "merge_running": false,
  "last_merge": "2025-11-01T14:30:00Z",
  "version": "0.4.3"
}
```

---

### Sources Management

#### GET /api/sources/list
Get available sources from share.jesmann.com.

**Query Parameters:**
- `timeframe` (int): 3, 7, or 14 days
- `feed_type` (string): "iptv" or "gracenote"

**Example:**
```bash
curl "http://localhost:9193/api/sources/list?timeframe=7&feed_type=iptv"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sources": [
      {
        "filename": "iptv_7d_region1.xml.gz",
        "size_bytes": 2048576,
        "last_modified": "2025-11-01T12:00:00Z"
      }
    ],
    "count": 5
  }
}
```

#### POST /api/sources/select
Save selected sources.

**Request Body:**
```json
{
  "sources": ["iptv_7d_region1.xml.gz", "iptv_7d_region2.xml.gz"],
  "timeframe": 7,
  "feed_type": "iptv"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "selected_count": 2,
    "saved_at": "2025-11-01T14:30:00Z"
  }
}
```

---

### Channels Management

#### GET /api/channels/from-sources
Load channels from selected sources.

**Query Parameters:**
- `sources` (string): Comma-separated filenames

**Example:**
```bash
curl "http://localhost:9193/api/channels/from-sources?sources=file1.xml.gz,file2.xml.gz"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "id": "bbc1.uk",
        "name": "BBC One"
      },
      {
        "id": "itv.uk",
        "name": "ITV"
      }
    ],
    "total": 847
  }
}
```

#### GET /api/channels/selected
Get currently selected channels.

**Response:**
```json
{
  "success": true,
  "data": {
    "channels": ["bbc1.uk", "itv.uk"],
    "count": 2
  }
}
```

#### POST /api/channels/select
Save channel selection.

**Request Body:**
```json
{
  "channels": ["bbc1.uk", "itv.uk", "channel4.uk"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "saved_count": 3
  }
}
```

#### POST /api/channels/export
Export selected channels as JSON file.

**Response:** Downloads `channels_backup.json`

```json
{
  "channels": ["bbc1.uk", "itv.uk"],
  "exported_at": "2025-11-01T14:30:00Z",
  "count": 2
}
```

#### POST /api/channels/import
Import channels from backup file.

**Request:** Multipart form data with `file` field containing JSON

**Response:**
```json
{
  "success": true,
  "data": {
    "imported_count": 2
  }
}
```

---

### Merge Operations

#### POST /api/merge/execute
Execute a merge operation.

**Request Body:**
```json
{
  "timeout_seconds": 300
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "merge_20251101_143000",
    "status": "running",
    "started_at": "2025-11-01T14:30:00Z"
  }
}
```

#### GET /api/merge/current
Get current merged file info.

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "merged.xml.gz",
    "size_bytes": 5242880,
    "created_at": "2025-11-01T14:30:00Z",
    "channels": 145,
    "programs": 8234
  }
}
```

#### POST /api/merge/save
Save temporary merge as current (archive previous).

**Request Body:**
```json
{
  "temp_filename": "merged_20251101_143000.xml.gz"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "saved_as": "merged.xml.gz",
    "previous_archived": "merged.xml.gz.20251101_120000"
  }
}
```

---

### Archives Management

#### GET /api/archives/list
List all archives and current file.

**Query Parameters:**
- `limit` (int, optional): Max results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "archives": [
      {
        "filename": "merged.xml.gz",
        "is_current": true,
        "created_at": "2025-11-01T14:30:00Z",
        "size_bytes": 5242880,
        "channels": 145,
        "programs": 8234,
        "days_included": 7,
        "days_left": 5
      },
      {
        "filename": "merged.xml.gz.20251101_120000",
        "is_current": false,
        "created_at": "2025-11-01T12:00:00Z",
        "size_bytes": 5120000,
        "channels": 143,
        "programs": 8100,
        "days_included": 7,
        "days_left": 4
      }
    ],
    "total": 12
  }
}
```

#### GET /api/archives/download/{filename}
Download an archive file.

**Example:**
```bash
curl -O http://localhost:9193/api/archives/download/merged.xml.gz
```

**Response:** Binary gzip file

#### DELETE /api/archives/delete/{filename}
Delete an archive (cannot delete current).

**Example:**
```bash
curl -X DELETE http://localhost:9193/api/archives/delete/merged.xml.gz.20251101_120000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted": "merged.xml.gz.20251101_120000"
  }
}
```

#### POST /api/archives/cleanup
Manually trigger archive cleanup based on retention policy.

**Response:**
```json
{
  "success": true,
  "data": {
    "deleted_count": 3,
    "freed_bytes": 15728640
  }
}
```

---

### Settings

#### GET /api/settings/get
Get all settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "output_filename": "merged.xml.gz",
    "merge_schedule": "daily",
    "merge_time": "02:30",
    "merge_days": [1, 3, 5],
    "download_timeout": 300,
    "merge_timeout": 600,
    "channel_drop_threshold": "50%",
    "archive_retention_cleanup_expired": true,
    "discord_webhook": ""
  }
}
```

#### POST /api/settings/set
Update settings.

**Request Body:**
```json
{
  "merge_time": "03:00",
  "merge_timeout": 900
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_keys": ["merge_time", "merge_timeout"],
    "saved_at": "2025-11-01T14:30:00Z"
  }
}
```

---

### Jobs - Scheduled Merge Execution (v0.4.7)

#### GET /api/jobs/status
Get current job status and next scheduled run

**Response:**
```json
{
  "is_running": false,
  "latest_job": {
    "job_id": "scheduled_merge_20251102_104307",
    "status": "success",
    "started_at": "2025-11-02T10:43:07.016871",
    "completed_at": "2025-11-02T10:43:19.798953",
    "channels_included": 5,
    "programs_included": 519,
    "file_size": "0.04MB",
    "peak_memory_mb": 82.27,
    "days_included": 3,
    "execution_time_seconds": 12.78,
    "error_message": null
  },
  "next_scheduled_run": "2025-11-03T12:00:00"
}
```

#### GET /api/jobs/history
Get job execution history

**Query Parameters:**
- `limit` (optional, default: 50) - Maximum records to return

**Response:**
```json
{
  "jobs": [
    {
      "job_id": "scheduled_merge_20251102_104307",
      "status": "success",
      "started_at": "2025-11-02T10:43:07.016871",
      "completed_at": "2025-11-02T10:43:19.798953",
      "channels_included": 5,
      "programs_included": 519,
      "file_size": "0.04MB",
      "peak_memory_mb": 82.27,
      "days_included": 3,
      "execution_time_seconds": 12.78,
      "error_message": null
    }
  ],
  "count": 1
}
```

#### GET /api/jobs/latest
Get most recent job record

**Response:**
```json
{
  "job": {
    "job_id": "scheduled_merge_20251102_104307",
    "status": "success",
    ...
  }
}
```

#### POST /api/jobs/execute-now (NEW v0.4.7)
Manually trigger merge execution (for testing purposes)

**No parameters required**

**Response:**
```json
{
  "status": "success",
  "job_id": "scheduled_merge_20251102_104307",
  "filename": "merged.xml.gz",
  "created_at": "2025-11-02T10:43:19.798953",
  "channels": 5,
  "programs": 519,
  "file_size": "0.04MB",
  "days_included": 3,
  "peak_memory_mb": 82.27,
  "execution_time": 12.78
}
```

#### POST /api/jobs/clear-history (NEW v0.4.7)
Delete ALL job history records (irreversible)

**No parameters required**

**Response:**
```json
{
  "status": "cleared",
  "deleted_count": 12,
  "message": "Deleted 12 job history records"
}
```

#### POST /api/jobs/cancel
Cancel currently running job

**Response:**
```json
{
  "status": "cancelled",
  "message": "Job cancellation requested"
}
```

---

## Validation Rules

### Timeframes
- Valid values: 3, 7, 14 days
- Default: 7

### Feed Types
- Valid values: "iptv", "gracenote"

### Filenames
- Must end with .xml or .xml.gz
- Max 255 characters

### Timeouts
- Download: 10-600 seconds (default: 300)
- Merge: 30-1800 seconds (default: 600)

### Channel Drop Threshold
- Format: "0%-100%" or empty string (disabled)
- Example: "50%" means drop channels with <50% program coverage

### Discord Webhook
- Optional
- Must match Discord webhook URL pattern if provided
- Format: `https://discord.com/api/webhooks/{id}/{token}`

### Schedule Configuration
- `merge_schedule`: "daily" or "weekly"
- `merge_time`: "HH:MM" format (UTC)
- `merge_days`: Array of 0-6 (0=Sunday, 6=Saturday, weekly only)

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `INVALID_PARAM` | 400 | Invalid parameter value |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `TIMEOUT` | 504 | Operation timed out |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

Currently no rate limiting. Future versions may implement limits.

---

## Authentication

Currently no authentication. Future versions may add API key or token auth.

---

## Examples

### Complete Workflow

```bash
# 1. Get available sources
curl "http://localhost:9193/api/sources/list?timeframe=7&feed_type=iptv"

# 2. Select sources
curl -X POST http://localhost:9193/api/sources/select \
  -H "Content-Type: application/json" \
  -d '{"sources":["file1.xml.gz","file2.xml.gz"],"timeframe":7,"feed_type":"iptv"}'

# 3. Load channels from sources
curl "http://localhost:9193/api/channels/from-sources?sources=file1.xml.gz,file2.xml.gz"

# 4. Select channels
curl -X POST http://localhost:9193/api/channels/select \
  -H "Content-Type: application/json" \
  -d '{"channels":["bbc1.uk","itv.uk"]}'

# 5. Execute merge
curl -X POST http://localhost:9193/api/merge/execute \
  -H "Content-Type: application/json" \
  -d '{"timeout_seconds":600}'

# 6. Check job status
curl http://localhost:9193/api/jobs/latest

# 7. Download result
curl -O http://localhost:9193/api/archives/download/merged.xml.gz
```

---

**Need help?** See [Troubleshooting](TROUBLESHOOTING.md) or check [Architecture](ARCHITECTURE.md) for system details.