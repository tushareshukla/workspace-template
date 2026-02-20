#!/bin/bash
#
# Quick Deploy Script
# Run this to pull latest changes and redeploy
#
set -e

echo "=========================================="
echo "  Workspace Deploy"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

INSTALL_DIR="${INSTALL_DIR:-/opt/workspace}"
cd $INSTALL_DIR

echo -e "\n${YELLOW}[1/4] Pulling latest code...${NC}"
git pull origin main

echo -e "\n${YELLOW}[2/4] Installing dependencies...${NC}"
pnpm install

echo -e "\n${YELLOW}[3/4] Running database migrations...${NC}"
pnpm db:migrate

echo -e "\n${YELLOW}[4/4] Restarting services...${NC}"

# Check if using Docker or running directly
if [ "$USE_DOCKER" = "true" ]; then
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo -e "${GREEN}✓ Docker containers restarted${NC}"
else
    # Kill existing processes
    pkill -f "tsx.*api" 2>/dev/null || true
    pkill -f "next.*dashboard" 2>/dev/null || true
    sleep 2

    # Start in background with logs
    echo -e "${YELLOW}Starting API...${NC}"
    cd $INSTALL_DIR/apps/api
    nohup pnpm dev > /var/log/workspace-api.log 2>&1 &

    echo -e "${YELLOW}Starting Dashboard...${NC}"
    cd $INSTALL_DIR/apps/dashboard
    nohup pnpm dev > /var/log/workspace-dashboard.log 2>&1 &

    cd $INSTALL_DIR
    echo -e "${GREEN}✓ Services started${NC}"
fi

echo -e "\n${GREEN}=========================================="
echo -e "  Deploy Complete!"
echo -e "==========================================${NC}"
echo ""
echo "Services:"
echo "  Dashboard: http://localhost:3001"
echo "  API:       http://localhost:4000"
echo "  WebSocket: ws://localhost:4001"
echo ""
echo "Logs:"
echo "  API:       tail -f /var/log/workspace-api.log"
echo "  Dashboard: tail -f /var/log/workspace-dashboard.log"
echo ""
