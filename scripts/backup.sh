#!/bin/bash
# EPG Merge App - Backup Utility
# Creates comprehensive backups of app data

set -e

# Load configuration
if [ -f "/opt/epg-merge-app/.install_config" ]; then
    source "/opt/epg-merge-app/.install_config"
else
    echo "Error: Installation config not found"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Backup directory
BACKUP_ROOT="${APP_DIR}/backups"
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_ROOT}/${BACKUP_NAME}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           EPG Merge App - Backup Utility                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"

echo -e "${YELLOW}Creating backup: ${BACKUP_NAME}${NC}"
echo ""

# Backup database
echo -n "Backing up database... "
if [ -f "${CONFIG_DIR}/app.db" ]; then
    cp "${CONFIG_DIR}/app.db" "${BACKUP_DIR}/app.db"
    DB_SIZE=$(du -h "${CONFIG_DIR}/app.db" | cut -f1)
    echo -e "${GREEN}✓ (${DB_SIZE})${NC}"
else
    echo -e "${YELLOW}⚠ Not found${NC}"
fi

# Backup current merged file
echo -n "Backing up current merge... "
if [ -f "${ARCHIVE_DIR}/merged.xml.gz" ]; then
    cp "${ARCHIVE_DIR}/merged.xml.gz" "${BACKUP_DIR}/merged.xml.gz"
    MERGE_SIZE=$(du -h "${ARCHIVE_DIR}/merged.xml.gz" | cut -f1)
    echo -e "${GREEN}✓ (${MERGE_SIZE})${NC}"
else
    echo -e "${YELLOW}⚠ Not found${NC}"
fi

# Backup all archives
echo -n "Backing up archives... "
ARCHIVE_COUNT=0
if [ -d "${ARCHIVE_DIR}" ]; then
    mkdir -p "${BACKUP_DIR}/archives"
    for archive in "${ARCHIVE_DIR}"/*.xml.gz.*; do
        if [ -f "$archive" ]; then
            cp "$archive" "${BACKUP_DIR}/archives/"
            ((ARCHIVE_COUNT++))
        fi
    done
    echo -e "${GREEN}✓ (${ARCHIVE_COUNT} files)${NC}"
else
    echo -e "${YELLOW}⚠ Not found${NC}"
fi

# Backup configuration files
echo -n "Backing up config files... "
cp "${APP_DIR}/.install_config" "${BACKUP_DIR}/.install_config" 2>/dev/null || true
cp "${APP_DIR}/.version" "${BACKUP_DIR}/.version" 2>/dev/null || true
cp "${CONFIG_DIR}/helptext.json" "${BACKUP_DIR}/helptext.json" 2>/dev/null || true
echo -e "${GREEN}✓${NC}"

# Create manifest
echo -n "Creating manifest... "
cat > "${BACKUP_DIR}/manifest.txt" << EOF
EPG Merge App - Backup Manifest
================================

Backup Date: $(date)
App Version: ${APP_VERSION}
Backup Name: ${BACKUP_NAME}

Contents:
---------
Database: app.db $([ -f "${BACKUP_DIR}/app.db" ] && echo "✓" || echo "✗")
Current Merge: merged.xml.gz $([ -f "${BACKUP_DIR}/merged.xml.gz" ] && echo "✓" || echo "✗")
Archives: ${ARCHIVE_COUNT} files
Config Files: .install_config, .version, helptext.json

Directories:
-----------
App Dir: ${APP_DIR}
Config Dir: ${CONFIG_DIR}
Archive Dir: ${ARCHIVE_DIR}
Cache Dir: ${CACHE_DIR}
Port: ${SERVICE_PORT}

Restore Instructions:
--------------------
1. Stop the service: systemctl stop epg-merge
2. Restore database: cp ${BACKUP_DIR}/app.db ${CONFIG_DIR}/
3. Restore merge: cp ${BACKUP_DIR}/merged.xml.gz ${ARCHIVE_DIR}/
4. Restore archives: cp ${BACKUP_DIR}/archives/* ${ARCHIVE_DIR}/
5. Start service: systemctl start epg-merge

Or use: bash ${APP_DIR}/scripts/restore.sh ${BACKUP_NAME}
EOF
echo -e "${GREEN}✓${NC}"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)

# Compress backup (optional)
if [ "$1" == "--compress" ]; then
    echo -n "Compressing backup... "
    tar -czf "${BACKUP_DIR}.tar.gz" -C "${BACKUP_ROOT}" "${BACKUP_NAME}"
    rm -rf "${BACKUP_DIR}"
    COMPRESSED_SIZE=$(du -sh "${BACKUP_DIR}.tar.gz" | cut -f1)
    echo -e "${GREEN}✓ (${COMPRESSED_SIZE})${NC}"
    BACKUP_PATH="${BACKUP_DIR}.tar.gz"
else
    BACKUP_PATH="${BACKUP_DIR}"
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✓ Backup Complete                            ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Backup Location:${NC} ${BACKUP_PATH}"
echo -e "${BLUE}Total Size:${NC} ${TOTAL_SIZE}"
echo ""
echo -e "${YELLOW}To restore this backup:${NC}"
echo -e "  ${BLUE}sudo bash ${APP_DIR}/scripts/restore.sh ${BACKUP_NAME}${NC}"
echo ""

# Clean old backups (optional - keep last 10)
BACKUP_COUNT=$(ls -1 "${BACKUP_ROOT}" | wc -l)
if [ "$BACKUP_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}Note: You have ${BACKUP_COUNT} backups. Consider cleaning old backups.${NC}"
    echo -e "  ${BLUE}ls -lt ${BACKUP_ROOT}${NC}"
fi