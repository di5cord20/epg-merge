# API Specification v0.5.0

Complete REST API documentation for EPG Merge.

**Base URL:** `http://localhost:9193/api`  
**Content-Type:** `application/json`  
**Version:** 0.5.0

---

## Response Format

All responses follow this structure:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "version": "0.5.0"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Description of what went wrong",
  "code": "ERROR_CODE",
  "version": "0.5.0"
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
  "version": "0.5.0",
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
  "version": "0.5.0"
}
```

---

### Sources Management (Updated v0.5.0)

#### GET /api/sources/list
Get available sources from share.jesmann.com.

**Query Parameters:**
- `timeframe` (string): "3", "7", or "14" days (default: "3")
- `feed_type` (string): "iptv" or "gracenote" (default: "iptv")

**Example:**
```bash
curl "http://localhost:9193/api/sources/list?timeframe=7&feed_type=iptv"
```

**Response: 200 OK**
```json
{
  "sources": ["country1.xml.gz", "country2.xml.gz", ...]
}
```

**Error: 500 Internal Server Error**
```json
{
  "detail": "Failed to fetch sources"
}
```

#### POST /api/sources/save (Updated v0.5.0)
Save selected sources with optional custom filename.

**Request Body:**
```json
{
  "sources": ["us.xml.gz", "uk.xml.gz"],
  "timeframe": "3",
  "feed_type": "iptv",
  "filename": "us-sources"
}
```

**Parameters:**
- `sources` (array, required): List of source filenames
- `timeframe` (string, required): "3", "7", or "14"
- `feed_type` (string, required): "iptv" or "gracenote"
- `filename` (string, optional): Custom filename (without .json extension, auto-added)

**Response: 200 OK**
```json
{
  "status": "success",
  "filename": "us-sources.json",
  "sources": 2,
  "timeframe": "3",
  "feed_type": "iptv",
  "archived": true
}
```

**Error: 500 Internal Server Error**
```json
{
  "detail": "Failed to save sources"
}
```

**Notes:**
- If `filename` not provided, uses configured default (`sources_filename` setting)
- Previous version auto-archived with timestamp: `sources.json.20251126_143022`
- Metadata saved to `source_versions` table

#### GET /api/sources/versions (NEW v0.5.0)
Get all source versions (current and archived).

**Response: 200 OK**
```json
{
  "versions": [
    {
      "filename": "sources.json",
      "is_current": true,
      "created_at": "2025-11-26T23:30:00.000000",
      "size_bytes": 145,
      "sources_count": 3,
      "sources": ["us.xml.gz", "uk.xml.gz", "ca.xml.gz"]
    },
    {
      "filename": "sources.json.20251126_223015",
      "is_current": false,
      "created_at": "2025-11-26T22:30:15.000000",
      "size_bytes": 132,
      "sources_count": 2,
      "sources": ["us.xml.gz", "uk.xml.gz"]
    }
  ]
}
```

**Error: 500 Internal Server Error**
```json
{
  "detail": "Failed to get source versions"
}
```

#### POST /api/sources/load-from-disk (NEW v0.5.0)
Load sources from a saved version file on disk.

**Request Body:**
```json
{
  "filename": "sources.json.20251126_223015"
}
```

**Parameters:**
- `filename` (string, required): Exact filename to load

**Response: 200 OK**
```json
{
  "status": "success",
  "filename": "sources.json.20251126_223015",
  "sources": ["us.xml.gz", "uk.xml.gz"],
  "count": 2,
  "timeframe": "3",
  "feed_type": "iptv",
  "loaded_at": "2025-11-26T23:35:00.000000"
}
```

**Error: 404 Not Found**
```json
{
  "detail": "Source file not found: sources.json.20251126_223015"
}
```

**Error: 400 Bad Request**
```json
{
  "detail": "Invalid source file: Invalid JSON in sources.json.20251126_223015"
}
```

**Error: 500 Internal Server Error**
```json
{
  "detail": "Failed to load sources from disk"
}
```

---

### Channels Management (Updated v0.5.0)

#### GET /api/channels/from-sources
Load channels from selected sources.

**Query Parameters:**
- `sources` (string): Comma-separated filenames

**Example:**
```bash
curl "http://localhost:9193/api/channels/from-sources?sources=file1.xml.gz,file2.xml.gz"
```

**Response: 200 OK**
```json
{
  "channels": ["bbc1.uk", "itv.uk", "channel4.uk", ...]
}
```

#### GET /api/channels/selected
Get currently selected channels.

**Response: 200 OK**
```json
{
  "channels": ["bbc1.uk", "itv.uk"]
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

**Response: 200 OK**
```json
{
  "status": "saved",
  "count": 3
}
```

#### POST /api/channels/export
Export selected channels as JSON file download.

**Response:** File download with `Content-Disposition: attachment`

**File contents:**
```json
{
  "exported_at": "2025-11-01T14:30:00Z",
  "channel_count": 3,
  "channels": ["bbc1.uk", "itv.uk", "channel4.uk"]
}
```

#### POST /api/channels/import
Import channels from backup file.

**Request:** Multipart form data with `file` field containing JSON

**Response: 200 OK**
```json
{
  "status": "success",
  "count": 3
}
```

#### POST /api/channels/save (Updated v0.5.0)
Save selected channels with versioning and optional custom filename.

**Request Body:**
```json
{
  "channels": ["bbc1.uk", "itv.uk"],
  "sources_count": 2,
  "filename": "premium-channels"
}
```

**Parameters:**
- `channels` (array, required): List of channel IDs
- `sources_count` (integer, optional): Number of sources used (for metadata)
- `filename` (string, optional): Custom filename (without .json extension, auto-added)

**Response: 200 OK**
```json
{
  "status": "success",
  "filename": "premium-channels.json",
  "channels": 2,
  "sources": 2,
  "archived": true
}
```

**Error: 500 Internal Server Error**
```json
{
  "detail": "Failed to save channels"
}
```

**Notes:**
- If `filename` not provided, uses configured default (`channels_filename` setting)
- Previous version auto-archived with timestamp: `channels.json.20251122_162638`
- Metadata saved to `channel_versions` table

#### GET /api/channels/versions
Get all channel versions (current and archived).

**Response: 200 OK**
```json
{
  "versions": [
    {
      "filename": "channels.json",
      "is_current": true,
      "created_at": "2025-11-23T14:30:00Z",
      "sources_count": 2,
      "channels_count": 150,
      "size_bytes": 2048
    },
    {
      "filename": "premium-channels.json",
      "is_current": false,
      "created_at": "2025-11-23T10:15:00Z",
      "sources_count": 3,
      "channels_count": 175,
      "size_bytes": 2400
    },
    {
      "filename": "channels.json.20251122_162638",
      "is_current": false,
      "created_at": "2025-11-22T16:26:38Z",
      "sources_count": 2,
      "channels_count": 148,
      "size_bytes": 2000
    }
  ]
}
```

#### POST /api/channels/load-from-disk (NEW v0.5.0)
Load channels from a saved version file on disk.

**Request Body:**
```json
{
  "filename": "premium-channels.json"
}
```

**Response: 200 OK**
```json
{
  "status": "success",
  "filename": "premium-channels.json",
  "channels": ["bbc1.uk", "itv.uk", ...],
  "count": 175,
  "loaded_at": "2025-11-26T23:35:00.000000"
}
```

**Error: 404 Not Found**
```json
{
  "detail": "Channel file not found: premium-channels.json"
}
```

**Error: 400 Bad Request**
```json
{
  "detail": "Invalid channel file: Invalid JSON in premium-channels.json"
}
```

**Error: 500 Internal Server Error**
```json
{
  "detail": "Failed to load channels from disk"
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

**Response: 200 OK**
```json
{
  "job_id": "merge_20251101_143000",
  "status": "running",
  "started_at": "2025-11-01T14:30:00Z"
}
```

#### GET /api/merge/current
Get current merged file info.

**Response: 200 OK**
```json
{
  "filename": "merged.xml.gz",
  "size_bytes": 5242880,
  "created_at": "2025-11-01T14:30:00Z",
  "channels": 145,
  "programs": 8234
}
```

#### GET /api/merge/download/{filename}
Download a merged file.

**Example:**
```bash
curl -O http://localhost:9193/api/merge/download/merged.xml.gz
```

**Response:** Binary gzip file (application/gzip)

#### POST /api/merge/save
Save temporary merge as current (archive previous).

**Request Body:**
```json
{
  "temp_filename": "merged_20251101_143000.xml.gz"
}
```

**Response: 200 OK**
```json
{
  "saved_as": "merged.xml.gz",
  "previous_archived": "merged.xml.gz.20251101_120000"
}
```

#### POST /api/merge/clear-temp
Clear temporary merge files.

**Response: 200 OK**
```json
{
  "status": "cleared",
  "deleted_count": 5
}
```

---

### Archives Management (Updated v0.5.0)

#### GET /api/archives/list
List all archives and current file.

**Query Parameters:**
- `limit` (integer, optional): Max results (default: 50)

**Response: 200 OK**
```json
{
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
  ]
}
```

#### GET /api/archives/download/{filename}
Download an archive file.

**Example:**
```bash
curl -O http://localhost:9193/api/archives/download/merged.xml.gz
```

**Response:** Binary gzip file (application/gzip)

#### GET /api/archives/download-channel/{filename} (NEW v0.5.0)
Download a channel version JSON file.

**Example:**
```bash
curl -O http://localhost:9193/api/archives/download-channel/premium-channels.json
```

**Response:** JSON file (application/json)

#### DELETE /api/archives/delete/{filename}
Delete an archive (cannot delete current).

**Example:**
```bash
curl -X DELETE http://localhost:9193/api/archives/delete/merged.xml.gz.20251101_120000
```

**Response: 200 OK**
```json
{
  "status": "success",
  "deleted": "merged.xml.gz.20251101_120000"
}
```

**Error: 403 Forbidden**
```json
{
  "detail": "Cannot delete current file"
}
```

#### DELETE /api/archives/delete-channel/{filename} (NEW v0.5.0)
Delete an archived channel version (cannot delete current).

**Example:**
```bash
curl -X DELETE http://localhost:9193/api/archives/delete-channel/channels.json.20251122_162638
```

**Response: 200 OK**
```json
{
  "status": "success",
  "message": "Deleted channels.json.20251122_162638"
}
```

**Error: 403 Forbidden**
```json
{
  "detail": "Cannot delete current channel file"
}
```

#### POST /api/archives/cleanup
Manually trigger archive cleanup based on retention policy.

**Response: 200 OK**
```json
{
  "deleted_count": 3,
  "freed_bytes": 15728640
}
```

---

### Settings (Updated v0.5.0)

#### GET /api/settings/get
Get all settings.

**Response: 200 OK**
```json
{
  "output_filename": "merged.xml.gz",
  "sources_filename": "sources.json",
  "channels_filename": "channels.json",
  "current_dir": "/data/current",
  "archive_dir": "/data/archives",
  "sources_dir": "/data/sources",
  "channels_dir": "/data/channels",
  "merge_schedule": "daily",
  "merge_time": "02:30",
  "merge_days": "[1,3,5]",
  "merge_timeframe": "7",
  "merge_channels_version": "channels.json",
  "download_timeout": "300",
  "merge_timeout": "600",
  "channel_drop_threshold": "0.1",
  "archive_retention_cleanup_expired": "false",
  "discord_webhook": ""
}
```

#### POST /api/settings/set (Updated v0.5.0)
Update settings.

**Request Body:**
```json
{
  "merge_time": "03:00",
  "merge_timeout": "900",
  "sources_filename": "my-sources.json",
  "sources_dir": "/data/sources"
}
```

**Response: 200 OK**
```json
{
  "status": "success",
  "updated_count": 4
}
```

**Error: 400 Bad Request**
```json
{
  "detail": "Validation error: [error message]"
}
```

**New Settings Keys (v0.5.0):**
- `sources_filename` (string, default: "sources.json") - Fallback default for source saves
- `sources_dir` (string, default: "/data/sources") - Directory for source version storage

---

### Jobs - Scheduled Merge Execution (v0.4.7+)

#### GET /api/jobs/status
Get current job status and next scheduled run.

**Response: 200 OK**
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
Get job execution history.

**Query Parameters:**
- `limit` (integer, optional, default: 50) - Maximum records to return

**Response: 200 OK**
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
Get most recent job record.

**Response: 200 OK**
```json
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
```

#### POST /api/jobs/execute-now
Manually trigger merge execution (for testing purposes).

**Response: 200 OK**
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

#### POST /api/jobs/cancel
Cancel currently running job.

**Response: 200 OK**
```json
{
  "status": "cancelled",
  "message": "Job cancellation requested"
}
```

#### POST /api/jobs/clear-history
Delete ALL job history records (irreversible).

**Response: 200 OK**
```json
{
  "status": "cleared",
  "deleted_count": 12,
  "message": "Deleted 12 job history records"
}
```

---

## Validation Rules

### Timeframes
- Valid values: "3", "7", "14" days
- Default: "7"

### Feed Types
- Valid values: "iptv", "gracenote"

### Filenames
- Merged EPG: Must end with .xml or .xml.gz
- Sources/Channels: Must end with .json (auto-added if omitted)
- Max 255 characters

### Timeouts
- Download: 10-600 seconds (default: 300)
- Merge: 30-1800 seconds (default: 600)

### Channel Drop Threshold
- Format: "0.0"-"1.0" (0%-100%) or empty string (disabled)
- Example: "0.5" means drop channels with <50% program coverage

### Discord Webhook
- Optional
- Must match Discord webhook URL pattern if provided
- Format: `https://discord.com/api/webhooks/{id}/{token}`

### Schedule Configuration
- `merge_schedule`: "daily" or "weekly"
- `merge_time`: "HH:MM" format (UTC)
- `merge_days`: JSON array of 0-6 (0=Sunday, 6=Saturday, weekly only)
- `merge_timeframe`: "3", "7", or "14"
- `merge_channels_version`: Valid channel version filename

### Settings Paths
- `current_dir`: Must be valid directory path
- `archive_dir`: Must be valid directory path
- `sources_dir`: Must be valid directory path (NEW v0.5.0)
- `channels_dir`: Must be valid directory path

---

## Error Codes

| Code | HTTP Status | Meaning |
|------|------------|---------|
| `INVALID_PARAM` | 400 | Invalid parameter value |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `FORBIDDEN` | 403 | Operation not allowed (e.g., delete current file) |
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

# 2. Save sources with custom name
curl -X POST http://localhost:9193/api/sources/save \
  -H "Content-Type: application/json" \
  -d '{"sources":["file1.xml.gz","file2.xml.gz"],"timeframe":"7","feed_type":"iptv","filename":"my-sources"}'

# 3. Load channels from sources
curl "http://localhost:9193/api/channels/from-sources?sources=file1.xml.gz,file2.xml.gz"

# 4. Select and save channels with custom name
curl -X POST http://localhost:9193/api/channels/select \
  -H "Content-Type: application/json" \
  -d '{"channels":["bbc1.uk","itv.uk"]}'

curl -X POST http://localhost:9193/api/channels/save \
  -H "Content-Type: application/json" \
  -d '{"channels":["bbc1.uk","itv.uk"],"sources_count":2,"filename":"uk-channels"}'

# 5. Execute merge
curl -X POST http://localhost:9193/api/merge/execute \
  -H "Content-Type: application/json" \
  -d '{"timeout_seconds":600}'

# 6. Check job status
curl http://localhost:9193/api/jobs/latest

# 7. Get available source versions
curl http://localhost:9193/api/sources/versions

# 8. Load source version from disk
curl -X POST http://localhost:9193/api/sources/load-from-disk \
  -H "Content-Type: application/json" \
  -d '{"filename":"my-sources.json"}'

# 9. Download result
curl -O http://localhost:9193/api/archives/download/merged.xml.gz
```

---

**Need help?** See [Troubleshooting](TROUBLESHOOTING.md) or check [Architecture](ARCHITECTURE.md) for system details.

**Last Updated:** v0.5.0 - November 26, 2025
