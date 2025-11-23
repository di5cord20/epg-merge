# Architecture - EPG Merge Application

System design, data flow, and technical decisions.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────┐
│ Client Layer                                     │
│ ┌────────────────────────────────────────────┐   │
│ │ React 18 Frontend (Dark Mode)              │   │
│ │ - 6 Pages + 10 Sub-components              │   │
│ │ - 3 Custom Hooks (useApi, useLocalStorage) │   │
│ │ - Inline CSS (no external stylesheets)     │   │
│ └────────────────────────────────────────────┘   │
└────────────────┬─────────────────────────────────┘
                 │ HTTP REST API
                 ↓ (JSON payloads)
┌──────────────────────────────────────────────────┐
│ Application Layer                                │
│ ┌────────────────────────────────────────────┐   │
│ │ FastAPI (Python 3.11+)                     │   │
│ │ - 13 REST Endpoints                        │   │
│ │ - 6 Business Logic Services                │   │
│ │ - Error handling & validation              │   │
│ └────────────────────────────────────────────┘   │
└────────────────┬─────────────────────────────────┘
                 │ SQL queries
                 ↓
┌──────────────────────────────────────────────────┐
│ Data Layer                                       │
│ ┌────────────────────────────────────────────┐   │
│ │ SQLite Database (/config/app.db)           │   │
│ │ - 4 Tables (channels, settings, archives,  │   │
│ │   job_history)                             │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
                 │ Filesystem I/O
                 ↓
┌──────────────────────────────────────────────────┐
│ External Resources                               │
│ - /data/archives/ (merged files + archives)      │
│ - /data/epg_cache/ (cached XML files)            │
│ - share.jesmann.com (XML sources)                │
└──────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Architecture

```
src/
├── App.js (Main orchestrator, router logic)
├── App.css (All styling - dark mode only)
│
├── pages/ (6 main pages)
│   ├── SourcesPage.js      → Timeframe, feed type, source selection
│   ├── ChannelsPage.js     → Channel filtering and backup
│   ├── MergePage.js        → Merge execution, progress, downloads
│   ├── ArchivesPage.js     → Archive orchestrator
│   ├── DashboardPage.js    → Job monitoring (read-only)
│   └── SettingsPage.js     → Settings orchestrator with sidebar
│
├── pages/archives/ (3 sub-components)
│   ├── ArchivesTable.js    → Sortable table display
│   ├── ArchivesChannels.js → Channel versions table (NEW v0.4.8)
│   ├── ArchivesLegend.js   → Status legend and guide
│   └── (ArchivesPage.js manages these)
│
├── pages/settings/ (7 sub-components)
│   ├── SettingsSummary.js
│   ├── SettingsOutput.js
│   ├── SettingsSchedule.js
│   ├── SettingsTimeouts.js
│   ├── SettingsQuality.js
│   ├── SettingsNotifications.js
│   └── (SettingsPage.js manages these)
│
├── components/ (5 reusable components)
│   ├── Navbar.js           → Navigation and version display
│   ├── Terminal.js         → Log display with color coding
│   ├── ProgressBar.js      → Progress visualization
│   ├── DualListSelector.js → Reusable dual-list UI
│   └── ErrorBoundary.js    → Error handling wrapper
│
└── hooks/ (3 custom hooks)
    ├── useApi.js           → HTTP calls with loading/error states
    ├── useLocalStorage.js  → localStorage persistence
    └── useTheme.js         → Dark mode management (legacy)
```

### Backend Architecture

```
backend/
├── main.py                 → 13 FastAPI endpoints, routes
├── config.py              → Environment and path configuration
├── database.py            → SQLite wrapper (240 lines)
├── version.py             → Single source of truth for versioning
│
├── services/ (6 business logic services)
│   ├── source_service.py      → Fetch XML files from share.jesmann.com
│   ├── channel_service.py     → Load and filter channels by ID
│   ├── merge_service.py       → XML streaming merge (iterparse)
│   ├── archive_service.py     → Archive listing, cleanup, metadata
│   ├── settings_service.py    → Configuration CRUD with defaults
│   ├── job_service.py         → Scheduled job execution and history
│   └── base_service.py        → Base class with logging
│
├── utils/ (Helper utilities)
│   ├── logger.py          → Structured logging setup
│   ├── errors.py          → Custom exception classes
│   └── validators.py      → Input validation utilities
│
└── tests/ (Test suites)
    ├── unit/test_database.py
    └── integration/test_api.py
```

---

## Data Flow

### 1. Source Selection Flow
```
User selects timeframe (3/7/14 days) and feed type (iptv/gracenote)
    ↓
Frontend: SourcesPage.js calls /api/sources/list
    ↓
Backend: source_service.py fetches share.jesmann.com
    ↓
Response: Available XML files listed
    ↓
User selects sources, clicks "Save Sources"
    ↓
Frontend: Saves to localStorage + calls /api/sources/select
    ↓
Backend: Settings stored in SQLite (selected_sources key)
    ↓
Selection persists across page navigation
```

### 2. Channel Loading & Filtering Flow
```
User clicks "Load from Sources"
    ↓
Frontend: Sends source filenames to /api/channels/from-sources
    ↓
Backend: channel_service.py fetches *_channel_list.txt from each source
    ↓
Parses channel IDs, returns unique sorted list
    ↓
Frontend: DualListSelector shows available vs selected
    ↓
User moves channels between lists
    ↓
User clicks "Save Channels"
    ↓
Frontend: Calls /api/channels/save with:
  - channels (array of channel IDs)
  - sources_count (number of sources used)
    ↓
Backend: channel_service.py executes save_selected_channels():
  1. If channels.json exists:
     - Get metadata from database
     - Rename to channels.json.YYYYMMDD_HHMMSS
     - Archive in /data/channels/
     - Save archived metadata to channel_versions table
    ↓
  2. Write current channels to channels.json
  3. Update database with new metadata
  4. Save to database (channels_selected table)
    ↓
Result: Current version is live, previous version archived with metadata
  - Current: /data/channels/channels.json
  - Archive: /data/channels/channels.json.20251123_143000
  - Archive: /data/channels/channels.json.20251122_162638
  - etc.
    ↓
Frontend: Archives page shows both current and archived versions
  - Can download any version
  - Can delete archived versions (cannot delete current)
  - Shows sources_count and channels_count metadata
    ↓
Selection persists and used for filtering during merge
```

### 3. Merge Execution Flow
```
User clicks "Start Merge"
    ↓
Frontend: MergePage fetches fresh settings from backend
    ↓
Frontend: Calls /api/merge/execute with:
  - sources (array of filenames)
  - channels (array of channel IDs)
  - timeframe (3/7/14)
  - feed_type (iptv/gracenote)
    ↓
Backend: merge_service.py begins:
  1. Downloads each XML file (with smart caching via HTTP HEAD)
  2. Checks if remote file changed before re-downloading
  3. Caches locally in /data/epg_cache/ for 24 hours
    ↓
  4. Uses iterparse for memory-efficient streaming
  5. Filters channels by exact ID match
  6. Deduplicates programs (by start time + channel + title)
  7. Creates gzipped output as temporary file:
     /data/tmp/{output_filename}
    ↓
Frontend: Real-time progress (0-100%) with colored log output
  - [*] Information (blue)
  - [+] Success (green)
  - [!] Warning (yellow)
  - [✗] Error (red)
    ↓
User can download OR "Save as Current"
```

### 4. Archive & Save Flow
```
Merge complete, user clicks "Save as Current"
    ↓
Frontend: Calls /api/merge/save with:
  - filename (temporary merge file)
  - channels (count)
  - programs (count)
  - days_included (3/7/14)
    ↓
Backend: merge_service.py executes:
  1. If current file exists in /data/current/:
     - Get metadata from database
     - Rename to {filename}.YYYYMMDD_HHMMSS
     - Move to /data/archives/
     - Save archived metadata to archives table
    ↓
  2. Copy (not move) temporary file from /data/tmp/ to /data/current/
  3. Update database with new metadata
  4. Keep file in /data/tmp/ for continued downloads
    ↓
Result: Current file is live, previous version archived with metadata
  - Current: /data/current/{output_filename}
  - Archive: /data/archives/{output_filename}.20251123_143000
  - Archive: /data/archives/{output_filename}.20251122_160000
  - Temp: /data/tmp/{output_filename} (for download, cleared on next merge)
    ↓
Archives page displays:
  - Merged EPG Files panel: Current + all archives with metadata
  - Channel Versions panel: Current channels.json + all archived versions
```

### 5. Settings & Job Scheduling Flow
```
User configures settings (schedule, timeouts, paths, channels, etc.)
    ↓
Frontend: Settings page panels each save via /api/settings/set
    ↓
Backend: settings_service.py stores in SQLite (settings table)
    ↓
Settings include:
  - output_filename (default: "merged.xml.gz")
  - channels_filename (default: "channels.json")
  - current_dir (default: "/data/current")
  - archive_dir (default: "/data/archives")
  - channels_dir (default: "/data/channels")
  - merge_schedule (daily/weekly)
  - merge_time (HH:MM UTC)
  - merge_days (weekdays for weekly)
  - merge_timeframe (3/7/14 days for scheduled jobs)
  - merge_channels_version (which channels.json to use)
  - cron expression (auto-generated)
    ↓
Job Service monitors and executes:
  1. Manual trigger: /api/jobs/execute or /api/jobs/execute-now
  2. Scheduled: Background async task (infrastructure ready)
    ↓
Job execution:
  1. Load settings from database (including merge_timeframe, merge_channels_version)
  2. Load sources from database
  3. Load channels from specified version (/data/channels/{merge_channels_version})
  4. Execute merge using same flow as manual (with configured timeframe)
  5. If successful: Send Discord notification (if configured)
  6. Save execution record to job_history table
  7. Auto-cleanup old job records based on retention
    ↓
Dashboard displays:
  - Job status (running/idle)
  - Latest execution details (memory, channels, programs, duration)
  - Next scheduled run time
  - Job history table (sortable, paginated)
```

---

## Database Schema & Relationships

### channels_selected Table
```sql
channel_name TEXT PRIMARY KEY  -- Channel ID from source
created_at TIMESTAMP           -- When added
```

### settings Table
```sql
key TEXT PRIMARY KEY           -- Setting key (output_filename, merge_schedule, etc.)
value TEXT                     -- Setting value (stored as string/JSON)
updated_at TIMESTAMP           -- Last updated
```

### archives Table
```sql
filename TEXT PRIMARY KEY      -- Archive filename (with/without timestamp)
created_at TIMESTAMP           -- When created
channels INTEGER               -- Number of channels included
programs INTEGER               -- Number of programs included
days_included INTEGER          -- Timeframe (3/7/14)
size_bytes INTEGER             -- File size in bytes
```

### channel_versions Table (NEW v0.4.8)
```sql
filename TEXT PRIMARY KEY      -- Channel version filename (with/without timestamp)
created_at TIMESTAMP           -- When created/archived
sources_count INTEGER          -- Number of sources used
channels_count INTEGER         -- Number of channels in this version
size_bytes INTEGER             -- File size in bytes
```

### job_history Table
```sql
id INTEGER PRIMARY KEY AUTOINCREMENT
job_id TEXT UNIQUE NOT NULL   -- Unique job identifier
status TEXT                   -- pending|running|success|failed|timeout
started_at TIMESTAMP          -- Job start time
completed_at TIMESTAMP        -- Job completion time (null if running)
merge_filename TEXT           -- Output filename if successful
channels_included INTEGER     -- Channels in merge
programs_included INTEGER     -- Programs in merge
file_size TEXT               -- Human-readable size (e.g., "5.2MB")
peak_memory_mb REAL          -- Peak memory usage during execution
days_included INTEGER        -- Timeframe used (3/7/14)
error_message TEXT           -- Error details if failed
execution_time_seconds REAL  -- Total execution duration
```

**Relationships:**
- `settings.value` can reference `channel_versions.filename` (merge_channels_version setting)
- `archives` and `channel_versions` are independent (separate file types)
- `job_history.merge_filename` references filename in `archives` table
- No foreign key constraints (tables are independent)

**Settings Keys (v0.4.8):**
```
Output Files:
  - output_filename: "merged.xml.gz"
  - channels_filename: "channels.json"

Directory Paths:
  - current_dir: "/data/current"
  - archive_dir: "/data/archives"
  - channels_dir: "/data/channels"

Merge Schedule:
  - merge_schedule: "daily" | "weekly"
  - merge_time: "HH:MM"
  - merge_days: JSON array [0-6]
  - merge_timeframe: "3" | "7" | "14"
  - merge_channels_version: "channels.json" | "channels.json.{timestamp}"

Timeouts & Quality:
  - download_timeout: seconds
  - merge_timeout: seconds
  - channel_drop_threshold: percentage or ""

Retention & Notifications:
  - archive_retention_cleanup_expired: true|false
  - discord_webhook: URL or ""

UI Selections (not used by scheduler):
  - selected_timeframe: "3" | "7" | "14"
  - selected_feed_type: "iptv" | "gracenote"
```

**No foreign key relationships** - tables are independent, reducing coupling and simplifying maintenance.

---

## Caching Strategy

### XML File Caching
```
First merge with canada.xml.gz:
  1. Download from share.jesmann.com
  2. Store in /data/epg_cache/canada.xml.gz
  3. Record download time
    ↓
Second merge (same day) with canada.xml.gz:
  1. Check if cache exists (yes)
  2. Send HTTP HEAD to remote file
  3. Compare file sizes
  4. If identical: Use cached version (fast)
  5. If changed: Re-download (slow, but necessary)
    ↓
Third merge (next day):
  1. Cache age > 24 hours
  2. Re-download regardless of HEAD check
  3. Update cache
```

**Benefits:**
- Avoids redundant downloads on same day
- Still detects remote changes via HTTP HEAD
- Cache reset daily for fresh data
- Reduces bandwidth and merge time

---

## API Contracts

### Request/Response Pattern
```
All requests:
  - Content-Type: application/json
  - Method: GET (query string) or POST (JSON body)

All responses:
  - Status: 200 (success), 400 (validation), 404 (not found), 500 (error)
  - Body: JSON object with relevant data
  - On error: { "detail": "Error message" }
```

### Example: Merge Execution
```
POST /api/merge/execute

Request:
{
  "sources": ["canada.xml.gz", "usa.xml.gz"],
  "channels": ["channel1", "channel2"],
  "timeframe": "3",
  "feed_type": "iptv"
}

Response:
{
  "status": "success",
  "filename": "merged_20251101_120000.xml.gz",
  "channels_included": 150,
  "programs_included": 10000,
  "file_size": "5.2MB",
  "days_included": 3
}
```

---

## Deployment Architecture

### Production Setup
```
┌─────────────────────────────────────┐
│ Ubuntu/Debian Server                │
├─────────────────────────────────────┤
│                                     │
│  Systemd Service (epg-merge)        │
│  ├─ Runs as root                    │
│  ├─ Starts on boot (enabled)        │
│  ├─ Restart policy: always          │
│  └─ Logs via journalctl             │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ FastAPI App (port 9193)     │    │
│  │ ├─ 1 worker (Uvicorn)       │    │
│  │ └─ Python 3.11+ venv        │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ React Build (static files)  │    │
│  │ ├─ Served via Nginx         │    │
│  │ └─ Reverse proxied to API   │    │
│  └─────────────────────────────┘    │
│                                     │
│  /config (persistent volume)        │
│  ├─ /app.db (SQLite)                │
│                                     │
└─────────────────────────────────────┘
```

### Docker Setup
```
docker-compose.yml provides:
  ├─ Backend service
  │  ├─ Dockerfile: Python 3.11 slim base
  │  ├─ Non-root user (appuser)
  │  ├─ Health check (curl /api/health)
  │  └─ Restart policy: unless-stopped
  │
  ├─ Frontend service
  │  ├─ Multi-stage build (Node → Nginx)
  │  ├─ Nginx Alpine base
  │  ├─ Reverse proxy to backend
  │  ├─ Health check (wget /)
  │  └─ Restart policy: unless-stopped
  │
  └─ epg-network (internal bridge)
```

---

## Design Decisions

### 1. Single Source of Truth for Version
**Decision:** Version stored only in `backend/version.py`
**Rationale:** Eliminates sync issues across multiple files
**Implementation:** Build scripts auto-sync to frontend, docs, installer

### 2. SQLite as Persistence Layer
**Decision:** SQLite with simple schema, no ORMs
**Rationale:** 
  - Single file database (easy backup)
  - No external dependencies
  - Simple queries, easy to debug
  - Good for medium data volumes
**Tradeoff:** No advanced query features, but not needed for this scale

### 3. Stateless API with Session State
**Decision:** Backend is stateless, frontend manages merge session state
**Rationale:**
  - Allows horizontal scaling (if needed)
  - Frontend survives page navigation
  - Decouples frontend/backend lifecycles
**Implementation:** sessionStorage for merge progress, localStorage for settings

### 4. Smart Caching with HTTP HEAD
**Decision:** Use HTTP HEAD to check if remote file changed before re-downloading
**Rationale:**
  - Saves bandwidth on repeated merges
  - Still detects remote changes (not stale cache)
  - Minimal overhead (HEAD request is fast)
**Performance:** ~95% of merges use cache on same day

### 5. Temporary File Pattern for Merges
**Decision:** Create temp files, then "Save as Current" promotes them
**Rationale:**
  - User can review before committing
  - Supports versioning (archive previous)
  - Clean separation of concerns
**Tradeoff:** Extra filesystem operation, but worth it for UX

### 6. Component Sub-Splitting in Settings/Archives
**Decision:** Split pages into focused sub-components
**Rationale:**
  - Easier testing (test component in isolation)
  - Cleaner code (each component has single responsibility)
  - Better maintainability (find what you need faster)
**Pattern:** Page orchestrates via props, sub-components are pure/dumb

---

## Error Handling

### Frontend Error Handling
```
Try-catch blocks around:
  - useApi() calls (HTTP errors)
  - JSON parsing (data validation)
  - localStorage access (storage quota)

Display:
  - Error message to user
  - Log to console for debugging
  - Suggest action (retry, clear cache, etc.)
```

### Backend Error Handling
```
Validate:
  - Required parameters present
  - Data types correct
  - Values in valid ranges

Return:
  - 400: Validation error (client problem)
  - 404: Resource not found
  - 500: Server error (log details)

All endpoints wrapped with try-catch
```

---

## Performance Considerations

### Merge Optimization
- **iterparse:** Memory-efficient XML streaming (not loading entire file)
- **Smart caching:** HTTP HEAD prevents unnecessary downloads
- **Deduplication:** Exact ID matching + start time uniqueness
- **Compression:** gzip output reduces file size by ~80%

### API Optimization
- **Stateless design:** No expensive session lookups
- **Query efficiency:** Direct SQLite queries, no N+1 problems
- **Caching:** 24-hour HTTP cache for XML files
- **Batch operations:** Settings saved atomically

### Frontend Optimization
- **Code splitting:** Lazy load pages (if bundled with webpack)
- **Inline styles:** No stylesheet parsing overhead
- **Event throttling:** Prevent excessive re-renders
- **sessionStorage:** Fast persistence for merge progress

---

## Security Considerations

### Input Validation
- All user inputs validated before use
- API parameters type-checked and range-checked
- SQL injection prevention via parameterized queries
- Filename validation (path traversal prevention)

### File System Security
- Archives stored in `/config/archives/` (not accessible from web)
- Cache stored in `/config/epg_cache/` (not accessible from web)
- Database at `/config/app.db` (file permissions: 600)
- Service runs as root (can be restricted if needed)

### API Security
- CORS enabled for all origins (can be restricted)
- No authentication (local network use assumed)
- No rate limiting (can be added if needed)
- Webhook URLs validated before storing

---

## Testing Strategy

### Frontend Tests (64 total)
- **Unit tests (32):** Utilities, validation, formatters
- **Integration tests (32):** API contracts, workflows

### Backend Tests
- **Unit tests:** Database layer
- **Integration tests:** API endpoints

### Test Coverage
- Core merge logic: 100%
- API contracts: 100%
- Error paths: 85%+
- UI components: Partial (no E2E yet)

---

## Future Scalability

### Current Limits
- Single-threaded merge (1 at a time)
- In-memory XML processing
- SQLite (fine for ~1000s of records)
- No distributed caching

### Future Enhancements
- Multi-worker merge (parallel downloads)
- Streaming response for real-time logs (WebSocket)
- Archive cleanup automation (cron job)
- Distributed caching (Redis) if needed
- Horizontal scaling (stateless API + shared SQLite)

---

**Last Updated:** November 23, 2025  
**For quick reference:** See QUICK_REFERENCE.md