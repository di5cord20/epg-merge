#!/bin/bash
# Test script to verify save_merge endpoint behavior
# Run this after doing a merge to test the save functionality

set -e

API_BASE="http://localhost:9193"
ARCHIVE_DIR="config/archives"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          Save Merge Endpoint Test                         ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check current state
echo "[1/5] Checking archive directory..."
echo ""
ls -lh "$ARCHIVE_DIR/" | tail -10
echo ""
FILE_COUNT=$(ls -1 "$ARCHIVE_DIR"/*.xml.gz* 2>/dev/null | wc -l)
echo "Files with .xml.gz extension: $FILE_COUNT"
echo ""

# Step 2: Show database state
echo "[2/5] Checking database..."
echo ""
sqlite3 config/app.db "SELECT filename, channels, programs, size_bytes FROM archives ORDER BY created_at DESC LIMIT 5;" 2>/dev/null || echo "No archives in DB"
echo ""

# Step 3: Call save endpoint
echo "[3/5] Calling save_merge endpoint..."
echo ""
echo "Request:"
echo '{
  "filename": "merged.xml.gz"
}'
echo ""

RESPONSE=$(curl -s -X POST "$API_BASE/api/merge/save" \
  -H "Content-Type: application/json" \
  -d '{
    "filename": "merged.xml.gz"
  }')

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Step 4: Check result
echo "[4/5] Checking archive directory after save..."
echo ""
ls -lh "$ARCHIVE_DIR/" | tail -10
echo ""
FILE_COUNT=$(ls -1 "$ARCHIVE_DIR"/*.xml.gz* 2>/dev/null | wc -l)
echo "Files with .xml.gz extension: $FILE_COUNT"
echo ""

# Step 5: Verify database
echo "[5/5] Checking database after save..."
echo ""
sqlite3 config/app.db "SELECT filename, channels, programs, size_bytes FROM archives ORDER BY created_at DESC LIMIT 10;" 2>/dev/null || echo "No archives in DB"
echo ""

# Summary
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    Test Complete                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if archiving worked
TIMESTAMPED_FILES=$(ls -1 "$ARCHIVE_DIR"/merged.xml.gz.* 2>/dev/null | wc -l)
if [ "$TIMESTAMPED_FILES" -gt 0 ]; then
  echo "✓ SUCCESS: Found $TIMESTAMPED_FILES timestamped archive file(s)"
  echo ""
  ls -lh "$ARCHIVE_DIR"/merged.xml.gz.*
else
  echo "✗ ISSUE: No timestamped archive files found"
  echo "Previous merged.xml.gz was NOT archived with timestamp"
fi