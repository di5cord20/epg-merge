#!/bin/bash
# EPG Merge App - Version Management Script
# Display version info, check for updates, manage versions

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

# Load configuration
if [ -f "/opt/epg-merge-app/.install_config" ]; then
    source "/opt/epg-merge-app/.install_config"
else
    echo -e "${RED}Error: Installation not found${NC}"
    exit 1
fi

show_header() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         EPG Merge App - Version Manager                   ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_version_info() {
    echo -e "${CYAN}Current Installation:${NC}"
    echo -e "  Version: ${GREEN}${APP_VERSION}${NC}"
    echo -e "  Installed: ${INSTALL_DATE}"
    echo -e "  Mode: ${INSTALL_MODE}"
    echo ""
    
    echo -e "${CYAN}Directories:${NC}"
    echo -e "  App: ${BLUE}${APP_DIR}${NC}"
    echo -e "  Config: ${BLUE}${CONFIG_DIR}${NC}"
    echo -e "  Archive: ${BLUE}${ARCHIVE_DIR}${NC}"
    echo -e "  Cache: ${BLUE}${CACHE_DIR}${NC}"
    echo ""
    
    echo -e "${CYAN}Service:${NC}"
    SERVICE_STATUS=$(systemctl is-active xml-merge 2>/dev/null || echo "unknown")
    if [ "$SERVICE_STATUS" == "active" ]; then
        echo -e "  Status: ${GREEN}Running${NC}"
    else
        echo -e "  Status: ${RED}${SERVICE_STATUS}${NC}"
    fi
    echo -e "  Port: ${SERVICE_PORT}"
    echo ""
}

show_component_versions() {
    echo -e "${CYAN}Component Versions:${NC}"
    
    # Backend
    echo -n "  Backend (Python): "
    if [ -f "${APP_DIR}/backend/venv/bin/python" ]; then
        PYTHON_VERSION=$(${APP_DIR}/backend/venv/bin/python --version 2>&1 | cut -d' ' -f2)
        echo -e "${GREEN}${PYTHON_VERSION}${NC}"
    else
        echo -e "${RED}Not found${NC}"
    fi
    
    # FastAPI
    echo -n "  FastAPI: "
    if [ -f "${APP_DIR}/backend/venv/bin/pip" ]; then
        FASTAPI_VERSION=$(${APP_DIR}/backend/venv/bin/pip show fastapi 2>/dev/null | grep Version | cut -d' ' -f2)
        if [ -n "$FASTAPI_VERSION" ]; then
            echo -e "${GREEN}${FASTAPI_VERSION}${NC}"
        else
            echo -e "${RED}Not found${NC}"
        fi
    else
        echo -e "${RED}Not found${NC}"
    fi
    
    # Frontend
    echo -n "  Frontend (Node): "
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version 2>&1)
        echo -e "${GREEN}${NODE_VERSION}${NC}"
    else
        echo -e "${RED}Not found${NC}"
    fi
    
    # React
    echo -n "  React: "
    if [ -f "${APP_DIR}/frontend/package.json" ]; then
        REACT_VERSION=$(grep '"react"' "${APP_DIR}/frontend/package.json" | cut -d'"' -f4)
        echo -e "${GREEN}${REACT_VERSION}${NC}"
    else
        echo -e "${RED}Not found${NC}"
    fi
    
    echo ""
}

show_database_info() {
    echo -e "${CYAN}Database:${NC}"
    
    if [ -f "${CONFIG_DIR}/app.db" ]; then
        DB_SIZE=$(du -h "${CONFIG_DIR}/app.db" | cut -f1)
        echo -e "  Size: ${GREEN}${DB_SIZE}${NC}"
        
        # Count channels
        CHANNEL_COUNT=$(sqlite3 "${CONFIG_DIR}/app.db" "SELECT COUNT(*) FROM channels_selected;" 2>/dev/null || echo "0")
        echo -e "  Selected Channels: ${GREEN}${CHANNEL_COUNT}${NC}"
        
        # Get settings count
        SETTINGS_COUNT=$(sqlite3 "${CONFIG_DIR}/app.db" "SELECT COUNT(*) FROM settings;" 2>/dev/null || echo "0")
        echo -e "  Settings: ${GREEN}${SETTINGS_COUNT} keys${NC}"
    else
        echo -e "  ${RED}Database not found${NC}"
    fi
    
    echo ""
}

show_storage_info() {
    echo -e "${CYAN}Storage Usage:${NC}"
    
    # Archives
    if [ -d "${ARCHIVE_DIR}" ]; then
        ARCHIVE_SIZE=$(du -sh "${ARCHIVE_DIR}" 2>/dev/null | cut -f1)
        ARCHIVE_COUNT=$(find "${ARCHIVE_DIR}" -name "*.xml.gz*" 2>/dev/null | wc -l)
        echo -e "  Archives: ${GREEN}${ARCHIVE_SIZE}${NC} (${ARCHIVE_COUNT} files)"
    else
        echo -e "  Archives: ${RED}Not found${NC}"
    fi
    
    # Cache
    if [ -d "${CACHE_DIR}" ]; then
        CACHE_SIZE=$(du -sh "${CACHE_DIR}" 2>/dev/null | cut -f1)
        CACHE_COUNT=$(find "${CACHE_DIR}" -type f 2>/dev/null | wc -l)
        echo -e "  Cache: ${GREEN}${CACHE_SIZE}${NC} (${CACHE_COUNT} files)"
    else
        echo -e "  Cache: ${RED}Not found${NC}"
    fi
    
    # Backups
    if [ -d "${APP_DIR}/backups" ]; then
        BACKUP_SIZE=$(du -sh "${APP_DIR}/backups" 2>/dev/null | cut -f1)
        BACKUP_COUNT=$(ls -1 "${APP_DIR}/backups" 2>/dev/null | wc -l)
        echo -e "  Backups: ${GREEN}${BACKUP_SIZE}${NC} (${BACKUP_COUNT} items)"
    else
        echo -e "  Backups: ${YELLOW}None${NC}"
    fi
    
    echo ""
}

check_for_updates() {
    echo -e "${CYAN}Checking for updates...${NC}"
    echo ""
    
    # This is a placeholder - in production, check GitHub API
    REMOTE_URL="https://api.github.com/repos/yourusername/xml-merge-app/releases/latest"
    
    echo -e "${YELLOW}Note: Update checking requires internet connection${NC}"
    echo -e "${YELLOW}Manual check: Visit https://github.com/yourusername/xml-merge-app/releases${NC}"
    echo ""
    
    # Attempt to fetch latest version
    if command -v curl &> /dev/null; then
        LATEST_VERSION=$(curl -s "$REMOTE_URL" 2>/dev/null | grep '"tag_name"' | cut -d'"' -f4 | sed 's/v//')
        
        if [ -n "$LATEST_VERSION" ]; then
            echo -e "  Current: ${GREEN}${APP_VERSION}${NC}"
            echo -e "  Latest: ${BLUE}${LATEST_VERSION}${NC}"
            echo ""
            
            if [ "$LATEST_VERSION" != "$APP_VERSION" ]; then
                echo -e "${YELLOW}⚠️  New version available!${NC}"
                echo ""
                echo -e "${CYAN}To upgrade:${NC}"
                echo -e "  ${BLUE}sudo bash /opt/xml-merge-app/scripts/update.sh${NC}"
            else
                echo -e "${GREEN}✓ You're running the latest version${NC}"
            fi
        else
            echo -e "${YELLOW}Unable to check for updates${NC}"
        fi
    else
        echo -e "${YELLOW}curl not installed - cannot check for updates${NC}"
    fi
    
    echo ""
}

show_changelog() {
    echo -e "${CYAN}Recent Changes:${NC}"
    echo ""
    
    if [ -f "${APP_DIR}/CHANGELOG.md" ]; then
        # Show last 20 lines of changelog
        head -n 20 "${APP_DIR}/CHANGELOG.md"
        echo ""
        echo -e "${BLUE}Full changelog: ${APP_DIR}/CHANGELOG.md${NC}"
    else
        echo -e "${YELLOW}Changelog not found${NC}"
        echo ""
        echo -e "Version ${APP_VERSION} changes:"
        case "$APP_VERSION" in
            "2.0.0")
                echo "  • Modular installation system"
                echo "  • Custom directory support"
                echo "  • Automatic backups"
                echo "  • Version management"
                ;;
            "1.0.0")
                echo "  • Initial stable release"
                echo "  • Complete XML merge functionality"
                echo "  • Archive management"
                ;;
        esac
    fi
    
    echo ""
}

show_health_check() {
    echo -e "${CYAN}Health Check:${NC}"
    echo ""
    
    local errors=0
    
    # Check service
    echo -n "  Service status... "
    if systemctl is-active --quiet xml-merge; then
        echo -e "${GREEN}✓ Running${NC}"
    else
        echo -e "${RED}✗ Not running${NC}"
        ((errors++))
    fi
    
    # Check database
    echo -n "  Database... "
    if [ -f "${CONFIG_DIR}/app.db" ]; then
        if sqlite3 "${CONFIG_DIR}/app.db" "PRAGMA integrity_check;" 2>/dev/null | grep -q "ok"; then
            echo -e "${GREEN}✓ OK${NC}"
        else
            echo -e "${RED}✗ Corrupted${NC}"
            ((errors++))
        fi
    else
        echo -e "${RED}✗ Not found${NC}"
        ((errors++))
    fi
    
    # Check backend
    echo -n "  Backend code... "
    if [ -f "${APP_DIR}/backend/main.py" ]; then
        echo -e "${GREEN}✓ Present${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        ((errors++))
    fi
    
    # Check frontend
    echo -n "  Frontend build... "
    if [ -d "${APP_DIR}/backend/static" ] && [ -f "${APP_DIR}/backend/static/index.html" ]; then
        echo -e "${GREEN}✓ Present${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        ((errors++))
    fi
    
    # Check directories
    echo -n "  Directories... "
    if [ -d "${CONFIG_DIR}" ] && [ -d "${ARCHIVE_DIR}" ] && [ -d "${CACHE_DIR}" ]; then
        echo -e "${GREEN}✓ Present${NC}"
    else
        echo -e "${RED}✗ Missing${NC}"
        ((errors++))
    fi
    
    echo ""
    if [ $errors -eq 0 ]; then
        echo -e "${GREEN}✓ All checks passed${NC}"
    else
        echo -e "${RED}✗ ${errors} issue(s) found${NC}"
        echo ""
        echo -e "${YELLOW}Recommended actions:${NC}"
        echo -e "  1. Check logs: ${BLUE}journalctl -u xml-merge -n 50${NC}"
        echo -e "  2. Restart service: ${BLUE}sudo systemctl restart xml-merge${NC}"
        echo -e "  3. Rebuild frontend: ${BLUE}sudo bash ${APP_DIR}/scripts/build.sh${NC}"
    fi
    
    echo ""
}

show_menu() {
    echo -e "${CYAN}Actions:${NC}"
    echo ""
    echo "  1) Check for updates"
    echo "  2) View changelog"
    echo "  3) Run health check"
    echo "  4) Show full info"
    echo "  5) Exit"
    echo ""
}

# Main
show_header

case "$1" in
    --info|-i)
        show_version_info
        show_component_versions
        show_database_info
        show_storage_info
        ;;
    --check|-c)
        check_for_updates
        ;;
    --changelog|-l)
        show_changelog
        ;;
    --health|-h)
        show_health_check
        ;;
    --all|-a)
        show_version_info
        show_component_versions
        show_database_info
        show_storage_info
        show_health_check
        ;;
    *)
        show_version_info
        show_menu
        
        read -p "$(echo -e ${CYAN}Select option [1-5]: ${NC})" choice
        echo ""
        
        case $choice in
            1) check_for_updates ;;
            2) show_changelog ;;
            3) show_health_check ;;
            4) 
                show_component_versions
                show_database_info
                show_storage_info
                show_health_check
                ;;
            5) exit 0 ;;
            *) echo -e "${RED}Invalid option${NC}" ;;
        esac
        ;;
esac