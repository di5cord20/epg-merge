# EPG Merge App - Version Management

## Current Version
**0.3.1**

## Version Files Reference

This version is defined in ONE place: `backend/version.py`

All other files automatically reference this version:

### Backend
- `backend/version.py` - **PRIMARY SOURCE** ✓
- `backend/main.py` - imports from `version.py`
- `backend/requirements.txt` - comment only

### Frontend
- `frontend/package.json` - imports from backend via environment variable during build

### Installation & Deployment
- `install/install.sh` - reads from `backend/version.py`
- `CHANGELOG.md` - manual updates only
- `.version` file - created at runtime from `backend/version.py`

### Documentation
- `CONTEXT.md` - manual updates only
- `README.md` - manual updates only

## How to Update Version

### When to Bump
- **Patch** (0.3.0 → 0.3.1): Bug fixes, minor improvements
- **Minor** (0.3.0 → 0.4.0): New features, backwards compatible
- **Major** (0.3.0 → 1.0.0): Breaking changes, major redesign

### Update Process

1. **Edit `backend/version.py`**
   ```python
   __version__ = "0.3.1"
   __release_date__ = "2025-10-27"
   __author__ = "di5cord20"
   __license__ = "MIT"
   ```

2. **Update `CHANGELOG.md`** (manual - describe changes)

3. **Update `CONTEXT.md`** (manual - update Current Version line)

4. **Update `README.md`** (if needed - update features/roadmap)

5. **Commit and tag**
   ```bash
   git add backend/version.py CHANGELOG.md
   git commit -m "Release v0.3.1"
   git tag -a v0.3.1 -m "Version 0.3.1 - Archive cleanup and UI improvements"
   git push origin main --tags
   ```

### Files That Auto-Update
- Installation script reads version from `backend/version.py`
- Frontend gets version during build process
- API `/api/health` returns version from backend
- `.version` file created at deployment time

## Version Display Locations

- API: `GET /api/health` → `version: "0.3.1"`
- Frontend: Navbar → `v0.3.1`
- Install: Installation logs
- Service: Systemd environment

---

**Last Updated**: 2025-10-27  
**Maintainer**: di5cord20