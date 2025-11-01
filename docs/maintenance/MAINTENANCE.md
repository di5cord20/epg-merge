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