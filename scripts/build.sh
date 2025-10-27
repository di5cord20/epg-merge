#!/bin/bash
# EPG Merge App - Frontend Build Script
# Builds React frontend from source and deploys to backend
# Version: 0.3.0

set -e

# Load configuration
if [ -f "/opt/epg-merge-app/.install_config" ]; then
    source "/opt/epg-merge-app/.install_config"
else
    echo "Error: Installation config not found"
    exit 1
fi

FRONTEND_DIR="${APP_DIR}/frontend"
BACKEND_DIR="${APP_DIR}/backend"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         EPG Merge App - Frontend Build v0.3.0             ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# VALIDATION
# ============================================================================

validate_source_files() {
    echo "[1/7] Validating source files..."
    
    local required_files=(
        "src/index.js"
        "src/App.js"
        "src/App.css"
        "public/index.html"
        "package.json"
    )
    
    local missing=0
    for file in "${required_files[@]}"; do
        if [ ! -f "${FRONTEND_DIR}/${file}" ]; then
            echo -e "  ${RED}✗ Missing: ${file}${NC}"
            ((missing++))
        fi
    done
    
    if [ $missing -gt 0 ]; then
        echo -e "  ${RED}Error: ${missing} required file(s) missing${NC}"
        exit 1
    fi
    
    echo -e "  ${GREEN}✓ All source files present${NC}"
}

# ============================================================================
# DEPENDENCIES
# ============================================================================

install_dependencies() {
    echo "[2/7] Installing Node.js dependencies..."
    
    cd "${FRONTEND_DIR}"
    
    # Clean previous installs
    if [ -d "node_modules" ]; then
        echo "  Removing previous node_modules..."
        rm -rf node_modules package-lock.json
    fi
    
    # Install dependencies
    echo "  Running npm install..."
    if ! npm install --legacy-peer-deps 2>&1 | tail -5; then
        echo -e "  ${RED}Error: npm install failed${NC}"
        exit 1
    fi
    
    echo -e "  ${GREEN}✓ Dependencies installed${NC}"
}

# ============================================================================
# VALIDATION: SOURCE CODE
# ============================================================================

validate_source_code() {
    echo "[3/7] Validating React source code..."
    
    # Check for common syntax errors
    if ! grep -q "function App" "${FRONTEND_DIR}/src/App.js" && \
       ! grep -q "export.*App" "${FRONTEND_DIR}/src/App.js"; then
        echo -e "  ${RED}Warning: App.js might not export App component${NC}"
    fi
    
    # Check for ReactDOM render
    if ! grep -q "ReactDOM.createRoot" "${FRONTEND_DIR}/src/index.js"; then
        echo -e "  ${RED}Warning: index.js might not render app${NC}"
    fi
    
    echo -e "  ${GREEN}✓ Source code validated${NC}"
}

# ============================================================================
# BUILD
# ============================================================================

build_react() {
    echo "[4/7] Building React application..."
    
    cd "${FRONTEND_DIR}"
    
    # Set production environment
    export REACT_APP_VERSION="${APP_VERSION}"
    export NODE_ENV=production
    
    # Run build
    if ! npm run build 2>&1 | tail -10; then
        echo -e "  ${RED}Error: Build failed${NC}"
        exit 1
    fi
    
    # Verify build output
    if [ ! -d "build" ]; then
        echo -e "  ${RED}Error: Build directory not created${NC}"
        exit 1
    fi
    
    BUILD_FILES=$(find build -type f | wc -l)
    echo -e "  ${GREEN}✓ Build successful - ${BUILD_FILES} files generated${NC}"
}

# ============================================================================
# DEPLOYMENT
# ============================================================================

deploy_to_backend() {
    echo "[5/7] Deploying to backend..."
    
    # Remove old static files
    if [ -d "${BACKEND_DIR}/static" ]; then
        echo "  Removing previous build..."
        rm -rf "${BACKEND_DIR}/static"
    fi
    
    # Move build to backend
    echo "  Moving build to backend/static..."
    mv "${FRONTEND_DIR}/build" "${BACKEND_DIR}/static"
    
    # Fix nested static folder (if it exists from old builds)
    if [ -d "${BACKEND_DIR}/static/static" ]; then
        echo "  Fixing nested static folder..."
        mv "${BACKEND_DIR}/static/static"/* "${BACKEND_DIR}/static/" 2>/dev/null || true
        rmdir "${BACKEND_DIR}/static/static" 2>/dev/null || true
    fi
    
    STATIC_FILES=$(find "${BACKEND_DIR}/static" -type f | wc -l)
    echo -e "  ${GREEN}✓ Deployed ${STATIC_FILES} files${NC}"
}

# ============================================================================
# SERVICE RESTART
# ============================================================================

restart_service() {
    echo "[6/7] Restarting service..."
    
    # Stop service
    systemctl stop epg-merge 2>/dev/null || true
    sleep 2
    
    # Start service
    if ! systemctl start epg-merge; then
        echo -e "  ${RED}Error: Failed to start service${NC}"
        systemctl status epg-merge
        exit 1
    fi
    
    # Wait for service to be ready
    sleep 3
    
    # Verify service
    if systemctl is-active --quiet epg-merge; then
        echo -e "  ${GREEN}✓ Service restarted successfully${NC}"
    else
        echo -e "  ${RED}Error: Service failed to start${NC}"
        journalctl -u epg-merge -n 10
        exit 1
    fi
}

# ============================================================================
# VERIFICATION
# ============================================================================

verify_build() {
    echo "[7/7] Verifying build..."
    
    local errors=0
    
    # Check backend static
    if [ ! -f "${BACKEND_DIR}/static/index.html" ]; then
        echo -e "  ${RED}✗ index.html not found in backend/static${NC}"
        ((errors++))
    else
        echo -e "  ${GREEN}✓ index.html present${NC}"
    fi
    
    # Check service
    if systemctl is-active --quiet epg-merge; then
        echo -e "  ${GREEN}✓ Service running${NC}"
    else
        echo -e "  ${RED}✗ Service not running${NC}"
        ((errors++))
    fi
    
    # Test API
    echo -n "  Testing API endpoint... "
    if curl -s http://localhost:${SERVICE_PORT}/api/health | grep -q "healthy"; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        ((errors++))
    fi
    
    if [ $errors -eq 0 ]; then
        echo -e "  ${GREEN}✓ All verifications passed${NC}"
        return 0
    else
        echo -e "  ${RED}✗ ${errors} verification(s) failed${NC}"
        return 1
    fi
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

main() {
    local start_time=$(date +%s)
    
    # Run build steps
    validate_source_files
    install_dependencies
    validate_source_code
    build_react
    deploy_to_backend
    restart_service
    
    if ! verify_build; then
        echo ""
        echo -e "${YELLOW}Build completed with warnings. Check logs:${NC}"
        echo -e "  ${BLUE}journalctl -u epg-merge -n 50${NC}"
        exit 1
    fi
    
    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Success message
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✓ Build Complete (${duration}s)                         ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    SERVER_IP=$(hostname -I | awk '{print $1}')
    echo -e "${BLUE}Access the application:${NC}"
    echo -e "  ${GREEN}http://${SERVER_IP}:${SERVICE_PORT}${NC}"
    echo ""
    
    echo -e "${BLUE}Useful commands:${NC}"
    echo -e "  Logs: ${GREEN}journalctl -u epg-merge -f${NC}"
    echo -e "  Status: ${GREEN}systemctl status epg-merge${NC}"
    echo -e "  Rebuild: ${GREEN}bash ${APP_DIR}/scripts/build.sh${NC}"
    echo ""
}

# Run main function
main