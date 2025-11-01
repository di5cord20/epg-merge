# EPG Merge - Developer Context

**Quick refresh file for AI conversations**

## Current State
- Version: 0.4.3
- Status: Production Ready
- Last Major Update: Archive retention cleanup (v0.4.2)
- Tests: 64/64 passing

## Architecture Quick View
┌─── Frontend (React) ───┐
│  - Pages: 6            │
│  - Components: 10      │
│  - Hooks: 3            │
└────────┬───────────────┘
│ REST API
┌────────▼───────────────┐
│  Backend (FastAPI)     │
│  - Services: 6         │
│  - Utils: 3            │
│  - Database: SQLite    │
└────────────────────────┘

## Recent Changes (v0.4.2)
- Settings: Split into 7 sub-components
- Archives: Added Days Left color indicators
- Archive Cleanup: Simplified to checkbox
- Dashboard: Removed Run Now button (monitoring only)

## Key Files for AI Context
1. **Backend Core**
   - `backend/main.py` - API routes (370 lines)
   - `backend/services/` - Business logic
   - `backend/database.py` - Persistence (240 lines)

2. **Frontend Core**
   - `frontend/src/App.js` - Main component
   - `frontend/src/pages/` - Page components
   - `frontend/src/hooks/` - Custom hooks

3. **Documentation**
   - `docs/ARCHITECTURE.md` - Full architecture
   - `docs/API-SPEC.md` - API contracts
   - `CHANGELOG.md` - Version history

## Common Dev Tasks
```bash
# Start local dev
cd backend && source venv/bin/activate && python -m uvicorn main:app --reload
cd frontend && npm start

# Run tests
cd frontend && npm test

# Build & deploy
sudo bash scripts/build.sh
```

## Critical Patterns
- **Version**: Single source in `backend/version.py`
- **State**: localStorage + SQLite (SQLite is source of truth)
- **Archive**: Temp file → Review → Save as Current → Previous archived
- **Settings**: 9 keys (output_filename, merge_schedule, etc.)

## Next Conversation Priorities
1. Implement scheduled merge execution (cron ready, not active)
2. Discord webhook notifications (field exists, not implemented)
3. Archive retention cleanup automation
4. Real-time log streaming (SSE/WebSocket)

---

For full details: [docs/README.md](docs/README.md)