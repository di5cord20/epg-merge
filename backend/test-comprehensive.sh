#!/bin/bash
# Comprehensive test script for Current vs Archive functionality
# Run this after each merge+save cycle

set -e

API_BASE="${1:-http://localhost:9193}"
ARCHIVE_DIR="config/archives"
DB_PATH="config/app.db"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Current vs Archive Functionality Test                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

test_number=${2:-1}
echo "TEST CYCLE #$test_number"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# STEP 1: CHECK DISK STATE
# ============================================================================
echo "[1/6] Disk State"
echo "─────────────────"
ls -lh "$ARCHIVE_DIR" 2>/dev/null || echo "No archives directory"
echo ""

FILE_COUNT=$(ls -1 "$ARCHIVE_DIR"/*.xml.gz* 2>/dev/null | wc -l)
echo "Total .xml.gz* files: $FILE_COUNT"

CURRENT_EXISTS=0
if [ -f "$ARCHIVE_DIR/merged.xml.gz" ]; then
  CURRENT_EXISTS=1
  CURRENT_SIZE=$(du -h "$ARCHIVE_DIR/merged.xml.gz" | cut -f1)
  echo "✓ Current file exists: merged.xml.gz ($CURRENT_SIZE)"
else
  echo "✗ ISSUE: No merged.xml.gz (current file missing!)"
fi

ARCHIVE_COUNT=$(ls -1 "$ARCHIVE_DIR"/merged.xml.gz.* 2>/dev/null | wc -l)
echo "Timestamped archives: $ARCHIVE_COUNT"
if [ $ARCHIVE_COUNT -gt 0 ]; then
  ls -1 "$ARCHIVE_DIR"/merged.xml.gz.* | sed 's/^/  • /'
fi
echo ""

# ============================================================================
# STEP 2: CHECK DATABASE STATE
# ============================================================================
echo "[2/6] Database State"
echo "────────────────────"

TOTAL_IN_DB=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM archives;" 2>/dev/null || echo "0")
echo "Total entries in database: $TOTAL_IN_DB"
echo ""

CURRENT_IN_DB=$(sqlite3 "$DB_PATH" "SELECT filename FROM archives WHERE filename = 'merged.xml.gz';" 2>/dev/null || echo "")
if [ -n "$CURRENT_IN_DB" ]; then
  echo "✓ Current in DB: merged.xml.gz"
  sqlite3 "$DB_PATH" "SELECT 'Channels: ' || channels || ', Programs: ' || programs || ', Size: ' || size_bytes FROM archives WHERE filename = 'merged.xml.gz';" 2>/dev/null || echo "  (no metadata)"
else
  echo "✗ ISSUE: merged.xml.gz NOT in database!"
fi
echo ""

echo "All archives in DB:"
sqlite3 "$DB_PATH" "SELECT '  ' || filename || ' (' || channels || 'ch, ' || programs || 'prog)' FROM archives ORDER BY created_at DESC;" 2>/dev/null | head -10 || echo "  (query failed)"
echo ""

# ============================================================================
# STEP 3: CHECK API RESPONSE
# ============================================================================
echo "[3/6] API Response (/api/archives/list)"
echo "────────────────────────────────────────"

API_RESPONSE=$(curl -s "$API_BASE/api/archives/list")

CURRENT_COUNT=$(echo "$API_RESPONSE" | grep -o '"is_current":true' | wc -l)
ARCHIVE_COUNT_API=$(echo "$API_RESPONSE" | grep -o '"is_current":false' | wc -l)

echo "API returned:"
echo "  • is_current: true = $CURRENT_COUNT (should be 1)"
echo "  • is_current: false = $ARCHIVE_COUNT_API (should match timestamped files)"
echo ""

if [ "$CURRENT_COUNT" -eq 1 ]; then
  echo "✓ PASS: Exactly one current file in API response"
else
  echo "✗ FAIL: Expected 1 current file, got $CURRENT_COUNT"
fi

if [ "$ARCHIVE_COUNT_API" -eq "$ARCHIVE_COUNT" ]; then
  echo "✓ PASS: Archive count matches"
else
  echo "✗ FAIL: API shows $ARCHIVE_COUNT_API archives, disk has $ARCHIVE_COUNT"
fi
echo ""

# ============================================================================
# STEP 4: CHECK FILE CONSISTENCY
# ============================================================================
echo "[4/6] File Consistency Check"
echo "────────────────────────────"

if [ $CURRENT_EXISTS -eq 1 ] && [ $CURRENT_COUNT -eq 1 ]; then
  echo "✓ PASS: Current file exists on disk AND marked in API"
elif [ $CURRENT_EXISTS -eq 0 ] && [ $CURRENT_COUNT -eq 0 ]; then
  echo "⚠ WARN: No current file (first run?)"
else
  echo "✗ FAIL: Current file mismatch!"
  echo "  Disk: $CURRENT_EXISTS | API: $CURRENT_COUNT"
fi

if [ $ARCHIVE_COUNT -eq "$ARCHIVE_COUNT_API" ]; then
  echo "✓ PASS: Archive files match API count"
else
  echo "✗ FAIL: Archive count mismatch"
fi
echo ""

# ============================================================================
# STEP 5: TEST SEQUENCE VALIDATION
# ============================================================================
echo "[5/6] Test Sequence State"
echo "─────────────────────────"

case $test_number in
  1)
    echo "Expected after Test 1 (Merge #1 → Save):"
    echo "  • Disk: 1 file (merged.xml.gz)"
    echo "  • DB: 1 entry (merged.xml.gz)"
    echo "  • API: 1 current, 0 archives"
    
    if [ $FILE_COUNT -eq 1 ] && [ "$CURRENT_EXISTS" -eq 1 ] && [ "$CURRENT_COUNT" -eq 1 ]; then
      echo "✓ PASS: Test 1 state correct"
    else
      echo "✗ FAIL: Test 1 state incorrect"
    fi
    ;;
  2)
    echo "Expected after Test 2 (Merge #2 → Save):"
    echo "  • Disk: 2 files (current + 1 archive)"
    echo "  • DB: 2 entries (current + 1 archive)"
    echo "  • API: 1 current, 1 archive"
    
    if [ $FILE_COUNT -eq 2 ] && [ "$CURRENT_EXISTS" -eq 1 ] && [ "$CURRENT_COUNT" -eq 1 ] && [ "$ARCHIVE_COUNT" -eq 1 ]; then
      echo "✓ PASS: Test 2 state correct"
    else
      echo "✗ FAIL: Test 2 state incorrect"
    fi
    ;;
  3)
    echo "Expected after Test 3 (Merge #3 → Save):"
    echo "  • Disk: 3 files (current + 2 archives)"
    echo "  • DB: 3 entries (current + 2 archives)"
    echo "  • API: 1 current, 2 archives"
    
    if [ $FILE_COUNT -eq 3 ] && [ "$CURRENT_EXISTS" -eq 1 ] && [ "$CURRENT_COUNT" -eq 1 ] && [ "$ARCHIVE_COUNT" -eq 2 ]; then
      echo "✓ PASS: Test 3 state correct"
    else
      echo "✗ FAIL: Test 3 state incorrect"
    fi
    ;;
esac
echo ""

# ============================================================================
# STEP 6: DETAILED API DUMP (FOR DEBUGGING)
# ============================================================================
echo "[6/6] Detailed API Response (First 2 entries)"
echo "──────────────────────────────────────────────"
echo "$API_RESPONSE" | jq '.archives[0:2]' 2>/dev/null || echo "  (Could not parse API response)"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Disk Files: $FILE_COUNT | Current: $CURRENT_EXISTS | Archives: $ARCHIVE_COUNT"
echo "DB Entries: $TOTAL_IN_DB | Current in DB: $([ -n "$CURRENT_IN_DB" ] && echo "Yes" || echo "No")"
echo "API Response: $CURRENT_COUNT current, $ARCHIVE_COUNT_API archives"
echo ""
echo "Next steps:"
echo "  • Review any ✗ FAIL items above"
echo "  • Check backend logs: journalctl -u epg-merge -n 50"
echo "  • After next merge+save, run: bash test-comprehensive.sh $API_BASE $((test_number+1))"
echo ""