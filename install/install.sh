#!/bin/bash
# EPG Merge Application - Modular Installer
# Version: 0.1
# Supports: Fresh install, Updates, Custom directories, Version control

set -e

# ============================================================================
# VERSION CONTROL
# ============================================================================
APP_VERSION="0.1"
MIN_UPGRADE_VERSION="1.0.0"
VERSION_FILE="/opt/epg-merge-app/.version"

# ============================================================================
# COLORS
# ============================================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ============================================================================
# BANNER
# ============================================================================
show_banner() {
    echo -e "${BLUE}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════════════════════╗
║                                                                           ║
║                  🎬 EPG MERGE APPLICATION INSTALLER 🎬                    ║
║                                                                           ║
║                     Production-Grade TV Feed Merger                       ║
║                        FastAPI + React + SQLite                           ║
║                             v0.1 (Stable)                                 ║
║                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

prompt_user() {
    local prompt_text="$1"
    local default_value="$2"
    local user_input
    
    if [ -n "$default_value" ]; then
        read -p "$(echo -e ${CYAN}$prompt_text [${default_value}]: ${NC})" user_input
        echo "${user_input:-$default_value}"
    else
        read -p "$(echo -e ${CYAN}$prompt_text: ${NC})" user_input
        echo "$user_input"
    fi
}

confirm_action() {
    local prompt_text="$1"
    local response
    read -p "$(echo -e ${YELLOW}$prompt_text [y/N]: ${NC})" -n 1 -r response
    echo
    [[ $response =~ ^[Yy]$ ]]
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root"
        echo -e "${BLUE}Usage: sudo bash $0${NC}"
        exit 1
    fi
    log_success "Running as root"
}

check_os() {
    if ! grep -qi debian /etc/os-release && ! grep -qi ubuntu /etc/os-release; then
        log_error "This script is designed for Debian/Ubuntu"
        exit 1
    fi
    log_success "Debian/Ubuntu detected"
}

# ============================================================================
# VERSION DETECTION
# ============================================================================

detect_installation() {
    if [ -f "$VERSION_FILE" ]; then
        CURRENT_VERSION=$(cat "$VERSION_FILE")
        log_info "Existing installation detected: v${CURRENT_VERSION}"
        return 0
    else
        log_info "No existing installation found"
        return 1
    fi
}

check_upgrade_compatibility() {
    local current="$1"
    log_info "Checking upgrade compatibility..."
    
    # Simple version comparison (assumes semantic versioning)
    if [ "$current" == "$MIN_UPGRADE_VERSION" ] || [ "$current" \> "$MIN_UPGRADE_VERSION" ]; then
        log_success "Upgrade path available: v${current} → v${APP_VERSION}"
        return 0
    else
        log_error "Cannot upgrade from v${current}. Minimum version required: v${MIN_UPGRADE_VERSION}"
        return 1
    fi
}

# ============================================================================
# CONFIGURATION DETECTION & PROMPTS
# ============================================================================

load_existing_config() {
    if [ -f "/opt/epg-merge-app/.install_config" ]; then
        source "/opt/epg-merge-app/.install_config"
        log_success "Loaded existing configuration"
        return 0
    fi
    return 1
}

prompt_installation_mode() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Installation Mode Selection${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "1) Fresh Install (New installation)"
    echo "2) Update/Upgrade (Keep data, update code)"
    echo "3) Reinstall (Fresh install, backup existing data)"
    echo ""
    
    local choice
    read -p "$(echo -e ${CYAN}Select mode [1-3]: ${NC})" choice
    
    case $choice in
        1) INSTALL_MODE="fresh" ;;
        2) INSTALL_MODE="update" ;;
        3) INSTALL_MODE="reinstall" ;;
        *) 
            log_error "Invalid choice"
            exit 1
            ;;
    esac
    
    log_info "Installation mode: ${INSTALL_MODE}"
}

prompt_directories() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  Directory Configuration${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # App directory
    APP_DIR=$(prompt_user "Application directory" "/opt/epg-merge-app")
    
    # Config directory
    CONFIG_DIR=$(prompt_user "Configuration directory" "/config")
    
    # Archive directory
    ARCHIVE_DIR=$(prompt_user "Archives directory" "${CONFIG_DIR}/archives")
    
    # Cache directory
    CACHE_DIR=$(prompt_user "Cache directory" "${CONFIG_DIR}/epg_cache")
    
    # Service port
    SERVICE_PORT=$(prompt_user "Service port" "9193")
    
    echo ""
    log_info "Directories configured:"
    echo -e "  App:     ${BLUE}${APP_DIR}${NC}"
    echo -e "  Config:  ${BLUE}${CONFIG_DIR}${NC}"
    echo -e "  Archive: ${BLUE}${ARCHIVE_DIR}${NC}"
    echo -e "  Cache:   ${BLUE}${CACHE_DIR}${NC}"
    echo -e "  Port:    ${BLUE}${SERVICE_PORT}${NC}"
    echo ""
    
    if ! confirm_action "Proceed with these directories?"; then
        log_info "Restarting directory configuration..."
        prompt_directories
    fi
}

save_install_config() {
    cat > "${APP_DIR}/.install_config" << EOF
# EPG Merge App Installation Configuration
APP_VERSION="${APP_VERSION}"
INSTALL_MODE="${INSTALL_MODE}"
INSTALL_DATE="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
APP_DIR="${APP_DIR}"
CONFIG_DIR="${CONFIG_DIR}"
ARCHIVE_DIR="${ARCHIVE_DIR}"
CACHE_DIR="${CACHE_DIR}"
SERVICE_PORT="${SERVICE_PORT}"
DB_PATH="${CONFIG_DIR}/app.db"
EOF
    
    echo "$APP_VERSION" > "$VERSION_FILE"
    log_success "Configuration saved"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

create_backup() {
    local backup_dir="${APP_DIR}/backups"
    local backup_name="backup_$(date +%Y%m%d_%H%M%S)"
    local backup_path="${backup_dir}/${backup_name}"
    
    log_info "Creating backup..."
    
    mkdir -p "$backup_dir"
    mkdir -p "${backup_path}"
    
    # Backup database
    if [ -f "${CONFIG_DIR}/app.db" ]; then
        cp "${CONFIG_DIR}/app.db" "${backup_path}/app.db"
        log_success "Database backed up"
    fi
    
    # Backup current merged file
    if [ -f "${ARCHIVE_DIR}/merged.xml.gz" ]; then
        cp "${ARCHIVE_DIR}/merged.xml.gz" "${backup_path}/merged.xml.gz"
        log_success "Current merge backed up"
    fi
    
    # Backup config
    if [ -f "${APP_DIR}/.install_config" ]; then
        cp "${APP_DIR}/.install_config" "${backup_path}/.install_config"
    fi
    
    # Create backup manifest
    cat > "${backup_path}/manifest.txt" << EOF
Backup created: $(date)
Version: ${CURRENT_VERSION}
Contents:
- Database: app.db
- Merged file: merged.xml.gz
- Config: .install_config
EOF
    
    log_success "Backup created: ${backup_path}"
    echo "${backup_path}"
}

# ============================================================================
# SYSTEM DEPENDENCIES
# ============================================================================

install_system_dependencies() {
    log_info "Installing system dependencies..."
    
    apt-get update -qq 2>/dev/null || true
    
    log_info "Installing basic tools..."
    apt-get install -qq -y curl wget git vim sqlite3 build-essential \
        libssl-dev libffi-dev lsof 2>/dev/null || true
    
    log_info "Installing Python..."
    if ! command -v python3.13 &> /dev/null && ! command -v python3 &> /dev/null; then
        apt-get install -qq -y python3 python3-dev python3-venv python3-pip 2>/dev/null || true
    fi
    
    PYTHON_CMD=$(command -v python3.13 || command -v python3)
    log_success "Python: $($PYTHON_CMD --version)"
    
    log_info "Installing Node.js..."
    apt-get install -qq -y nodejs npm 2>/dev/null || true
    
    if command -v node &> /dev/null; then
        log_success "Node.js: $(node --version)"
    fi
    
    log_success "System dependencies installed"
}

# ============================================================================
# DIRECTORY SETUP
# ============================================================================

setup_directories() {
    log_info "Setting up directories..."
    
    mkdir -p "${APP_DIR}/backend"
    mkdir -p "${APP_DIR}/frontend/src"
    mkdir -p "${APP_DIR}/frontend/public"
    mkdir -p "${APP_DIR}/scripts"
    mkdir -p "${APP_DIR}/backups"
    mkdir -p "${CONFIG_DIR}"
    mkdir -p "${ARCHIVE_DIR}"
    mkdir -p "${CACHE_DIR}"
    
    log_success "Directories created"
}

# ============================================================================
# BACKEND SETUP
# ============================================================================

setup_backend() {
    log_info "Setting up backend..."
    
    cd "${APP_DIR}/backend"
    
    if [ "$INSTALL_MODE" == "update" ] && [ -d "venv" ]; then
        log_info "Updating existing virtual environment..."
        source venv/bin/activate
        pip install --upgrade pip setuptools wheel -q 2>/dev/null || true
    else
        log_info "Creating Python virtual environment..."
        $PYTHON_CMD -m venv venv
        source venv/bin/activate
        pip install --upgrade pip setuptools wheel -q 2>/dev/null || true
    fi
    
    log_info "Installing Python packages..."
    pip install \
        fastapi==0.104.1 \
        uvicorn==0.24.0 \
        python-multipart==0.0.6 \
        aiofiles==23.2.1 \
        sqlalchemy==2.0.23 \
        pydantic==2.5.0 \
        pydantic-settings==2.1.0 \
        websockets==12.0 \
        httpx==0.25.2 \
        beautifulsoup4==4.12.2 \
        croniter==2.0.1 \
        -q 2>/dev/null || true
    
    deactivate
    
    log_success "Backend setup complete"
}

# ============================================================================
# CREATE BACKEND CODE
# ============================================================================

create_backend_code() {
    log_info "Creating backend application..."
    
    # This will be a separate artifact with the full main.py code
    # For now, placeholder
    
    cat > "${APP_DIR}/backend/main.py" << 'BACKEND_CODE'
# Backend code will be inserted here
# This is handled by a separate artifact
BACKEND_CODE
    
    log_success "Backend code created"
}

# ============================================================================
# FRONTEND SETUP
# ============================================================================

setup_frontend() {
    log_info "Setting up frontend..."
    
    cd "${APP_DIR}/frontend"
    
    # Create package.json
    cat > package.json << 'PKG_JSON'
{
  "name": "epg-merge-app",
  "version": "0.1",
  "private": true,
  "homepage": "/",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build"
  },
  "devDependencies": {
    "react-scripts": "5.0.1"
  }
}
PKG_JSON
    
    # Create public/index.html
    mkdir -p public
    cat > public/index.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>EPG Merge Application</title>
</head>
<body>
  <div id="root"></div>
</body>
</html>
HTML
    
    # Create src/index.js
    mkdir -p src
    cat > src/index.js << 'INDEX_JS'
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
INDEX_JS
    
    log_success "Frontend structure created"
}

# ============================================================================
# BUILD SCRIPT
# ============================================================================

create_build_script() {
    log_info "Creating build script..."
    
    cat > "${APP_DIR}/scripts/build.sh" << 'BUILD_SCRIPT'
#!/bin/bash
set -e

source /opt/epg-merge-app/.install_config

echo "🎬 Building EPG Merge Frontend"
echo "================================"
echo ""

cd "${APP_DIR}/frontend"

echo "Cleaning previous builds..."
rm -rf build node_modules
echo "✅ Cleaned"

echo "Installing dependencies..."
npm install --legacy-peer-deps -q 2>/dev/null || npm install --legacy-peer-deps
echo "✅ Dependencies installed"

echo "Building React application..."
npm run build
echo "✅ Build complete"

echo "Deploying to backend..."
rm -rf "${APP_DIR}/backend/static"
mv "${APP_DIR}/frontend/build" "${APP_DIR}/backend/static"

# Fix nested static folder
if [ -d "${APP_DIR}/backend/static/static" ]; then
    mv "${APP_DIR}/backend/static/static"/* "${APP_DIR}/backend/static/" || true
    rmdir "${APP_DIR}/backend/static/static" 2>/dev/null || true
fi

echo "✅ Deployed"

echo "Restarting service..."
systemctl restart epg-merge
sleep 3

if systemctl is-active --quiet epg-merge; then
    echo "✅ Service restarted"
    echo ""
    echo "Access: http://$(hostname -I | awk '{print $1}'):${SERVICE_PORT}"
else
    echo "❌ Service failed to restart"
    journalctl -u epg-merge -n 10
    exit 1
fi
BUILD_SCRIPT
    
    chmod +x "${APP_DIR}/scripts/build.sh"
    log_success "Build script created"
}

# ============================================================================
# UPDATE SCRIPT
# ============================================================================

create_update_script() {
    log_info "Creating update script..."
    
    cat > "${APP_DIR}/scripts/update.sh" << 'UPDATE_SCRIPT'
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
UPDATE_SCRIPT
    
    chmod +x "${APP_DIR}/scripts/update.sh"
    log_success "Update script created"
}

# ============================================================================
# SYSTEMD SERVICE
# ============================================================================

create_systemd_service() {
    log_info "Creating systemd service..."
    
    cat > /etc/systemd/system/epg-merge.service << SERVICE_TEMPLATE
[Unit]
Description=EPG Merge Application
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/backend
Environment="CONFIG_DIR=${CONFIG_DIR}"
Environment="ARCHIVE_DIR=${ARCHIVE_DIR}"
Environment="CACHE_DIR=${CACHE_DIR}"
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port ${SERVICE_PORT} --workers 1
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE_TEMPLATE
    
    systemctl daemon-reload
    systemctl enable epg-merge
    
    log_success "Systemd service created"
}

# ============================================================================
# MAIN INSTALLATION FLOW
# ============================================================================

main() {
    show_banner
    
    # Pre-checks
    check_root
    check_os
    
    # Detect existing installation
    if detect_installation; then
        CURRENT_VERSION=$(cat "$VERSION_FILE")
        
        if ! check_upgrade_compatibility "$CURRENT_VERSION"; then
            exit 1
        fi
        
        # Load existing config
        if load_existing_config; then
            log_info "Using existing configuration"
            
            if confirm_action "Use existing directories?"; then
                INSTALL_MODE="update"
            else
                prompt_installation_mode
                prompt_directories
            fi
        else
            prompt_installation_mode
            prompt_directories
        fi
        
        # Create backup for updates
        if [ "$INSTALL_MODE" == "update" ] || [ "$INSTALL_MODE" == "reinstall" ]; then
            BACKUP_PATH=$(create_backup)
        fi
    else
        # Fresh installation
        INSTALL_MODE="fresh"
        prompt_directories
    fi
    
    # Installation steps
    log_info "Starting installation: ${INSTALL_MODE} mode"
    echo ""
    
    install_system_dependencies
    setup_directories
    setup_backend
    setup_frontend
    create_build_script
    create_update_script
    create_systemd_service
    save_install_config
    
    # Set permissions
    log_info "Setting permissions..."
    chmod -R 755 "${APP_DIR}"
    chmod -R 755 "${CONFIG_DIR}"
    log_success "Permissions set"
    
    # Start service
    log_info "Starting service..."
    systemctl start epg-merge
    sleep 3
    
    if systemctl is-active --quiet epg-merge; then
        log_success "Service started"
    else
        log_error "Service failed to start"
        journalctl -u epg-merge -n 20
        exit 1
    fi
    
    # Build frontend
    log_info "Building frontend..."
    bash "${APP_DIR}/scripts/build.sh"
    
    # Completion
    show_completion_message
}

show_completion_message() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ INSTALLATION COMPLETE ✅                    ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Installation Summary:${NC}"
    echo -e "  • Version: ${BLUE}${APP_VERSION}${NC}"
    echo -e "  • Mode: ${BLUE}${INSTALL_MODE}${NC}"
    echo -e "  • App Directory: ${BLUE}${APP_DIR}${NC}"
    echo -e "  • Config Directory: ${BLUE}${CONFIG_DIR}${NC}"
    echo -e "  • Port: ${BLUE}${SERVICE_PORT}${NC}"
    
    if [ -n "$BACKUP_PATH" ]; then
        echo -e "  • Backup: ${BLUE}${BACKUP_PATH}${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}📍 Access the application:${NC}"
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo -e "  ${BLUE}http://${SERVER_IP}:${SERVICE_PORT}${NC}"
    echo ""
    echo -e "${YELLOW}📋 Common Commands:${NC}"
    echo -e "  ${BLUE}systemctl status epg-merge${NC}        # Check status"
    echo -e "  ${BLUE}systemctl restart epg-merge${NC}       # Restart service"
    echo -e "  ${BLUE}journalctl -u epg-merge -f${NC}        # View logs"
    echo -e "  ${BLUE}bash ${APP_DIR}/scripts/build.sh${NC}  # Rebuild frontend"
    echo -e "  ${BLUE}bash ${APP_DIR}/scripts/update.sh${NC} # Update app"
    echo ""
    echo -e "${YELLOW}🔍 Configuration:${NC}"
    echo -e "  ${BLUE}${APP_DIR}/.install_config${NC}"
    echo ""
}

# Run main installation
main