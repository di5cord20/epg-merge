#!/bin/bash
# EPG Merge App - Restore Utility
# Restores app data from backups

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

BACKUP_ROOT="${APP_DIR}/backups"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           EPG Merge App - Restore Utility                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to list available backups
list_backups() {
    echo -e "${YELLOW}Available backups:${NC}"
    echo ""
    
    local count=1
    for backup in $(ls -t "${BACKUP_ROOT}"); do
        if [ -d "${BACKUP_ROOT}/${backup}" ] || [ -f "${BACKUP_ROOT}/${backup}" ]; then
            local backup_path="${BACKUP_ROOT}/${backup}"
            local size=$(du -sh "$backup_path" | cut -f1)
            local date=$(stat -c %y "$backup_path" | cut -d' ' -f1,2 | cut -d'.' -f1)
            
            echo -e "  ${BLUE}${count})${NC} ${backup}"
            echo -e "     Date: ${date} | Size: ${size}"
            
            # Show manifest if available
            if [ -f "${backup_path}/manifest.txt" ]; then
                local version=$(grep "App Version:" "${backup_path}/manifest.txt" | cut -d: -f2 | xargs)
                echo -e "     Version: ${version}"
            fi
            echo ""
            
            ((count++))
        fi
    done
    
    if [ $count -eq 1 ]; then
        echo -e "${RED}No backups found in ${BACKUP_ROOT}${NC}"
        exit 1
    fi
}

# Function to extract compressed backup
extract_backup() {
    local backup_file="$1"
    local extract_dir="${BACKUP_ROOT}/$(basename ${backup_file} .tar.gz)"
    
    if [ -f "${backup_file}" ] && [[ "${backup_file}" == *.tar.gz ]]; then
        echo -n "Extracting compressed backup... "
        tar -xzf "${backup_file}" -C "${BACKUP_ROOT}"
        echo -e "${GREEN}✓${NC}"
        echo "${extract_dir}"
    else
        echo "$1"
    fi
}

# Check if backup name provided
if [ -z "$1" ]; then
    list_backups
    echo -e "${YELLOW}Usage:${NC} sudo bash $0 <backup_name>"
    echo -e "${YELLOW}Example:${NC} sudo bash $0 backup_20251024_120000"
    exit 1
fi

BACKUP_NAME="$1"
BACKUP_DIR="${BACKUP_ROOT}/${BACKUP_NAME}"

# Check if backup exists (directory or compressed)
if [ ! -d "${BACKUP_DIR}" ] && [ ! -f "${BACKUP_DIR}.tar.gz" ]; then
    echo -e "${RED}Error: Backup not found: ${BACKUP_NAME}${NC}"
    echo ""
    list_backups
    exit 1
fi

# Extract if compressed
if [ -f "${BACKUP_DIR}.tar.gz" ]; then
    BACKUP_DIR=$(extract_backup "${BACKUP_DIR}.tar.gz")
fi

# Show backup info
if [ -f "${BACKUP_DIR}/manifest.txt" ]; then
    echo -e "${BLUE}Backup Information:${NC}"
    echo ""
    cat "${BACKUP_DIR}/manifest.txt" | head -n 15
    echo ""
fi

# Confirm restore
echo -e "${YELLOW}⚠️  WARNING: This will overwrite current data!${NC}"
echo ""
read -p "$(echo -e ${RED}Are you sure you want to restore? [y/N]: ${NC})" -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting restore process...${NC}"
echo ""

# Stop service
echo -n "Stopping service... "
systemctl stop epg-merge
sleep 2
echo -e "${GREEN}✓${NC}"

# Create backup of current state before restore
echo -n "Creating safety backup of current state... "
SAFETY_BACKUP="${BACKUP_ROOT}/pre_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "${SAFETY_BACKUP}"
cp "${CONFIG_DIR}/app.db" "${SAFETY_BACKUP}/" 2>/dev/null || true
cp "${ARCHIVE_DIR}/merged.xml.gz" "${SAFETY_BACKUP}/" 2>/dev/null || true
echo -e "${GREEN}✓${NC}"
echo -e "  Safety backup: ${SAFETY_BACKUP}"

# Restore database
echo -n "Restoring database... "
if [ -f "${BACKUP_DIR}/app.db" ]; then
    cp "${BACKUP_DIR}/app.db" "${CONFIG_DIR}/app.db"
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Not found in backup${NC}"
fi

# Restore current merge
echo -n "Restoring current merge... "
if [ -f "${BACKUP_DIR}/merged.xml.gz" ]; then
    cp "${BACKUP_DIR}/merged.xml.gz" "${ARCHIVE_DIR}/merged.xml.gz"
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Not found in backup${NC}"
fi

# Restore archives
echo -n "Restoring archives... "
if [ -d "${BACKUP_DIR}/archives" ]; then
    RESTORED_COUNT=0
    for archive in "${BACKUP_DIR}/archives"/*; do
        if [ -f "$archive" ]; then
            cp "$archive" "${ARCHIVE_DIR}/"
            ((RESTORED_COUNT++))
        fi
    done
    echo -e "${GREEN}✓ (${RESTORED_COUNT} files)${NC}"
else
    echo -e "${YELLOW}⚠ Not found in backup${NC}"
fi

# Restore config files
echo -n "Restoring config files... "
cp "${BACKUP_DIR}/.install_config" "${APP_DIR}/" 2>/dev/null || true
cp "${BACKUP_DIR}/.version" "${APP_DIR}/" 2>/dev/null || true
cp "${BACKUP_DIR}/helptext.json" "${CONFIG_DIR}/" 2>/dev/null || true
echo -e "${GREEN}✓${NC}"

# Set permissions
echo -n "Setting permissions... "
chmod -R 755 "${CONFIG_DIR}"
chmod -R 755 "${ARCHIVE_DIR}"
echo -e "${GREEN}✓${NC}"

# Start service
echo -n "Starting service... "
systemctl start epg-merge
sleep 3
echo -e "${GREEN}✓${NC}"

# Verify service
echo -n "Verifying service... "
if systemctl is-active --quiet epg-merge; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗${NC}"
    echo ""
    echo -e "${RED}Service failed to start. Check logs:${NC}"
    echo -e "  ${BLUE}journalctl -u epg-merge -n 50${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✓ Restore Complete                           ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Restored from:${NC} ${BACKUP_DIR}"
echo -e "${BLUE}Safety backup:${NC} ${SAFETY_BACKUP}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Verify app is working: http://$(hostname -I | awk '{print $1}'):${SERVICE_PORT}"
echo -e "  2. Check service status: ${BLUE}systemctl status epg-merge${NC}"
echo -e "  3. View logs: ${BLUE}journalctl -u epg-merge -f${NC}"
echo ""