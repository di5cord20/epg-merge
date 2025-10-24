#!/bin/bash
set -e

source /opt/epg-merge-app/.install_config

echo "🔄 EPG Merge App - Update Utility"
echo "=================================="
echo "Current version: ${APP_VERSION}"
echo ""

# Create backup
echo "Creating backup..."
BACKUP_DIR="${APP_DIR}/backups/update_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "${CONFIG_DIR}/app.db" "$BACKUP_DIR/" 2>/dev/null || true
cp "${ARCHIVE_DIR}/merged.xml.gz" "$BACKUP_DIR/" 2>/dev/null || true
echo "✅ Backup created: $BACKUP_DIR"

# Update backend dependencies
echo "Updating backend dependencies..."
cd "${APP_DIR}/backend"
source venv/bin/activate
pip install --upgrade pip -q
pip install --upgrade -r requirements.txt -q 2>/dev/null || true
deactivate
echo "✅ Backend updated"

# Rebuild frontend
echo "Rebuilding frontend..."
bash "${APP_DIR}/scripts/build.sh"
echo "✅ Frontend rebuilt"

echo ""
echo "✅ Update complete!"