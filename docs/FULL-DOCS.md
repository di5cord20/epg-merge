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


# Code Design Patterns

## Component Architecture

### Sub-Component Pattern
```javascript
// All settings sub-components follow this pattern
export const SettingsXXX = ({
  settings,              // Current config (read-only)
  onSettingChange,       // Update handler
  validationErrors,      // Validation results
  savedPanel,           // Which panel just saved
  onSave               // Trigger save for panel
}) => {
  // Component implementation
};
```

### Orchestrator Pattern
- Main page manages state
- Sub-components receive props only
- No localStorage in sub-components
- All state flows downward
- Changes flow upward via callbacks

## Styling

- **All inline styles** - No CSS imports in components
- **Consistent palette** - Colors defined in App.css
- **Reusable objects** - panelContainerStyle, sectionStyle, buttonStyle
- **Dark mode only** - No light theme support

## Testing Strategy

- **Frontend tests:** Utilities + validation
- **Integration tests:** API contracts + workflows
- **No E2E tests yet** - Consider for Phase 5

## Error Handling

- All components receive `validationErrors` object
- Validation happens in orchestrator
- Sub-components display errors in real-time


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


# Deployment Guide

## Local Development

### Quick Start
```bash
# Build
sudo docker-compose build

# Run
sudo docker-compose up -d

# Verify
sudo docker-compose ps
curl http://localhost:9193/api/health
curl http://localhost/
```

### Logs & Debugging
```bash
# All logs
sudo docker-compose logs -f

# Specific service
sudo docker-compose logs -f backend
sudo docker-compose logs -f frontend

# Stop
sudo docker-compose down
```

## Production Deployment (Future - Phase 4 Stage 3)

### Prerequisites
- Docker registry credentials
- Kubernetes cluster (or Docker Swarm)
- SSL certificates
- Monitoring tools

### Deployment Steps
1. Build & push images
2. Create secrets in cluster
3. Deploy workloads
4. Configure ingress/load balancer
5. Set up monitoring

## Rollback Procedure
```bash
# Revert to previous image tag
docker pull epg-merge-backend:v0.4.1
# Update deployment
```

## Scaling (Future)
- Horizontal: Multiple replicas
- Vertical: Resource limits
- Load balancer: Traffic distribution


# Troubleshooting Guide

## Docker Issues

### Container won't start
```bash
# Check logs
sudo docker-compose logs backend

# Common causes:
# 1. Port already in use
sudo lsof -ti :9193 | xargs kill -9

# 2. Permission denied on /config
# → Check Dockerfile has: RUN mkdir -p /config && chown -R appuser:appuser /config

# 3. FastAPI not installed
# → Verify: pip install -r requirements.txt
```

### Health check failing
```bash
# Check endpoint
curl http://localhost:9193/api/health

# Increase start_period in docker-compose.yml
healthcheck:
  start_period: 15s  # Was 5s
```

## Frontend Issues

### Blank page or 404
```bash
# Check nginx logs
sudo docker-compose logs frontend

# Verify build succeeded
docker exec epg-merge-frontend ls -la /usr/share/nginx/html/

# Check API connectivity
docker exec epg-merge-frontend curl http://backend:9193/api/health
```

### API connection errors
```bash
# Verify REACT_APP_API_BASE
docker exec epg-merge-frontend env | grep REACT_APP

# Should be: http://backend:9193
```

## Test Issues

### Tests failing locally
```bash
# Regenerate lock file
cd frontend
rm package-lock.json
npm install
npm test
```

### Permission denied during build
```bash
# Run with sudo
sudo docker-compose build --no-cache

# Or fix permissions
sudo chown -R $(whoami) .
```

## Performance Issues

### Slow builds
```bash
# Use cache
docker-compose build

# No cache (slower)
docker-compose build --no-cache

# Check disk space
df -h
```

### Memory/CPU issues
```bash
# Monitor usage
docker stats

# Limit resources in docker-compose.yml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```


# Maintenance & Updates

## Weekly Checklist
- [ ] Review recent commits
- [ ] Update CONTEXT-ACTIVE.md
- [ ] Check for test failures
- [ ] Review performance metrics

## Monthly Checklist
- [ ] Update dependency versions
- [ ] Review security advisories
- [ ] Check Docker image sizes
- [ ] Update documentation

## Version Bumping
```bash
# Patch (bug fix): v0.4.2 → v0.4.3
# Minor (feature): v0.4.2 → v0.5.0
# Major (breaking): v0.4.2 → v1.0.0

git tag -a v0.4.3 -m "Bug fix description"
git push origin v0.4.3
```

## Dependency Updates
```bash
# Frontend
npm update
npm audit fix

# Backend
pip list --outdated
pip install --upgrade package-name
```

## Release Checklist
- [ ] All tests passing
- [ ] Version bumped
- [ ] CHANGELOG updated
- [ ] Docker images built & tested
- [ ] Git tagged & pushed


