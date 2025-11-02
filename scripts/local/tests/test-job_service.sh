#!/bin/bash
# EPG Merge - Scheduled Job Testing Guide (v0.4.0)
# All endpoints callable via curl for local testing

API_BASE="http://localhost:9193"

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║       EPG Merge - Scheduled Job Testing Guide              ║"
echo "║                   v0.4.0 Local Testing                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PRE-TEST SETUP
# ============================================================================

echo "STEP 1: Pre-Test Setup"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Before testing, ensure you have configured:"
echo ""
echo "  1. Settings > Sources (select at least one)"
echo "  2. Settings > Channels (select at least one)"
echo "  3. Settings > Schedule Frequency (Daily or Weekly)"
echo "  4. Settings > Merge Time (what time to run)"
echo "  5. Settings > Notifications > Discord Webhook (optional, for notifications)"
echo ""
echo "Go to Settings page in UI and configure these, then return here."
echo ""
read -p "Press Enter when ready to continue..."
echo ""

# ============================================================================
# TEST 1: Check Current Status
# ============================================================================

echo "TEST 1: Get Current Job Status"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Command:"
echo "  curl ${API_BASE}/api/jobs/status"
echo ""
echo "Expected Response:"
echo "  {\"is_running\": false, \"latest_job\": null, \"next_scheduled_run\": \"2025-...\"}"
echo ""
curl -s "${API_BASE}/api/jobs/status" | jq .
echo ""
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================================================
# TEST 2: Trigger Manual Job Execution
# ============================================================================

echo "TEST 2: Trigger Scheduled Merge Job (Manually)"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Command:"
echo "  curl -X POST ${API_BASE}/api/jobs/execute"
echo ""
echo "Expected Response:"
echo "  {\"status\": \"started\", \"message\": \"...\"}"
echo ""
echo "🔄 Triggering job..."
curl -s -X POST "${API_BASE}/api/jobs/execute" | jq .
echo ""
echo ""
echo "⏳ Job is now running. Monitoring..."
echo ""

# ============================================================================
# TEST 3: Monitor Job Progress
# ============================================================================

echo "TEST 3: Monitor Job Status (During Execution)"
echo "─────────────────────────────────────────────────────────────"
echo ""

for i in {1..10}; do
    echo "Check ${i}/10..."
    
    status=$(curl -s "${API_BASE}/api/jobs/status")
    is_running=$(echo $status | jq -r '.is_running')
    
    if [ "$is_running" = "true" ]; then
        echo "  ⏳ Job running..."
        sleep 3
    else
        echo "  ✅ Job completed!"
        echo "$status" | jq .
        break
    fi
done

echo ""
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================================================
# TEST 4: Get Latest Job Result
# ============================================================================

echo "TEST 4: Get Latest Job Execution Details"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Command:"
echo "  curl ${API_BASE}/api/jobs/latest"
echo ""
echo "Response:"
curl -s "${API_BASE}/api/jobs/latest" | jq .
echo ""
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================================================
# TEST 5: Get Job History
# ============================================================================

echo "TEST 5: Get Job History (Last 5 Runs)"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Command:"
echo "  curl '${API_BASE}/api/jobs/history?limit=5'"
echo ""
echo "Response:"
curl -s "${API_BASE}/api/jobs/history?limit=5" | jq .
echo ""
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================================================
# TEST 6: Test Failure Scenario (Optional)
# ============================================================================

echo "TEST 6: Test Failure Notification (Optional)"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "To test failure notifications:"
echo ""
echo "  1. Go to Settings page"
echo "  2. Clear 'Channels' field in Merge Schedule"
echo "  3. Trigger job: curl -X POST ${API_BASE}/api/jobs/execute"
echo "  4. Check Discord webhook for failure notification"
echo "  5. Get history to see failed job record"
echo ""
echo ""
read -p "Press Enter to continue..."
echo ""

# ============================================================================
# TEST 7: Check Archives
# ============================================================================

echo "TEST 7: Verify Archives Updated"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "Command:"
echo "  curl ${API_BASE}/api/archives/list"
echo ""
echo "Expected:"
echo "  - Current file: merged.xml.gz (marked as current)"
echo "  - Previous run archived with timestamp"
echo ""
echo "Response:"
curl -s "${API_BASE}/api/archives/list" | jq '.archives[0:2]'
echo ""
echo ""

# ============================================================================
# TESTING COMPLETE
# ============================================================================

echo "═══════════════════════════════════════════════════════════"
echo "✅ TESTING COMPLETE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "QUICK REFERENCE - Useful curl commands:"
echo ""
echo "  # Trigger job manually"
echo "  curl -X POST ${API_BASE}/api/jobs/execute"
echo ""
echo "  # Get current status"
echo "  curl ${API_BASE}/api/jobs/status"
echo ""
echo "  # Get last job details"
echo "  curl ${API_BASE}/api/jobs/latest"
echo ""
echo "  # Get job history (last 10)"
echo "  curl '${API_BASE}/api/jobs/history?limit=10'"
echo ""
echo "  # Cancel running job"
echo "  curl -X POST ${API_BASE}/api/jobs/cancel"
echo ""
echo "NEXT STEPS:"
echo "  1. Open http://localhost:3001 in browser"
echo "  2. Go to Dashboard (new page) to see job status"
echo "  3. Configure cron scheduling in production systemd service"
echo ""