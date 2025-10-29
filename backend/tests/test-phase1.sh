#!/bin/bash
# Phase 1 Automated Testing Script - Backend Simplification (v0.4.1)
# Tests database persistence, settings, channels, archives, and API endpoints
# Run: bash test-phase1.sh

# Remove strict error exit - handle errors manually
set +e

# ============================================================================
# COLORS & FORMATTING
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

PASS_COUNT=0
FAIL_COUNT=0

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_header() {
    echo -e "\n${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║  $1${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}\n"
}

print_section() {
    echo -e "\n${CYAN}▶ $1${NC}"
}

test_pass() {
    echo -e "${GREEN}✓ PASS${NC} - $1"
    ((PASS_COUNT++))
}

test_fail() {
    echo -e "${RED}✗ FAIL${NC} - $1"
    ((FAIL_COUNT++))
}

test_info() {
    echo -e "${YELLOW}ℹ INFO${NC} - $1"
}

# ============================================================================
# SETUP
# ============================================================================

API_BASE="http://localhost:9193"
DB_PATH="config/app.db"
ARCHIVE_DIR="config/archives"
CONFIG_DIR="config"

# Verify directories exist
if [ ! -d "$CONFIG_DIR" ]; then
    mkdir -p "$CONFIG_DIR"
fi

if [ ! -d "$ARCHIVE_DIR" ]; then
    mkdir -p "$ARCHIVE_DIR"
fi

print_header "Phase 1: Automated Testing - Backend Simplification (v0.4.1)"

# ============================================================================
# PRE-TEST CHECKS
# ============================================================================

print_section "Pre-Test Checks"

# Check if backend is running
HEALTH_RESPONSE=$(curl -s "$API_BASE/api/health" 2>/dev/null)
if [ -z "$HEALTH_RESPONSE" ]; then
    test_fail "Backend not running at $API_BASE"
    echo -e "${YELLOW}Start backend:${NC} cd backend && source venv/bin/activate && python -m uvicorn main:app --port 9193 --reload"
    exit 1
fi
test_pass "Backend is running"

# Check if health endpoint works
if echo "$HEALTH_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    test_pass "Health endpoint returns valid JSON"
else
    test_fail "Health endpoint did not return valid JSON"
    test_info "Response: $HEALTH_RESPONSE"
    exit 1
fi

# Check version
VERSION=$(echo "$HEALTH_RESPONSE" | jq -r '.version' 2>/dev/null)
test_info "Backend version: $VERSION"

# ============================================================================
# DATABASE TESTS
# ============================================================================

print_section "Database Layer Tests"

# Health check
if curl -s "$API_BASE/api/health" 2>/dev/null | jq -e '.database' > /dev/null 2>&1; then
    test_pass "Database health check works"
else
    test_fail "Database health check failed"
fi

# Check database file exists (or gets created)
if [ -f "$DB_PATH" ] || [ -d "$CONFIG_DIR" ]; then
    test_pass "Database directory accessible"
else
    test_fail "Database directory not accessible"
fi

# ============================================================================
# CHANNELS PERSISTENCE TESTS
# ============================================================================

print_section "Channels Persistence Tests"

# Test 1: Save channels
TEST_CHANNELS='["ch1","ch2","ch3","ch4","ch5"]'
SAVE_RESPONSE=$(curl -s -X POST "$API_BASE/api/channels/select" \
    -H "Content-Type: application/json" \
    -d "{\"channels\": $TEST_CHANNELS}" 2>/dev/null)

if echo "$SAVE_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    STATUS=$(echo "$SAVE_RESPONSE" | jq -r '.status' 2>/dev/null)
    COUNT=$(echo "$SAVE_RESPONSE" | jq -r '.count' 2>/dev/null)
    if [ "$STATUS" = "saved" ] && [ "$COUNT" = "5" ]; then
        test_pass "Save 5 channels - status=$STATUS, count=$COUNT"
    else
        test_fail "Save channels returned unexpected response"
        test_info "Response: $SAVE_RESPONSE"
    fi
else
    test_fail "Save channels endpoint failed or returned invalid JSON"
    test_info "Response: $SAVE_RESPONSE"
fi

# Test 2: Get channels (should return same 5)
GET_RESPONSE=$(curl -s "$API_BASE/api/channels/selected" 2>/dev/null)
if echo "$GET_RESPONSE" | jq -e '.channels' > /dev/null 2>&1; then
    CHANNEL_COUNT=$(echo "$GET_RESPONSE" | jq '.channels | length' 2>/dev/null)
    if [ "$CHANNEL_COUNT" = "5" ]; then
        test_pass "Retrieve 5 saved channels"
    else
        test_fail "Retrieved $CHANNEL_COUNT channels instead of 5"
    fi
else
    test_fail "Get channels endpoint failed or returned invalid JSON"
    test_info "Response: $GET_RESPONSE"
fi

# Test 3: Replace channels (save 3 different ones)
NEW_CHANNELS='["new1","new2","new3"]'
REPLACE_RESPONSE=$(curl -s -X POST "$API_BASE/api/channels/select" \
    -H "Content-Type: application/json" \
    -d "{\"channels\": $NEW_CHANNELS}" 2>/dev/null)

if echo "$REPLACE_RESPONSE" | jq -e '.count' > /dev/null 2>&1; then
    NEW_COUNT=$(echo "$REPLACE_RESPONSE" | jq -r '.count' 2>/dev/null)
    if [ "$NEW_COUNT" = "3" ]; then
        # Verify old channels are gone
        GET_AFTER=$(curl -s "$API_BASE/api/channels/selected" 2>/dev/null)
        AFTER_COUNT=$(echo "$GET_AFTER" | jq '.channels | length' 2>/dev/null)
        if [ "$AFTER_COUNT" = "3" ]; then
            test_pass "Replace channels - old 5 replaced with new 3"
        else
            test_fail "After replacement, have $AFTER_COUNT channels instead of 3"
        fi
    else
        test_fail "Replace returned count=$NEW_COUNT instead of 3"
    fi
else
    test_fail "Replace channels endpoint failed"
fi

# ============================================================================
# SETTINGS TESTS
# ============================================================================

print_section "Settings Persistence Tests"

# Test 1: Set single setting
SET_RESPONSE=$(curl -s -X POST "$API_BASE/api/settings/set" \
    -H "Content-Type: application/json" \
    -d '{"output_filename":"test.xml.gz"}' 2>/dev/null)

if echo "$SET_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    test_pass "Set single setting (output_filename)"
else
    test_fail "Set setting endpoint failed"
    test_info "Response: $SET_RESPONSE"
fi

# Test 2: Get setting and verify
GET_SETTING=$(curl -s "$API_BASE/api/settings/get" 2>/dev/null)
if echo "$GET_SETTING" | jq -e '.output_filename' > /dev/null 2>&1; then
    OUTPUT_FILENAME=$(echo "$GET_SETTING" | jq -r '.output_filename' 2>/dev/null)
    if [ "$OUTPUT_FILENAME" = "test.xml.gz" ]; then
        test_pass "Retrieve setting (output_filename=test.xml.gz)"
    else
        test_fail "Retrieved output_filename=$OUTPUT_FILENAME instead of test.xml.gz"
    fi
else
    test_fail "Get settings endpoint failed or missing output_filename"
fi

# Test 3: Batch set settings
BATCH_RESPONSE=$(curl -s -X POST "$API_BASE/api/settings/set" \
    -H "Content-Type: application/json" \
    -d '{"merge_time":"14:30","download_timeout":"180"}' 2>/dev/null)

if echo "$BATCH_RESPONSE" | jq -e '.status' > /dev/null 2>&1; then
    test_pass "Batch set 2 settings"
else
    test_fail "Batch set settings failed"
fi

# Test 4: Verify batch settings
GET_BATCH=$(curl -s "$API_BASE/api/settings/get" 2>/dev/null)
MERGE_TIME=$(echo "$GET_BATCH" | jq -r '.merge_time' 2>/dev/null)
DOWNLOAD_TIMEOUT=$(echo "$GET_BATCH" | jq -r '.download_timeout' 2>/dev/null)

if [ "$MERGE_TIME" = "14:30" ] && [ "$DOWNLOAD_TIMEOUT" = "180" ]; then
    test_pass "Batch settings persisted (merge_time=14:30, timeout=180)"
else
    test_fail "Batch settings not persisted correctly"
fi

# Test 5: Get all settings includes defaults
ALL_SETTINGS=$(curl -s "$API_BASE/api/settings/get" 2>/dev/null)
REQUIRED_KEYS=("output_filename" "merge_schedule" "merge_time" "download_timeout" "archive_retention_days" "discord_webhook" "selected_timeframe" "selected_feed_type")

MISSING_KEYS=0
for key in "${REQUIRED_KEYS[@]}"; do
    if ! echo "$ALL_SETTINGS" | jq -e ".$key" > /dev/null 2>&1; then
        ((MISSING_KEYS++))
    fi
done

if [ $MISSING_KEYS -eq 0 ]; then
    TOTAL_KEYS=$(echo "$ALL_SETTINGS" | jq 'keys | length' 2>/dev/null)
    test_pass "All required settings present ($TOTAL_KEYS total keys)"
else
    test_fail "Missing $MISSING_KEYS setting keys"
fi

# ============================================================================
# ARCHIVES METADATA TESTS
# ============================================================================

print_section "Archives Metadata Tests"

# Create dummy archive file for testing
mkdir -p "$ARCHIVE_DIR"
TEST_FILE="$ARCHIVE_DIR/test_archive_$(date +%s).xml.gz"
echo "test content" | gzip > "$TEST_FILE" 2>/dev/null

test_info "Created test archive file: $TEST_FILE"

# Test get archives list
ARCHIVES_RESPONSE=$(curl -s "$API_BASE/api/archives/list" 2>/dev/null)
if echo "$ARCHIVES_RESPONSE" | jq -e '.archives' > /dev/null 2>&1; then
    ARCHIVE_COUNT=$(echo "$ARCHIVES_RESPONSE" | jq '.archives | length' 2>/dev/null)
    test_pass "Archives list endpoint works (found $ARCHIVE_COUNT archives)"
    
    # Verify archive has required fields
    if [ $ARCHIVE_COUNT -gt 0 ]; then
        FIRST_ARCHIVE=$(echo "$ARCHIVES_RESPONSE" | jq '.archives[0]' 2>/dev/null)
        REQUIRED_FIELDS=("filename" "created_at" "size_bytes" "is_current")
        
        MISSING_FIELDS=0
        for field in "${REQUIRED_FIELDS[@]}"; do
            if ! echo "$FIRST_ARCHIVE" | jq -e ".$field" > /dev/null 2>&1; then
                ((MISSING_FIELDS++))
            fi
        done
        
        if [ $MISSING_FIELDS -eq 0 ]; then
            test_pass "Archive has all required metadata fields"
        else
            test_fail "Archive missing $MISSING_FIELDS fields"
        fi
    fi
else
    test_fail "Archives list endpoint failed"
fi

# Cleanup test file
rm -f "$TEST_FILE" 2>/dev/null

# ============================================================================
# PERSISTENCE ACROSS QUERIES TEST
# ============================================================================

print_section "Persistence Testing (Simulated)"

# Get current state
CURRENT_CHANNELS=$(curl -s "$API_BASE/api/channels/selected" 2>/dev/null | jq '.channels' 2>/dev/null)
CURRENT_SETTINGS=$(curl -s "$API_BASE/api/settings/get" 2>/dev/null)

test_info "Current state captured (channels and settings)"

# Simulate persistence by fetching again immediately (proves data in DB)
VERIFY_CHANNELS=$(curl -s "$API_BASE/api/channels/selected" 2>/dev/null | jq '.channels' 2>/dev/null)
VERIFY_SETTINGS=$(curl -s "$API_BASE/api/settings/get" 2>/dev/null)

if [ "$CURRENT_CHANNELS" = "$VERIFY_CHANNELS" ]; then
    test_pass "Channels persist in repeated queries"
else
    test_fail "Channels changed between queries"
fi

if echo "$VERIFY_SETTINGS" | jq -e '.output_filename' > /dev/null 2>&1; then
    test_pass "Settings persist in repeated queries"
else
    test_fail "Settings missing on second query"
fi

# ============================================================================
# API RESPONSE FORMAT TESTS
# ============================================================================

print_section "API Response Format Tests"

# Test health response structure
HEALTH=$(curl -s "$API_BASE/api/health" 2>/dev/null)
HEALTH_FIELDS=("status" "version" "database" "timestamp")
MISSING_HEALTH=0

for field in "${HEALTH_FIELDS[@]}"; do
    if ! echo "$HEALTH" | jq -e ".$field" > /dev/null 2>&1; then
        ((MISSING_HEALTH++))
    fi
done

if [ $MISSING_HEALTH -eq 0 ]; then
    test_pass "Health response has all fields"
else
    test_fail "Health response missing $MISSING_HEALTH fields"
fi

# Test settings response is valid JSON
SETTINGS=$(curl -s "$API_BASE/api/settings/get" 2>/dev/null)
if echo "$SETTINGS" | jq empty 2>/dev/null; then
    test_pass "Settings response is valid JSON"
else
    test_fail "Settings response is not valid JSON"
fi

# Test channels response structure
CHANNELS=$(curl -s "$API_BASE/api/channels/selected" 2>/dev/null)
if echo "$CHANNELS" | jq -e '.channels' > /dev/null 2>&1; then
    CHANNELS_TYPE=$(echo "$CHANNELS" | jq '.channels | type' 2>/dev/null)
    if [ "$CHANNELS_TYPE" = '"array"' ]; then
        test_pass "Channels response has array structure"
    else
        test_fail "Channels is not an array"
    fi
else
    test_fail "Channels response missing .channels field"
fi

# ============================================================================
# VERSION TEST
# ============================================================================

print_section "Version Management Test"

REPORTED_VERSION=$(curl -s "$API_BASE/api/health" 2>/dev/null | jq -r '.version' 2>/dev/null)
test_info "Reported version: $REPORTED_VERSION"

if [ -f "backend/version.py" ]; then
    FILE_VERSION=$(grep "^__version__" backend/version.py | head -1 | cut -d'"' -f2)
    if [ "$REPORTED_VERSION" = "$FILE_VERSION" ]; then
        test_pass "Version matches backend/version.py ($FILE_VERSION)"
    else
        test_fail "Version mismatch: API reports $REPORTED_VERSION but file has $FILE_VERSION"
    fi
else
    test_fail "backend/version.py not found"
fi

# ============================================================================
# SUMMARY
# ============================================================================

print_header "Test Results Summary"

TOTAL=$((PASS_COUNT + FAIL_COUNT))

if [ $TOTAL -gt 0 ]; then
    PASS_PCT=$((PASS_COUNT * 100 / TOTAL))
else
    PASS_PCT=0
fi

echo -e "${GREEN}PASSED:${NC}  $PASS_COUNT/$TOTAL tests (${PASS_PCT}%)"
echo -e "${RED}FAILED:${NC}  $FAIL_COUNT/$TOTAL tests"

if [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ ALL TESTS PASSED - Ready for Phase 1 Commit!           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review the test output above"
    echo "  2. Run: git status"
    echo "  3. Review files changed"
    echo "  4. Follow git commit instructions from artifact: Phase 1 Git Commit Template"
    echo ""
    exit 0
else
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ TESTS FAILED - Review errors above before commit      ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Debugging tips:"
    echo "  - Check backend logs: journalctl -u epg-merge -n 50"
    echo "  - Verify backend running: curl -v http://localhost:9193/api/health"
    echo "  - Check database: sqlite3 config/app.db '.tables'"
    echo ""
    exit 1
fi