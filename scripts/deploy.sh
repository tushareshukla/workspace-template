#!/bin/bash
set -e

echo "=========================================="
echo "  Workspace Deployment Script"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
WORKSPACE_NAME=${WORKSPACE_NAME:-"workspace"}
DEPLOY_ENV=${DEPLOY_ENV:-"production"}

echo -e "\n${YELLOW}Deploying: ${WORKSPACE_NAME}${NC}"
echo -e "${YELLOW}Environment: ${DEPLOY_ENV}${NC}\n"

# Load environment
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Pull latest images
echo -e "${YELLOW}Pulling latest images...${NC}"
docker-compose pull

# Build custom images
echo -e "${YELLOW}Building images...${NC}"
docker-compose build --no-cache

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
docker-compose down

# Start containers
echo -e "${YELLOW}Starting containers...${NC}"
docker-compose up -d

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 10

# Health check
check_health() {
    local service=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
            return 0
        fi
        echo "Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done

    echo -e "${RED}✗ $service failed to start${NC}"
    return 1
}

check_health "API" "http://localhost:4000/health"
check_health "Dashboard" "http://localhost:3001"

# Show status
echo -e "\n${GREEN}=========================================="
echo -e "  Deployment Complete!"
echo -e "==========================================${NC}"
echo ""
docker-compose ps
echo ""
echo -e "Dashboard: ${GREEN}http://${WORKSPACE_DOMAIN:-localhost}${NC}"
echo ""
