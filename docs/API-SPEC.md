# API Specification v0.4.2

## Health Check

GET /api/health
Response: { version: string, status: 'ok' }

## Settings
GET /api/settings/get
Response: { ...settings object }
POST /api/settings/set
Body: { ...settings object }
Response: { success: boolean }

## Archives
GET /api/archives/list
Response: { archives: [...archive objects], total: number }
GET /api/archives/download/:filename
Response: Binary file (gzip)
DELETE /api/archives/delete/:filename
Response: { success: boolean }

## Jobs
GET /api/jobs/status
Response: { is_running: boolean, next_scheduled_run: ISO8601, latest_job: {...} }
GET /api/jobs/history?limit=10
Response: { jobs: [...job objects] }

## Validation Rules

- Filename: Must end with .xml or .xml.gz
- Webhook: Optional, must match Discord URL pattern if provided
- Timeouts: Download 10-600s, Merge 30-1800s
- Channel drop: 0-100% or empty (disabled)