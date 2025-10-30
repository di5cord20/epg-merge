# Phase 4 Stage 2 - GitHub Actions CI/CD

## Immediate Blockers
None - ready to start implementation

## Tasks (In Order)

### Step 1: Create Workflows Directory
- [ ] Create `.github/workflows/` directory
- [ ] Commit and push

### Step 2: Build Workflow
- [ ] Create `.github/workflows/build.yml`
- [ ] Builds backend and frontend on every push
- [ ] Quick sanity checks (python -m pytest, npm --version)
- [ ] Test: Push a commit, verify workflow runs

### Step 3: Test Workflow  
- [ ] Create `.github/workflows/test.yml`
- [ ] Runs npm test on pull requests only
- [ ] Includes full 64 test suite
- [ ] Blocks merge if tests fail
- [ ] Test: Create PR, verify tests run

### Step 4: Documentation
- [ ] Update README.md with CI/CD info
- [ ] Document required GitHub secrets (if any)
- [ ] Add GitHub Actions badge to README

### Step 5: Registry Integration (Optional)
- [ ] Set up Docker Hub account (if not done)
- [ ] Add Docker Hub secrets to GitHub
- [ ] Create push workflow for main branch
- [ ] Tag images with version

## Completion Criteria
- ✅ build.yml works (images build successfully)
- ✅ test.yml works (tests run, block merge on failure)
- ✅ README updated
- ✅ All commits pushed

## Estimated Timeline
- Build workflow: 15 min
- Test workflow: 15 min
- Documentation: 10 min
- Registry setup: 20 min (optional)
- **Total: 40-60 min**