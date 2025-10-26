# EPG Merge App - Deployment Guide

## 🎯 Goal: Frequent, Small, Focused Deployments

This guide provides a comprehensive workflow for deploying changes to the EPG Merge Application with emphasis on frequent, incremental updates rather than large, infrequent releases.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Workflows](#deployment-workflows)
3. [Small Commit Strategy](#small-commit-strategy)
4. [Commit Message Templates](#commit-message-templates)
5. [Version Bumping Rules](#version-bumping-rules)
6. [Production Deployment](#production-deployment-checklist)
7. [Git Branch Strategy](#git-branch-strategy-recommended)
8. [Daily Deployment Schedule](#daily-deployment-schedule)
9. [Quick Reference](#quick-reference-card)
10. [Checklist Template](#checklist-template)

---

## Pre-Deployment Checklist

### 1. **Version Planning**
- [ ] Decide version number based on changes:
  - `x.y.z` format (semantic versioning)
  - **Patch (0.2.1 → 0.2.2)**: Bug fixes, small improvements
  - **Minor (0.2.0 → 0.3.0)**: New features, backwards compatible
  - **Major (0.2.0 → 1.0.0)**: Breaking changes, major redesign

### 2. **Code Review**
- [ ] Run `git status` - confirm only intended files changed
- [ ] Run `git diff` - review actual changes line by line
- [ ] Check for accidentally committed files (.env, secrets, test data)
- [ ] Verify no debug code or console.logs left in

### 3. **Testing (Local)**
```bash
# Backend tests
cd ~/github/epg-merge/backend
source venv/bin/activate
pytest tests/ -v
pytest tests/ --cov=services --cov-report=html

# Frontend - check for errors
cd ~/github/epg-merge/frontend
npm run build
# Check build output for errors
```

- [ ] Backend tests pass
- [ ] Frontend builds without errors
- [ ] No TypeScript/ESLint warnings

### 4. **Version File Updates**
- [ ] Update version in `CONTEXT.md` (line 14: `**Current Version:**`)
- [ ] Update version in `frontend/package.json` (`"version": "0.2.1"`)
- [ ] Update version in `backend/main.py` (FastAPI app version)
- [ ] Update version in `install/install.sh` (line 7: `APP_VERSION="0.2.1"`)
- [ ] Update version in `frontend/src/components/Navbar.js` (version display)

### 5. **Documentation**
- [ ] Update `CHANGELOG.md` with new changes
- [ ] Update `README.md` if needed (new features, API changes)
- [ ] Update `CONTEXT.md` if architecture changed
- [ ] Add inline code comments for complex changes

---

## Deployment Workflows

### Option A: Quick Patch (Bug Fixes, Small Changes)

**Example: Fix a typo, adjust styling, small bug fix**

```bash
cd ~/github/epg-merge

# 1. Make your change (edit 1-2 files)

# 2. Test locally
git diff

# 3. Quick commit
git add <changed-files>
git commit -m "Fix: <brief description>

- Specific change detail
- Impact/reasoning"

# 4. Push without tag (for minor patches)
git push origin main

# 5. Deploy to production
ssh 10.96.70.113
cd /opt/epg-merge-app
git pull
sudo systemctl restart epg-merge
```

**When to use:**
- Typo fixes
- CSS adjustments
- Small bug fixes
- Documentation updates
- Non-breaking changes

---

### Option B: Feature Deployment (New Features, Enhancements)

**Example: Add new component, new API endpoint, new page**

```bash
cd ~/github/epg-merge

# 1. Create feature branch (optional but recommended)
git checkout -b feature/archives-page

# 2. Make changes, commit incrementally
git add frontend/src/pages/ArchivesPage.js
git commit -m "Add ArchivesPage component structure"

git add backend/services/archive_service.py
git commit -m "Enhance archive service with metadata"

# 3. Test thoroughly
cd backend && pytest tests/
cd frontend && npm run build

# 4. Merge to main
git checkout main
git merge feature/archives-page

# 5. Update version files (see checklist above)

# 6. Create release commit
git add .
git commit -m "Release v0.2.1 - Archives Page Implementation

Major Changes:
- Add complete ArchivesPage with download functionality
- Enhance archive service with detailed metadata
- Update UI components for better UX

Version: 0.2.1"

# 7. Tag and push
git tag -a v0.2.1 -m "Version 0.2.1 - Archives Page"
git push origin main
git push origin v0.2.1

# 8. Deploy to production
ssh 10.96.70.113
cd /opt/epg-merge-app
sudo bash install/install.sh
# Select: Update/Upgrade mode
```

**When to use:**
- New features
- Multiple file changes
- Breaking changes
- Major enhancements

---

### Option C: Hotfix (Critical Bug, Production Issue)

**Example: Service crashes, data loss risk, security issue**

```bash
cd ~/github/epg-merge

# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-crash

# 2. Fix the issue (minimal changes)
# Edit only what's necessary

# 3. Test fix
pytest tests/test_specific.py -v

# 4. Commit with clear description
git add <fixed-files>
git commit -m "Hotfix: Fix critical crash in merge service

Issue: Service crashed when no channels selected
Fix: Add validation before merge execution
Impact: Prevents service crashes

Closes #123"

# 5. Bump patch version
# Update version files: 0.2.1 → 0.2.2

# 6. Merge and deploy immediately
git checkout main
git merge hotfix/critical-crash
git tag -a v0.2.2 -m "Hotfix v0.2.2 - Critical crash fix"
git push origin main
git push origin v0.2.2

# 7. Deploy immediately
ssh 10.96.70.113
cd /opt/epg-merge-app
git pull
sudo systemctl restart epg-merge
# Verify service is running
systemctl status epg-merge
```

**When to use:**
- Service crashes
- Data corruption risks
- Security vulnerabilities
- Critical bugs in production

---

## Small Commit Strategy

### Daily Development Workflow

**Goal: Commit 3-5 times per day with focused changes**

#### Morning (Planning)
```bash
# Pull latest changes
git pull origin main

# Create daily branch (optional)
git checkout -b daily/2025-10-26

# Plan 2-3 small tasks
# Example:
# 1. Fix progress bar styling
# 2. Add error message to merge page
# 3. Update API documentation
```

#### During Work (Incremental Commits)
```bash
# Task 1: Fix progress bar
# Edit: frontend/src/components/ProgressBar.js
git add frontend/src/components/ProgressBar.js
git commit -m "Fix: Adjust progress bar width on mobile

- Change max-width from 100% to 90%
- Add responsive breakpoint for tablets
- Fixes display issue on small screens"

# Task 2: Add error message
# Edit: frontend/src/pages/MergePage.js
git add frontend/src/pages/MergePage.js
git commit -m "Add: Display error message when merge fails

- Show red alert box with error details
- Add retry button
- Improves user feedback"

# Task 3: Update docs
# Edit: README.md
git add README.md
git commit -m "Docs: Update API endpoint examples

- Add curl examples for all endpoints
- Fix typo in merge endpoint
- Add response format documentation"
```

#### End of Day (Review & Push)
```bash
# Review all changes
git log --oneline -5

# Push to remote
git push origin daily/2025-10-26

# Merge to main if ready
git checkout main
git merge daily/2025-10-26
git push origin main
```

---

## Commit Message Templates

### Bug Fix
```
Fix: <Short description>

Issue: <What was broken>
Solution: <How you fixed it>
Impact: <What this affects>

Closes #<issue-number>
```

### New Feature
```
Add: <Feature name>

What: <What it does>
Why: <Why it's needed>
How: <Brief technical approach>

Related: #<issue-number>
```

### Enhancement
```
Improve: <What was improved>

Before: <Previous behavior>
After: <New behavior>
Benefit: <Why this is better>
```

### Refactor
```
Refactor: <What was refactored>

Changes:
- <Specific change 1>
- <Specific change 2>

No functional changes
```

### Documentation
```
Docs: <What was documented>

- <Change 1>
- <Change 2>

Affects: <Which docs/files>
```

---

## Version Bumping Rules

### When to Bump Patch (0.2.1 → 0.2.2)
- Bug fixes
- Documentation updates
- CSS/styling tweaks
- Performance improvements (no API changes)
- Security patches

### When to Bump Minor (0.2.0 → 0.3.0)
- New features
- New API endpoints
- New UI components/pages
- Backwards-compatible changes
- Dependency updates (major)

### When to Bump Major (0.9.0 → 1.0.0)
- Breaking API changes
- Database schema changes
- Complete redesign
- Removal of features
- Major architecture changes

---

## Production Deployment Checklist

### Pre-Deployment (On Dev Machine)
```bash
# 1. Ensure clean working directory
git status  # Should be clean

# 2. Pull latest
git pull origin main

# 3. Run tests
cd backend && pytest tests/ -v
cd frontend && npm run build

# 4. Review changes
git log -5 --oneline

# 5. Check version consistency
grep -r "0.2.1" .
# Should find in: package.json, main.py, install.sh, CONTEXT.md, Navbar.js
```

### Deployment (On Production Server)
```bash
# 1. SSH to server
ssh 10.96.70.113

# 2. Create backup first
cd /opt/epg-merge-app
sudo bash scripts/backup.sh --compress

# 3. Check current version
cat .version

# 4. Check service status
systemctl status epg-merge

# 5. Deploy update
cd /tmp
git clone https://github.com/di5cord20/epg-merge.git
cd epg-merge
git checkout v0.2.1  # or main for latest
sudo bash install/install.sh

# 6. Select update mode
# Choose: 2) Update/Upgrade

# 7. Verify deployment
systemctl status epg-merge
curl http://localhost:9193/api/health

# 8. Check logs
journalctl -u epg-merge -n 50 --no-pager

# 9. Test in browser
# Visit: http://10.96.70.113:9193
```

### Post-Deployment Verification
- [ ] Service is running
- [ ] Health check returns 200 OK
- [ ] Frontend loads without errors
- [ ] Can navigate to all pages
- [ ] API endpoints respond correctly
- [ ] No errors in journalctl logs
- [ ] Database still accessible
- [ ] Archives still downloadable

### Rollback Plan (If Issues)
```bash
# 1. Stop service
sudo systemctl stop epg-merge

# 2. List backups
ls -lht /opt/epg-merge-app/backups/

# 3. Restore previous backup
sudo bash /opt/epg-merge-app/scripts/restore.sh backup_YYYYMMDD_HHMMSS

# 4. Verify restoration
systemctl status epg-merge
curl http://localhost:9193/api/health
```

---

## Git Branch Strategy (Recommended)

```
main (stable, production-ready)
├── develop (integration branch)
│   ├── feature/archives-page
│   ├── feature/settings-ui
│   └── feature/scheduled-merges
├── hotfix/critical-bug (immediate fixes)
└── release/v0.3.0 (release preparation)
```

### Workflow
```bash
# New feature
git checkout develop
git checkout -b feature/new-feature
# ... work ...
git commit -m "Add new feature"
git checkout develop
git merge feature/new-feature

# Ready for release
git checkout main
git merge develop
git tag -a v0.3.0 -m "Release v0.3.0"
git push origin main v0.3.0

# Hotfix
git checkout main
git checkout -b hotfix/critical
# ... fix ...
git checkout main
git merge hotfix/critical
git tag -a v0.2.2 -m "Hotfix v0.2.2"
```

---

## Daily Deployment Schedule

### Suggested Frequency

**Small Changes (Daily)**
- Documentation updates: Push anytime
- Bug fixes: Test + push same day
- CSS tweaks: Push after verification

**Medium Changes (2-3 days)**
- New components: Test 1 day, deploy next
- API changes: Review + test + deploy
- UI enhancements: Get feedback first

**Large Changes (1 week)**
- New pages: Full testing cycle
- Major features: Beta test internally
- Breaking changes: Announce + schedule

---

## Quick Reference Card

```bash
# 📝 QUICK COMMIT WORKFLOW

# 1. Make small change (1-3 files)
git add <files>

# 2. Commit with clear message
git commit -m "Fix: Description"

# 3. Push (no tag for small changes)
git push origin main

# 4. Deploy (if needed immediately)
ssh 10.96.70.113
cd /opt/epg-merge-app && git pull
sudo systemctl restart epg-merge

# ✅ Done! (< 5 minutes)
```

---

## Checklist Template

Copy and use this for each deployment:

```markdown
## Deployment Checklist - v0.2.X

### Pre-Deploy
- [ ] Code changes tested locally
- [ ] Version updated in all files
- [ ] CHANGELOG.md updated
- [ ] Commit message written
- [ ] Tests pass
- [ ] Build succeeds

### Deploy
- [ ] Committed to git
- [ ] Tagged (if release)
- [ ] Pushed to GitHub
- [ ] Backed up production
- [ ] Deployed to server
- [ ] Service restarted

### Verify
- [ ] Service running
- [ ] Health check OK
- [ ] UI loads
- [ ] No console errors
- [ ] API responds
- [ ] Logs clean

### Rollback Plan
- [ ] Backup location noted
- [ ] Rollback tested (if critical)
```

---

## Best Practices

### DO ✅
- Commit frequently (3-5 times per day)
- Write clear, descriptive commit messages
- Test before committing
- Update version numbers consistently
- Create backups before deploying
- Verify deployment after pushing
- Use feature branches for complex work
- Tag releases properly

### DON'T ❌
- Commit broken code
- Push directly to production without testing
- Mix multiple unrelated changes in one commit
- Forget to update version numbers
- Skip documentation updates
- Deploy without backing up
- Leave debug code in commits
- Use generic commit messages ("fixed stuff", "updates")

---

## Troubleshooting

### Common Issues

**Service won't start after deployment**
```bash
# Check logs
journalctl -u epg-merge -n 100 --no-pager

# Common causes:
# - Syntax error in Python/JavaScript
# - Missing dependency
# - Database migration needed

# Quick fix: Rollback
sudo bash /opt/epg-merge-app/scripts/restore.sh <backup-name>
```

**Frontend not updating**
```bash
# Force rebuild
cd /opt/epg-merge-app
sudo bash scripts/build.sh

# Clear browser cache
# Press Ctrl+Shift+R in browser
```

**Git conflicts**
```bash
# On conflict during merge
git status  # See conflicted files
# Manually edit conflicted files
git add <resolved-files>
git commit -m "Merge: Resolve conflicts"
```

---

## Contact & Support

- **GitHub Issues**: https://github.com/di5cord20/epg-merge/issues
- **Documentation**: See `CONTEXT.md` for architecture details
- **Logs**: `journalctl -u epg-merge -f`

---

**Last Updated**: 2025-10-26  
**Version**: 1.0  
**Maintainer**: di5cord20