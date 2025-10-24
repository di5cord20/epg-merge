#!/bin/bash
# EPG Merge App - Uninstaller
# Safely removes the application with optional data preservation

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║              ⚠️  EPG MERGE APPLICATION UNINSTALLER  ⚠️                    ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

# Check root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}[✗] This script must be run as root${NC}"
   exit 1
fi

# Load configuration
if [ -f "/opt/epg-merge-app/.install_config" ]; then
    source "/opt/epg-merge-app/.install_config"
    echo -e "${GREEN}[✓] Loaded configuration${NC}"
else
    echo -e "${YELLOW}[!] No installation config found, using defaults${NC}"
    APP_DIR="/opt/epg-merge-app"
    CONFIG_DIR="/config"
    ARCHIVE_DIR="/config/archives"
    CACHE_DIR="/config/epg_cache"
fi

echo ""
echo -e "${YELLOW}Detected installation:${NC}"
echo -e "  App Directory: ${BLUE}${APP_DIR}${NC}"
echo -e "  Config Directory: ${BLUE}${CONFIG_DIR}${NC}"
echo -e "  Archives: ${BLUE}${ARCHIVE_DIR}${NC}"
echo -e "  Cache: ${BLUE}${CACHE_DIR}${NC}"
echo ""

# Uninstall options
echo -e "${CYAN}Uninstall Options:${NC}"
echo ""
echo "1) Complete Removal (app + all data)"
echo "2) Remove App Only (keep database + archives)"
echo "3) Remove App + Backup Data First"
echo "4) Cancel"
echo ""

read -p "$(echo -e ${YELLOW}Select option [1-4]: ${NC})" UNINSTALL_MODE

case $UNINSTALL_MODE in
    1)
        REMOVE_DATA=true
        CREATE_BACKUP=false
        ;;
    2)
        REMOVE_DATA=false
        CREATE_BACKUP=false
        ;;
    3)
        REMOVE_DATA=true
        CREATE_BACKUP=true
        ;;
    4)
        echo "Cancelled."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

# Final confirmation
echo ""
echo -e "${RED}⚠️  WARNING: This action cannot be easily undone!${NC}"
echo ""

if [ "$REMOVE_DATA" = true ]; then
    echo -e "${RED}This will DELETE:${NC}"
    echo -e "  • Application code (${APP_DIR})"
    echo -e "  • Database (${CONFIG_DIR}/app.db)"
    echo -e "  • All archives (${ARCHIVE_DIR})"
    echo -e "  • Cache files (${CACHE_DIR})"
else
    echo -e "${YELLOW}This will DELETE:${NC}"
    echo -e "  • Application code (${APP_DIR})"
    echo ""
    echo -e "${GREEN}This will PRESERVE:${NC}"
    echo -e "  • Database (${CONFIG_DIR}/app.db)"
    echo -e "  • All archives (${ARCHIVE_DIR})"
fi

echo ""
read -p "$(echo -e ${RED}Type 'UNINSTALL' to proceed: ${NC})" CONFIRM

if [ "$CONFIRM" != "UNINSTALL" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting uninstallation...${NC}"
echo ""

# Create backup if requested
if [ "$CREATE_BACKUP" = true ]; then
    echo -n "Creating final backup... "
    FINAL_BACKUP="${APP_DIR}/backups/final_backup_$(date +%Y%m%d_%H%M%S)"
    mkdir -p "${FINAL_BACKUP}"
    
    cp "${CONFIG_DIR}/app.db" "${FINAL_BACKUP}/" 2>/dev/null || true
    cp "${ARCHIVE_DIR}/merged.xml.gz" "${FINAL_BACKUP}/" 2>/dev/null || true
    cp -r "${ARCHIVE_DIR}"/*.xml.gz.* "${FINAL_BACKUP}/" 2>/dev/null || true
    
    tar -czf "${FINAL_BACKUP}.tar.gz" -C "${APP_DIR}/backups" "$(basename ${FINAL_BACKUP})"
    rm -rf "${FINAL_BACKUP}"
    
    # Move backup to safe location
    SAFE_BACKUP_DIR="/tmp/epg-merge-backups"
    mkdir -p "${SAFE_BACKUP_DIR}"
    mv "${FINAL_BACKUP}.tar.gz" "${SAFE_BACKUP_DIR}/"
    
    echo -e "${GREEN}✓${NC}"
    echo -e "  Backup saved: ${BLUE}${SAFE_BACKUP_DIR}/$(basename ${FINAL_BACKUP}).tar.gz${NC}"
fi

# Stop and disable service
echo -n "Stopping service... "
systemctl stop epg-merge 2>/dev/null || true
echo -e "${GREEN}✓${NC}"

echo -n "Disabling service... "
systemctl disable epg-merge 2>/dev/null || true
echo -e "${GREEN}✓${NC}"

echo -n "Removing service file... "
rm -f /etc/systemd/system/epg-merge.service
systemctl daemon-reload
echo -e "${GREEN}✓${NC}"

# Remove application directory
echo -n "Removing application directory... "
if [ -d "${APP_DIR}" ]; then
    rm -rf "${APP_DIR}"
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⚠ Not found${NC}"
fi

# Remove data if requested
if [ "$REMOVE_DATA" = true ]; then
    echo -n "Removing database... "
    if [ -f "${CONFIG_DIR}/app.db" ]; then
        rm -f "${CONFIG_DIR}/app.db"
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Not found${NC}"
    fi
    
    echo -n "Removing archives... "
    if [ -d "${ARCHIVE_DIR}" ]; then
        rm -rf "${ARCHIVE_DIR}"
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Not found${NC}"
    fi
    
    echo -n "Removing cache... "
    if [ -d "${CACHE_DIR}" ]; then
        rm -rf "${CACHE_DIR}"
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Not found${NC}"
    fi
    
    echo -n "Removing config directory... "
    if [ -d "${CONFIG_DIR}" ] && [ -z "$(ls -A ${CONFIG_DIR})" ]; then
        rmdir "${CONFIG_DIR}"
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Directory not empty or not found${NC}"
    fi
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║              ✓ Uninstallation Complete                    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$REMOVE_DATA" = false ]; then
    echo -e "${YELLOW}Data preserved in:${NC}"
    echo -e "  • Database: ${BLUE}${CONFIG_DIR}/app.db${NC}"
    echo -e "  • Archives: ${BLUE}${ARCHIVE_DIR}${NC}"
    echo ""
    echo -e "${YELLOW}To reinstall with preserved data:${NC}"
    echo -e "  ${BLUE}sudo bash install.sh${NC}"
    echo -e "  Select 'Update/Upgrade' mode and use existing directories"
fi

if [ "$CREATE_BACKUP" = true ]; then
    echo ""
    echo -e "${GREEN}Final backup created:${NC}"
    echo -e "  ${BLUE}${SAFE_BACKUP_DIR}/$(basename ${FINAL_BACKUP}).tar.gz${NC}"
fi

echo ""
echo -e "${BLUE}Uninstalled at $(date)${NC}"
echo ""