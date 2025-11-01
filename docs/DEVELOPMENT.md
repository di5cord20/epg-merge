# Development Guide

Set up your development environment and contribute to EPG Merge.

---

## Prerequisites

Install these on your development machine:

- **Python 3.11+** - `python --version`
- **Node 18+** - `node --version`
- **npm 9+** - `npm --version`
- **Git** - `git --version`
- **Docker & Docker Compose** (optional, for isolated env)

---

## Local Setup

### Frontend Setup

```bash
cd frontend
npm install          # Install dependencies
npm start            # Dev server on http://localhost:3000
npm run build        # Production build to build/
npm test             # Run tests
npm test -- --coverage  # With coverage report
npm run lint         # ESLint (warnings only)
npm run format       # Prettier formatting
```

### Backend Setup

```bash
cd backend
python -m venv venv  # Create virtual environment
source venv/bin/activate  # Activate (Windows: venv\Scripts\activate)
pip install -r requirements.txt  # Install dependencies
python main.py       # Run on http://localhost:8000
```

### Full Stack (Docker)

```bash
cd /path/to/epg-merge
sudo docker-compose build
sudo docker-compose up -d
curl http://localhost:9193/api/health  # Verify running
```

---

## Testing

### Frontend Tests

**Run all tests:**
```bash
cd frontend
npm test
```

**Run specific test file:**
```bash
npm test -- frontend.test.js
npm test -- integration.test.js
```

**Generate coverage:**
```bash
npm test -- --coverage
open coverage/index.html  # View coverage report
```

**Test patterns:**
- Unit tests: Components, hooks, utilities
- Integration tests: API contracts, workflows
- Snapshot tests: UI consistency checks

**Current status:** 32/32 tests passing ✅

### Backend Tests

**Run all tests:**
```bash
cd backend
pytest tests/ -v
```

**Run specific test:**
```bash
pytest tests/unit/test_database.py -v
pytest tests/integration/test_api.py::test_merge_execute -v
```

**Generate coverage:**
```bash
pytest tests/ --cov=services --cov-report=html
open htmlcov/index.html
```

**Test structure:**
- `tests/unit/` - Database, services, utilities
- `tests/integration/` - API endpoints, workflows
- `tests/fixtures/` - Test data and mocks

**Current status:** 32/32 tests passing ✅

---

## Code Style

### Frontend (JavaScript/React)

**Style rules:**
- Use functional components (hooks)
- Prop validation with PropTypes
- Inline CSS (dark mode only)
- Component files: PascalCase
- Utility files: camelCase
- Max line length: 100 characters

**Format code:**
```bash
npm run format  # Prettier
npm run lint    # ESLint (fix auto-fixable)
```

**Example component:**
```javascript
import React, { useState } from 'react';
import PropTypes from 'prop-types';

const MyComponent = ({ title, onChange }) => {
  const [value, setValue] = useState('');

  const handleClick = () => {
    onChange(value);
  };

  return (
    <div style={{ padding: '10px' }}>
      <h2>{title}</h2>
      <button onClick={handleClick}>Submit</button>
    </div>
  );
};

MyComponent.propTypes = {
  title: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

export default MyComponent;
```

### Backend (Python)

**Style rules:**
- PEP 8 compliance
- Type hints where practical
- Docstrings for all functions/classes
- Max line length: 100 characters
- 4-space indentation

**Format code:**
```bash
black backend/       # Auto-formatter
flake8 backend/      # Linter
```

**Example service:**
```python
"""Archive service for managing merged file versions."""

import os
from datetime import datetime
from typing import Dict, Optional

class ArchiveService:
    """Manages archive operations and metadata."""

    def __init__(self, db_path: str):
        """Initialize archive service.
        
        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path

    def list_archives(self, limit: int = 50) -> Dict:
        """Get list of all archives.
        
        Args:
            limit: Maximum number of results
            
        Returns:
            Dictionary with archives list and metadata
        """
        # Implementation here
        pass
```

---

## Project Structure

```
epg-merge/
├── frontend/                    # React 18 application
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── __tests__/          # Test files
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   ├── public/                 # Static assets
│   ├── package.json            # Dependencies
│   └── Dockerfile              # Frontend Docker image
│
├── backend/                     # FastAPI application
│   ├── services/               # Business logic
│   ├── main.py                 # FastAPI app and routes
│   ├── database.py             # SQLite wrapper
│   ├── config.py               # Configuration
│   ├── tests/                  # Test files
│   │   ├── unit/
│   │   └── integration/
│   ├── requirements.txt        # Dependencies
│   └── Dockerfile              # Backend Docker image
│
├── docs/                       # Documentation
├── scripts/                    # Utility scripts
├── install/                    # Installation scripts
└── docker-compose.yml          # Docker setup
```

---

## Adding a Feature

### Step 1: Create Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Step 2: Frontend Changes

```bash
cd frontend

# Create component
cat > src/components/NewComponent.js << 'EOF'
import React from 'react';

const NewComponent = () => {
  return <div>New Feature</div>;
};

export default NewComponent;
EOF

# Add to test
cat > src/__tests__/NewComponent.test.js << 'EOF'
import NewComponent from '../components/NewComponent';

describe('NewComponent', () => {
  test('renders', () => {
    // Test implementation
  });
});
EOF

# Test
npm test

# Build
npm run build
```

### Step 3: Backend Changes

```bash
cd backend

# Add service method
# Edit: services/your_service.py

# Add API endpoint
# Edit: main.py

# Add tests
# Edit: tests/integration/test_api.py

# Test
pytest tests/ -v
```

### Step 4: Commit Changes

```bash
git add .
git commit -m "Add: Your feature description

- Feature detail 1
- Feature detail 2"
```

### Step 5: Test Everything

```bash
cd frontend && npm test && npm run build
cd backend && pytest tests/ -v
docker-compose build && docker-compose up -d
curl http://localhost:9193/api/health
```

### Step 6: Push & Create PR

```bash
git push origin feature/your-feature-name
# Create pull request on GitHub
```

---

## Common Development Tasks

### Add a New API Endpoint

1. **Create service method** (`backend/services/service_name.py`)
2. **Add route** (`backend/main.py`)
3. **Add test** (`backend/tests/integration/test_api.py`)
4. **Document** (`docs/API-SPEC.md`)

Example:

```python
# backend/main.py
@app.post("/api/custom/action")
async def custom_action(request: dict):
    """Custom action endpoint."""
    result = service.do_action(request)
    return {"success": True, "data": result}
```

### Add a New UI Component

1. **Create component** (`frontend/src/components/`)
2. **Add tests** (`frontend/src/__tests__/`)
3. **Use in page** (e.g., `frontend/src/pages/SomePage.js`)
4. **Test locally** (`npm start`)

### Modify Database Schema

1. **Update schema** (`backend/database.py`)
2. **Create migration** (add migration script if needed)
3. **Update service** (any service using the table)
4. **Add tests** (verify schema changes work)
5. **Update docs** (`docs/API-SPEC.md` if API affected)

### Run Full Test Suite

```bash
# Frontend
cd frontend && npm test && npm run build

# Backend
cd backend && pytest tests/ -v --cov=services

# Docker (optional, full integration)
cd .. && docker-compose build && docker-compose up -d
curl http://localhost:9193/api/health
```

---

## Debugging

### Frontend

```bash
# Development server with verbose output
npm start -- --verbose

# In browser:
# 1. Open DevTools (F12)
# 2. Check Console tab for errors
# 3. Check Network tab for API calls
# 4. Use React DevTools extension
# 5. Use Redux DevTools if using Redux
```

### Backend

```bash
# Run with debug output
python -m pdb main.py

# Or add debugging to code
import pdb; pdb.set_trace()  # Breakpoint

# View logs
python main.py 2>&1 | grep -i error

# Test specific endpoint
curl -v http://localhost:8000/api/endpoint
```

### Database

```bash
# Query database directly
sqlite3 backend/config/app.db

# Inside sqlite3:
sqlite> SELECT * FROM settings;
sqlite> SELECT * FROM archives;
.schema               # View all tables
.quit                 # Exit
```

---

## Git Workflow

### Commit Messages

Use clear, descriptive commit messages:

```bash
# Feature
git commit -m "Add: Feature name

- What was added
- Why it's needed"

# Bug fix
git commit -m "Fix: Bug description

- What was broken
- How it's fixed"

# Improvement
git commit -m "Improve: What was improved

- Before: old behavior
- After: new behavior"

# Refactor
git commit -m "Refactor: What was refactored

Changes:
- Change 1
- Change 2"

# Documentation
git commit -m "Docs: What was documented

- Topic 1
- Topic 2"
```

### Before Pushing

```bash
# Clean up commits
git rebase -i origin/main  # Interactive rebase

# Check what you're pushing
git log origin/main..HEAD
git diff origin/main

# Make sure tests pass
npm test && pytest tests/

# Push
git push origin feature/your-feature
```

---

## Performance Optimization

### Frontend

```bash
# Analyze bundle size
npm run build -- --profile

# Reduce bundle
# - Remove unused dependencies
# - Use React.memo for expensive components
# - Code splitting with React.lazy

# Monitor performance
# - Chrome DevTools → Performance tab
# - Lighthouse audit
```

### Backend

```bash
# Profile code
python -m cProfile -s cumtime main.py

# Memory profiling
pip install memory-profiler
python -m memory_profiler main.py

# Database optimization
# - Index frequently queried columns
# - Batch insert operations
# - Use pagination for large datasets
```

---

## Documentation

### Code Comments

```python
# Good: Explain WHY, not WHAT
def calculate_merge_time(files_count: int) -> float:
    """Estimate merge time based on file count.
    
    Empirically determined to be ~2 seconds per 1000 channels,
    with minimum 5 seconds overhead for setup/teardown.
    """
    return max(5, (files_count / 1000) * 2)

# Bad: States the obvious
def calculate_merge_time(files_count: int) -> float:
    # Calculate merge time
    return files_count * 2
```

### Docstrings

```python
def merge_files(sources: List[str], channels: List[str]) -> str:
    """Merge multiple EPG files with channel filtering.
    
    Args:
        sources: List of XML file paths to merge
        channels: List of channel IDs to include
        
    Returns:
        Path to merged output file
        
    Raises:
        FileNotFoundError: If source files don't exist
        ValueError: If channels list is empty
    """
    # Implementation
    pass
```

---

## Environment Variables

```bash
# Create .env file for local development
cat > .env << 'EOF'
ENVIRONMENT=development
DB_PATH=config/app.db
BACKEND_PORT=8000
FRONTEND_PORT=3000
DEBUG=true
EOF

# Load in shell
source .env
```

---

## Useful Commands Reference

```bash
# Frontend
npm install              # Install dependencies
npm start               # Dev server
npm test                # Run tests
npm run build           # Production build
npm run lint            # Check code style

# Backend
pip install -r requirements.txt    # Install dependencies
python main.py                    # Run server
pytest tests/                     # Run tests
black backend/                    # Format code
flake8 backend/                   # Check style

# Git
git status              # Check status
git diff                # See changes
git log --oneline       # View commits
git checkout -b feature/name  # Create branch
git commit -m "message" # Commit changes
git push origin branch  # Push to GitHub

# Docker
docker-compose build    # Build images
docker-compose up -d    # Start services
docker-compose logs -f  # View logs
docker-compose down     # Stop services
```

---

## Troubleshooting Development Issues

### Port Already in Use

```bash
# Find what's using port 3000
lsof -i :3000

# Find what's using port 8000
lsof -i :8000

# Kill the process (use PID from above)
kill -9 <PID>
```

### Tests Failing

```bash
# Clear test cache
npm test -- --clearCache
pytest --cache-clear

# Run single test
npm test -- MyComponent.test.js
pytest tests/unit/test_database.py
```

### Dependencies Issues

```bash
# Reinstall all dependencies
cd frontend && rm -rf node_modules package-lock.json
npm install

cd backend && rm -rf venv
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### Docker Issues

```bash
# Full rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

---

## Related Documentation

- [Quick Start](QUICK_START.md) - Getting running quickly
- [Deployment](DEPLOYMENT.md) - Production deployment
- [Architecture](ARCHITECTURE.md) - System design
- [API Spec](API-SPEC.md) - API documentation
- [Troubleshooting](TROUBLESHOOTING.md) - Common issues

---

**Ready to start?** See [Quick Start](QUICK_START.md) to get running, then come back here to learn development!