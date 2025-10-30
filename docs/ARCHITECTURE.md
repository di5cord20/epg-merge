# EPG Merge Architecture

## High-Level Overview

┌─────────────────────────────────────────────┐
│ Frontend (React 18.2)                       │
│ - Dashboard: Job monitoring                 │
│ - Settings: Config management (7 panels)    │
│ - Archives: File management + legend        │
│ - Sources/Channels/Merge: Core workflow     │
└──────────────┬──────────────────────────────┘
│ HTTP/REST
↓
┌─────────────────────────────────────────────┐
│ Backend (FastAPI/Python 3.11)               │
│ - GET /api/health                           │
│ - GET/POST /api/settings/*                  │
│ - GET/DELETE /api/archives/*                │
│ - GET /api/jobs/*                           │
│ - POST /api/merge/execute                   │
└──────────────┬──────────────────────────────┘
│
↓
Data Layer (TBD)

## Key Design Decisions

### 1. Component Refactoring (Phase 2)
- **Decision:** Split monolithic pages into focused sub-components
- **Rationale:** Testability, maintainability, reusability
- **Trade-offs:** More files, but cleaner separation of concerns
- **Result:** 7 Settings sub-components + 3 Archives sub-components

### 2. Archive Retention Simplification (Phase 2)
- **Decision:** Remove `archive_retention_days` input, use boolean checkbox
- **Rationale:** Reduce complexity, single responsibility
- **Key Change:** `archive_retention_cleanup_expired: boolean`
- **Behavior:** Delete archives when no scheduled programs remain

### 3. Dashboard Simplification (Phase 2)
- **Decision:** Remove "Run Now" button, pure monitoring only
- **Rationale:** Separate concerns (dashboard = read, merge = write)
- **Result:** Cleaner monitoring interface, scheduled jobs only

### 4. Docker Containerization (Phase 4)
- **Decision:** Multi-stage builds for minimal image sizes
- **Rationale:** Production efficiency, security hardening
- **Features:** Non-root user, health checks, volume mounts

## Deployment Topology
┌─ Docker Compose (Local Dev) ─┐
│ ┌──────────┐  ┌────────────┐ │
│ │ Backend  │  │ Frontend   │ │
│ │ :9193    │  │ :80 (Nginx)│ │
│ └──────────┘  └────────────┘ │
│   (Python)       (Node build)  │
└──────────────────────────────┘
│
↓
┌─ Production (Future) ─────────┐
│ Kubernetes / Docker Swarm     │
│ Load Balancer → multiple pods │
└──────────────────────────────┘

## Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | React | 18.2.0 | Dark mode only |
| Backend | FastAPI | 0.104.1 | REST API |
| Language | Python | 3.11 | Slim container |
| Container | Docker | Latest | Multi-stage |
| Web Server | Nginx | Alpine | Reverse proxy |
| Testing | Jest + React Testing Library | Latest | 64 tests |
| Version Control | Git | Latest | GitHub |

## API Contract

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/settings/get` - Current settings
- `POST /api/settings/set` - Save settings
- `GET /api/archives/list` - Archives list
- `GET /api/archives/download/:filename` - Download
- `DELETE /api/archives/delete/:filename` - Delete
- `GET /api/jobs/status` - Job status
- `GET /api/jobs/history` - Job history

### Settings Schema
```javascript
{
  output_filename: string,
  merge_schedule: 'daily' | 'weekly',
  merge_time: string (HH:MM),
  merge_days: string[] (0-6),
  download_timeout: number (10-600s),
  merge_timeout: number (30-1800s),
  channel_drop_threshold: string (0-100% or empty),
  archive_retention_cleanup_expired: boolean,
  discord_webhook: string (optional)
}
```