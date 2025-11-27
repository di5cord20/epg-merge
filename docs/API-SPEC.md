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
  "version": "0.4.8"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Description of what went wrong",
  "code": "ERROR_CODE",
  "version": "0.4.8"
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
  "version": "0.4.8",
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
  "version": "0.4.8"
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

#### POST /api/channels/save (NEW v0.4.8)
Save selected channels with versioning and archive.

**Request Body:**
```json
{
  "channels": ["bbc1.uk", "itv.uk"],
  "sources_count": 2
}
```

**Response:**
```json
{
  "status": "success",
  "filename": "channels.json",
  "channels": 2,
  "sources": 2,
  "archived": true
}
```

#### GET /api/channels/versions (NEW v0.4.8)
Get all channel versions (current and archived).

**Response:**
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

#### GET /api/archives/download-channel/{filename} (NEW v0.4.8)
Download a channel version JSON file.

**Example:**
```bash
curl -O http://localhost:9193/api/archives/download-channel/channels.json
```

**Response:** JSON file (application/json)

#### DELETE /api/archives/delete-channel/{filename} (NEW v0.4.8)
Delete an archived channel version (cannot delete current).

**Example:**
```bash
curl -X DELETE http://localhost:9193/api/archives/delete-channel/channels.json.20251122_162638
```

**Response:**
```json
{
  "status": "success",
  "message": "Deleted channels.json.20251122_162638"
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



## update the above with the below and cleanup this file

## Sources (Updated v0.5.0)

### List Sources
```
GET /api/sources/list?timeframe=3&feed_type=iptv

Query Parameters:
- timeframe: "3" | "7" | "14" (default: "3")
- feed_type: "iptv" | "gracenote" (default: "iptv")

Response: 200 OK
{
  "sources": ["country1.xml.gz", "country2.xml.gz", ...]
}

Error: 500 Internal Server Error
{
  "detail": "Failed to fetch sources"
}
```

### Save Sources (Updated v0.5.0)
```
POST /api/sources/save

Request Body:
{
  "sources": ["us.xml.gz", "uk.xml.gz"],
  "timeframe": "3",
  "feed_type": "iptv",
  "filename": "us-sources"  // NEW: Optional custom filename
}

Response: 200 OK
{
  "status": "success",
  "filename": "us-sources.json",    // Includes .json extension
  "sources": 2,
  "timeframe": "3",
  "feed_type": "iptv",
  "archived": true
}

Error: 500 Internal Server Error
{
  "detail": "Failed to save sources"
}
```

### Get Source Versions (NEW v0.5.0)
```
GET /api/sources/versions

Response: 200 OK
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

Error: 500 Internal Server Error
{
  "detail": "Failed to get source versions"
}
```

### Load Sources from Disk (NEW v0.5.0)
```
POST /api/sources/load-from-disk

Request Body:
{
  "filename": "sources.json.20251126_223015"
}

Response: 200 OK
{
  "status": "success",
  "filename": "sources.json.20251126_223015",
  "sources": ["us.xml.gz", "uk.xml.gz"],
  "count": 2,
  "timeframe": "3",
  "feed_type": "iptv",
  "loaded_at": "2025-11-26T23:35:00.000000"
}

Error: 404 Not Found
{
  "detail": "Source file not found: sources.json.20251126_223015"
}

Error: 400 Bad Request
{
  "detail": "Invalid source file: Invalid JSON in sources.json.20251126_223015"
}

Error: 500 Internal Server Error
{
  "detail": "Failed to load sources from disk"
}
```

---

## Channels (Updated v0.5.0)

### Save Channels (Updated v0.5.0)
```
POST /api/channels/save

Request Body:
{
  "channels": ["ch1", "ch2", "ch3"],
  "sources_count": 2,
  "filename": "premium-channels"  // NEW: Optional custom filename
}

Response: 200 OK
{
  "status": "success",
  "filename": "premium-channels.json",  // Includes .json extension
  "channels": 3,
  "sources": 2,
  "archived": true
}

Error: 500 Internal Server Error
{
  "detail": "Failed to save channels"
}

Notes:
- filename parameter is optional
- If not provided, uses configured default (channels_filename setting)
- .json extension added automatically if not present
- Previous version auto-archived with timestamp
- Metadata saved to database
```

---

## Settings (Updated v0.5.0)

### New Settings Keys

#### sources_filename
```
Key: "sources_filename"
Type: string
Default: "sources.json"
Validation: Must end with .json

Usage:
- Fallback default filename when saving sources without custom name
- Used in SaveDialog as default option
- Example values: "sources.json", "my-sources.json"

Set via:
POST /api/settings/set
{
  "sources_filename": "my-sources.json"
}
```

#### sources_dir
```
Key: "sources_dir"
Type: string
Default: "/data/sources"
Validation: Required, must be valid path

Usage:
- Directory where source version JSON files are stored
- Source archives stored here with timestamps
- Example values: "/data/sources", "/mnt/storage/sources"

Set via:
POST /api/settings/set
{
  "sources_dir": "/data/sources"
}
```

#### channels_filename (Existing, now in Settings)
```
Key: "channels_filename"
Type: string
Default: "channels.json"
Validation: Must end with .json

Usage:
- Fallback default filename when saving channels without custom name
```

---

## Database Schema Changes (v0.5.0)

### New Table: source_versions
```sql
CREATE TABLE source_versions (
    filename TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sources_count INTEGER,
    size_bytes INTEGER
);

Indexes:
- PRIMARY KEY on filename
- TIMESTAMP on created_at for sorting

Example rows:
| filename                        | created_at           | sources_count | size_bytes |
|--------------------------------|----------------------|---------------|-----------|
| sources.json                   | 2025-11-26 23:30:00  | 3             | 145       |
| sources.json.20251126_223015   | 2025-11-26 22:30:15  | 2             | 132       |
| us-sources.json                | 2025-11-26 23:35:00  | 5             | 210       |
```

### Updated Table: channel_versions
```
No schema changes
Same structure as before, now populated with:
- Default filenames: channels.json
- Custom filenames: premium-channels.json, sports-channels.json, etc.
```

---

## Summary of Changes

| Endpoint | Method | Status | Change |
|----------|--------|--------|--------|
| /api/sources/list | GET | ✅ UPDATED | Fixed list handling |
| /api/sources/save | POST | ✅ UPDATED | Added filename parameter |
| /api/sources/versions | GET | ✨ NEW | List saved versions |
| /api/sources/load-from-disk | POST | ✨ NEW | Load specific version |
| /api/channels/save | POST | ✅ UPDATED | Added filename parameter |
| /api/settings/set | POST | ✅ UPDATED | Added sources_filename, sources_dir |

---

**Last Updated:** v0.5.0 - November 26, 2025