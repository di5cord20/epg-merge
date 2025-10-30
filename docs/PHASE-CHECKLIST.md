# Phase 4 Stage 2 Checklist

## GitHub Actions CI/CD Setup

### [ ] Initial Setup
- [ ] Create `.github/workflows/` directory
- [ ] Create `build.yml` workflow file
- [ ] Create `test.yml` workflow file
- [ ] Create `deploy.yml` workflow file (optional)

### [ ] Build Workflow
- [ ] Trigger on push to main
- [ ] Build backend Docker image
- [ ] Build frontend Docker image
- [ ] Tag images with version
- [ ] Run quick sanity check

### [ ] Test Workflow
- [ ] Trigger on pull requests
- [ ] Run frontend tests (64 tests)
- [ ] Run integration tests (32 tests)
- [ ] Report coverage
- [ ] Block merge if tests fail

### [ ] Registry Integration
- [ ] Docker Hub account setup
- [ ] GitHub secrets for credentials
- [ ] Push backend image on success
- [ ] Push frontend image on success

### [ ] Documentation
- [ ] Update README with CI/CD info
- [ ] Document GitHub secrets needed
- [ ] Add badge to README (build status)

## Completion Criteria
- ✅ Workflows trigger automatically
- ✅ All tests run in CI
- ✅ Images build successfully
- ✅ Deployment ready (optional)