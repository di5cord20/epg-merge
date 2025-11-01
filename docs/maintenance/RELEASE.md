# Creating a New Release (v0.3.1+)

## Pre-Release Checklist

- [ ] All features tested locally
- [ ] All tests passing (`pytest tests/ -v`)
- [ ] Code reviewed
- [ ] No console errors in browser
- [ ] No linting errors
- [ ] CHANGELOG.md updated with new features
- [ ] Version number determined (patch/minor/major)

## Release Process

### 1. Update Version (Single Source)

Edit `backend/version.py`:
```python
__version__ = "0.3.1"
__release_date__ = "2025-10-28"
```

### 2. Update CHANGELOG.md

```markdown
## [0.3.1] - 2025-10-28

### Added
- Archive cleanup based on retention policy
- Verbose merge logging with popup viewer
- Test Discord notification feature
- Session persistence for merge details

### Changed
- Enhanced Settings page layout and validation
- Improved ArchivesPage with days-left indicator

### Fixed
- Archive naming with creation timestamps
```

### 3. Commit Version & Changelog

```bash
git add backend/version.py CHANGELOG.md
git commit -m "chore: bump version to 0.3.1"
```

### 4. Create Annotated Git Tag

```bash
git tag -a v0.3.1 -m "Version 0.3.1 - Archive cleanup and UI improvements"
```

### 5. Push to GitHub

```bash
git push origin main
git push origin v0.3.1
```

### 6. Create GitHub Release

Visit: https://github.com/di5cord20/epg-merge/releases/new

- **Tag**: `v0.3.1` (already created)
- **Title**: `Version 0.3.1 - Archive Cleanup & UI Improvements`
- **Description**: Copy from CHANGELOG.md section

Example:
```markdown
## What's New in v0.3.1

### Features ✨
- Automatic archive cleanup based on retention policy
- Verbose merge logging with popup terminal viewer
- Test Discord webhook notifications
- Session persistence for merge details across page navigation

### Improvements 🔧
- Enhanced Settings page with better layout
- Archive table now shows days remaining with color indicators
- Better validation rules for settings inputs
- Version centralization in single file

### Fixes 🐛
- Fixed archive file naming with creation timestamps
- Improved merge session state management

## Installation

**Fresh Install:**
```bash
sudo bash install/install.sh
```

**Update Existing:**
```bash
cd /opt/epg-merge-app
git pull origin main
bash scripts/build.sh
```

## Compatibility
- Python 3.12+
- Node 18+
- Debian/Ubuntu

See [CHANGELOG.md](CHANGELOG.md) for full details.
```

### 7. Deployment to Production

```bash
# SSH to production server
ssh root@10.96.70.113

# Navigate to app
cd /opt/epg-merge-app

# Pull latest changes
git pull origin main

# Update backend dependencies (if needed)
cd backend
source venv/bin/activate
pip install --upgrade -r requirements.txt
deactivate
cd ..

# Rebuild frontend
bash scripts/build.sh

# Service will auto-restart from build script
systemctl status epg-merge
```

### 8. Verify Deployment

```bash
# Check version
curl http://10.96.70.113:9193/api/health | grep version

# Test UI loads
# Visit http://10.96.70.113:9193

# Check logs
journalctl -u epg-merge -n 20 --no-pager
```

## Rollback (If Issues)

```bash
# Revert to previous tag
git checkout v0.3.0

# Rebuild
bash scripts/build.sh

# Verify
curl http://localhost:9193/api/health
```

## Release Cadence

- **Patch releases** (0.3.X): Weekly or as bugs found
- **Minor releases** (0.X.0): Monthly with new features
- **Major releases** (X.0.0): As needed for breaking changes

## Checklist Template

Copy this for each release:

```markdown
## Release v0.3.1 Checklist

- [ ] Version updated in `backend/version.py`
- [ ] CHANGELOG.md updated with all changes
- [ ] All tests passing locally
- [ ] Frontend builds without errors
- [ ] Commit: "chore: bump version to 0.3.1"
- [ ] Tag created: `git tag -a v0.3.1 -m "..."`
- [ ] Pushed to GitHub: `git push origin main --tags`
- [ ] GitHub Release created with description
- [ ] Deployed to production server
- [ ] Verified: API health check returns 0.3.1
- [ ] Verified: UI loads and works
- [ ] Verified: No errors in logs
```

---

**Time to Release**: ~15 minutes
**Rollback Time**: ~5 minutes