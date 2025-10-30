# EPG Merge - Active Development Context

## Current Phase
- **Phase:** 4 Stage 2
- **Version:** v0.4.2-docker
- **Status:** Docker containerization complete ✅
- **Next:** GitHub Actions CI/CD Workflow

## What Just Shipped
- Backend Dockerfile (Python 3.11, FastAPI, non-root user)
- Frontend Dockerfile (Node 18 + Nginx Alpine)
- docker-compose.yml with 2 containers
- nginx.conf with API proxy, gzip, security headers
- Health checks (backend 15s, frontend 10s start period)

## Phase 4 Stage 2: GitHub Actions CI/CD

### Tasks (Priority Order)

#### 1. Build Workflow (.github/workflows/build.yml)
```yaml
name: Build Docker Images
on: [push]  # Trigger on every push
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build backend
        run: docker build -t epg-merge-backend:${{ github.sha }} ./backend
      - name: Build frontend
        run: docker build -t epg-merge-frontend:${{ github.sha }} ./frontend
      - name: Sanity check backend
        run: docker run --rm epg-merge-backend:${{ github.sha }} python -m pytest --version
      - name: Sanity check frontend
        run: docker run --rm epg-merge-frontend:${{ github.sha }} npm --version
```

#### 2. Test Workflow (.github/workflows/test.yml)
```yaml
name: Run Tests
on: [pull_request]  # Trigger on PRs only
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm test -- integration.test.js
```

#### 3. Registry Push (Optional - Phase 4 Stage 3)
- Docker Hub credentials via GitHub Secrets
- Push on main branch only
- Tag with version

### Known Issues
- None blocking current work

### Quick Commands
```bash
# Run locally
sudo docker-compose up -d
sudo docker-compose logs -f

# Run tests
npm test
npm test -- --coverage

# Git workflow
git add .
git commit -m "Phase 4 Stage 2: [description]"
git push origin main
```

## Test Status
- ✅ 32 frontend tests passing
- ✅ 32 integration tests passing
- ✅ 64/64 total (0 failing)

## File Locations
- Frontend pages: `frontend/src/pages/`
- Frontend tests: `frontend/src/__tests__/`
- Backend: `backend/main.py`
- Docker: `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`
- Nginx: `frontend/nginx.conf`