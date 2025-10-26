# EPG Merge App - Implementation & Migration Guide

## Quick Start: Complete Refactoring in 4 Weeks

### Week 1: Backend Foundation
### Week 2: Backend Services
### Week 3: Frontend Components
### Week 4: Testing & Documentation

---

## WEEK 1: Backend Foundation Setup

### Day 1-2: Project Structure

**Step 1: Create new structure**
```bash
cd backend/
mkdir -p services utils tests/{unit,integration,fixtures}
touch __init__.py

# Create module files
touch config.py database.py
touch utils/{__init__.py,logger.py,errors.py,validators.py}
touch services/{__init__.py,base_service.py}
```

**Step 2: Migrate config.py**

Create `backend/config.py` using the Config class from the config_utils artifact.

**Step 3: Migrate database.py**

Create `backend/database.py` using the Database class from the config_utils artifact.

### Day 3: Update main.py Structure

**Step 1: Remove old code from main.py**

Delete all the old implementation and replace with clean imports:

```python
# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import Config
from database import Database
from utils.logger import setup_logging

# Initialize
config = Config()
db = Database(config.db_path)
logger = setup_logging(__name__)

app = FastAPI(title="EPG Merge API", version="0.1.0")

# Middleware
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)

# Keep endpoints - we'll refactor these in Week 2
```

**Step 2: Add health check endpoints**

```python
@app.on_event("startup")
async def startup_event():
    logger.info("Starting EPG Merge")
    db.initialize()

@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "0.1.0"}

@app.get("/api/status")
async def status():
    return {"database": db.health_check()}
```

**Step 3: Test it works**

```bash
cd backend
source venv/bin/activate
python -m uvicorn main:app --reload
# Visit http://localhost:8000/api/health
```

### Day 4-5: Logging & Error Handling

**Step 1: Create logging utility**

Create `backend/utils/logger.py` using code from config_utils artifact.

**Step 2: Create error classes**

Create `backend/utils/errors.py` using code from config_utils artifact.

**Step 3: Update imports in main.py**

```python
from utils.logger import setup_logging
from utils.errors import AppError, ValidationError, NotFoundError

logger = setup_logging(__name__)
```

**Step 4: Add global error handler**

```python
@app.exception_handler(AppError)
async def app_error_handler(request, exc):
    logger.error(f"App error: {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )
```

---

## WEEK 2: Backend Services Refactoring

### Day 1-2: Source Service

**Step 1: Create SourceService**

Create `backend/services/source_service.py` using code from services artifact.

**Step 2: Move source logic from main.py to service**

```python
# Move this from main.py to SourceService
# - fetch_sources()
# - _parse_xml_files()
```

**Step 3: Update main.py endpoint**

```python
from services.source_service import SourceService

source_service = SourceService(config)

@app.get("/api/sources/list")
async def list_sources(timeframe: str = Query("3"), feed_type: str = Query("iptv")):
    try:
        result = await source_service.fetch_sources(timeframe, feed_type)
        return result
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sources")
```

**Step 4: Test the endpoint**

```bash
curl http://localhost:9193/api/sources/list
```

### Day 3: Channel Service

**Step 1: Create ChannelService**

Create `backend/services/channel_service.py` using code from services artifact.

**Step 2: Move all channel logic**

Move these functions from main.py:
- get_channels_from_sources()
- get_selected_channels()
- select_channels()
- export_channels()
- import_channels()

**Step 3: Update endpoints**

```python
from services.channel_service import ChannelService

channel_service = ChannelService(config, db)

@app.get("/api/channels/selected")
async def get_selected():
    channels = channel_service.get_selected_channels()
    return {"channels": channels}

@app.post("/api/channels/select")
async def select_channels(data: dict):
    channels = data.get("channels", [])
    channel_service.save_selected_channels(channels)
    return {"status": "saved", "count": len(channels)}
```

**Step 4: Test endpoints**

```bash
curl -X POST http://localhost:9193/api/channels/select \
  -H "Content-Type: application/json" \
  -d '{"channels": ["ch1", "ch2"]}'
```

### Day 4: Merge Service

**Step 1: Create MergeService**

Create `backend/services/merge_service.py` using code from services artifact.

**Step 2: Move merge logic**

Move these functions:
- execute_merge()
- _download_sources()
- _merge_xml_files()
- get_current_merge_info()
- save_merge()

**Step 3: Update endpoints**

```python
from services.merge_service import MergeService

merge_service = MergeService(config, db)

@app.post("/api/merge/execute")
async def execute_merge(data: dict):
    try:
        result = await merge_service.execute_merge(data)
        return result
    except Exception as e:
        logger.error(f"Merge error: {e}")
        raise HTTPException(status_code=500, detail="Merge failed")
```

### Day 5: Archive & Settings Services

**Step 1: Create ArchiveService**

Create `backend/services/archive_service.py` - move archive logic.

**Step 2: Create SettingsService**

Create `backend/services/settings_service.py` - move settings logic.

**Step 3: Update all endpoints**

```python
from services.archive_service import ArchiveService
from services.settings_service import SettingsService

archive_service = ArchiveService(config, db)
settings_service = SettingsService(db)

# Update all endpoints to use services
```

**Step 4: Full test**

```bash
# Test complete flow
curl /api/sources/list
curl /api/channels/selected
curl /api/merge/current
curl /api/archives/list
curl /api/settings/get
```

---

## WEEK 3: Frontend Refactoring

### Day 1: Create Hooks Structure

**Step 1: Create hooks directory**

```bash
cd frontend/src
mkdir hooks
touch hooks/{useApi.js,useLocalStorage.js,useTheme.js}
```

**Step 2: Implement hooks**

Using code from frontend_refactor artifact, create:
- `hooks/useApi.js` - API wrapper
- `hooks/useLocalStorage.js` - Persistent state
- `hooks/useTheme.js` - Theme toggle

**Step 3: Test hooks**

```bash
# Verify they can be imported
npm start
# Open browser console for errors
```

### Day 2: Create Components

**Step 1: Create components directory**

```bash
mkdir components
touch components/{Navbar.js,LoadingSpinner.js,Terminal.js,ProgressBar.js,DualListSelector.js,ErrorBoundary.js}
```

**Step 2: Implement components**

Using code from frontend_refactor artifact, create all components.

**Step 3: Test imports**

```bash
npm start
# Check for import errors in console
```

### Day 3-4: Create Pages

**Step 1: Create pages directory**

```bash
mkdir pages
touch pages/{SourcesPage.js,ChannelsPage.js,MergePage.js}
```

**Step 2: Implement pages**

Using code from frontend_refactor artifact, create all page components.

**Step 3: Extract component logic to pages**

For each page, move the old App.js logic:
- State management
- API calls
- Event handlers

### Day 5: Update Main App

**Step 1: Replace App.js**

Replace entire App.js with refactored version from frontend_refactor artifact.

**Step 2: Test all pages**

```bash
npm start
# Click through each tab
# Verify functionality works
```

**Step 3: Fix any issues**

Debug any remaining issues:
- Import errors
- State management
- API communication

---

## WEEK 4: Testing & Documentation

### Day 1-2: Backend Tests

**Step 1: Create test structure**

```bash
cd backend
mkdir -p tests/{unit,integration,fixtures}
touch tests/{__init__.py,conftest.py}
```

**Step 2: Install test dependencies**

```bash
pip install pytest pytest-asyncio pytest-cov httpx
```

**Step 3: Create database fixture**

Create `tests/conftest.py`:

```python
import pytest
import tempfile
from pathlib import Path
from database import Database

@pytest.fixture
def temp_db():
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as f:
        db_path = Path(f.name)
    db = Database(db_path)
    db.initialize()
    yield db
    db.close()
    db_path.unlink()
```

**Step 4: Write service tests**

Create `tests/unit/test_services.py` using examples from testing_guide artifact.

**Step 5: Run tests**

```bash
pytest tests/unit/ -v
pytest tests/unit/ --cov=services --cov-report=html
```

### Day 3: Frontend Tests

**Step 1: Install test dependencies**

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Step 2: Create test files**

```bash
mkdir -p src/__tests__
touch src/__tests__/{App.test.js,components.test.js,hooks.test.js}
```

**Step 3: Write component tests**

Create tests using examples from testing_guide artifact.

**Step 4: Run tests**

```bash
npm test
npm test -- --coverage
```

### Day 4: Documentation

**Step 1: Create README.md**

```bash
cat > README.md << 'EOF'
# EPG Merge Application

## Overview
TV feed merger with channel filtering

## Quick Start
1. `sudo bash install/install.sh`
2. Visit http://localhost:9193

## Architecture
- Backend: FastAPI + SQLite
- Frontend: React 18
- Deployment: Systemd

## API
See [API_DOCS.md](docs/API_DOCS.md)

## Contributing
See [CONTRIBUTING.md](docs/CONTRIBUTING.md)
EOF
```

**Step 2: Create architecture guide**

```bash
cat > docs/ARCHITECTURE.md << 'EOF'
# Architecture

## Backend Structure
- **main.py**: FastAPI app & routing
- **config.py**: Configuration management
- **database.py**: Database abstraction
- **services/**: Business logic
- **utils/**: Utilities & helpers

## Frontend Structure
- **App.js**: Main component
- **hooks/**: Custom React hooks
- **components/**: Reusable components
- **pages/**: Page-level components

## Data Flow
UI → Hook/Component → API → Service → Database
EOF
```

**Step 3: Create API docs**

```bash
cat > docs/API_DOCS.md << 'EOF'
# API Documentation

## Health Check
GET /api/health
Response: {"status": "healthy", "version": "0.1.0"}

## Sources
GET /api/sources/list?timeframe=3&feed_type=iptv
POST /api/sources/select

## Channels
GET /api/channels/from-sources
GET /api/channels/selected
POST /api/channels/select

## Merge
POST /api/merge/execute
GET /api/merge/current

## Archives
GET /api/archives/list
GET /api/archives/download/{filename}

## Settings
GET /api/settings/get
POST /api/settings/set
EOF
```

### Day 5: Final Integration Testing

**Step 1: Test complete flow**

```bash
# Start backend
cd backend && source venv/bin/activate
python -m uvicorn main:app --port 9193

# In another terminal, start frontend
cd frontend
npm start
```

**Step 2: Manual testing**

1. Select sources → Select channels → Merge
2. Verify logs appear
3. Verify progress bar updates
4. Verify download works

**Step 3: Test all endpoints**

```bash
# Health
curl http://localhost:9193/api/health

# Sources
curl http://localhost:9193/api/sources/list

# Channels
curl http://localhost:9193/api/channels/selected

# Merge
curl -X POST http://localhost:9193/api/merge/execute \
  -H "Content-Type: application/json" \
  -d '{"sources":["test.xml.gz"],"channels":["ch1"]}'
```

**Step 4: Fix any issues**

Debug and fix any remaining issues found during integration testing.

---

## Deployment After Refactoring

### Update Installation

Modify `install/install.sh` to reflect new structure:

```bash
# In backend setup section
log_info "Creating service modules..."
mkdir -p "${APP_DIR}/backend/services"
mkdir -p "${APP_DIR}/backend/utils"

# Copy service files
cp backend/services/* "${APP_DIR}/backend/services/"
cp backend/utils/* "${APP_DIR}/backend/utils/"
```

### Build & Deploy

```bash
# Build frontend
bash scripts/build.sh

# Restart service
systemctl restart epg-merge

# Verify
curl http://localhost:9193/api/health
```

---

## Validation Checklist

**Backend:**
- [ ] All endpoints use services
- [ ] No duplicate logic
- [ ] All errors handled
- [ ] All functions logged
- [ ] Unit tests pass (>85%)
- [ ] Integration tests pass

**Frontend:**
- [ ] Hooks used for logic
- [ ] Components reusable
- [ ] Error boundaries in place
- [ ] No prop drilling
- [ ] Component tests pass (>75%)

**Quality:**
- [ ] No console errors
- [ ] No TypeScript warnings
- [ ] Code formatted (Black/Prettier)
- [ ] Documentation complete
- [ ] README updated
- [ ] Architecture documented

---

## Rollback Plan

If issues arise, rollback is simple:

```bash
# Restore from backup
bash scripts/restore.sh backup_20250101_120000

# Restart service
systemctl restart epg-merge

# Verify
curl http://localhost:9193/api/health
```

---

## Success Metrics

After refactoring, you should have:

✅ **50% smaller** monolithic files
✅ **85%+ code coverage** with tests
✅ **85%+ maintainability** score
✅ **100% type hints** in Python
✅ **Clear separation** of concerns
✅ **Comprehensive** documentation
✅ **Improved** developer experience

---

## Timeline

- **Week 1:** 8-12 hours
- **Week 2:** 12-16 hours
- **Week 3:** 12-16 hours
- **Week 4:** 8-12 hours

**Total: 40-56 hours over 4 weeks**

---

## Need Help?

Refer to:
- [Quality Handbook](QUALITY.md) for standards
- [Testing Guide](TESTING.md) for test examples
- [Architecture Guide](ARCHITECTURE.md) for structure questions