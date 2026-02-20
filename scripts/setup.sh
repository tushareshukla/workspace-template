#!/bin/bash
set -e

echo "=========================================="
echo "  Workspace Setup Script"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required environment variables
check_env() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}Error: $1 is not set${NC}"
        exit 1
    fi
}

echo -e "\n${YELLOW}Checking requirements...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker installed${NC}"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose installed${NC}"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✓ Environment file loaded${NC}"
else
    echo -e "${YELLOW}No .env file found. Creating from template...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please edit .env file with your configuration${NC}"
    exit 1
fi

# Check required env vars
echo -e "\n${YELLOW}Checking environment variables...${NC}"
check_env "OPENROUTER_API_KEY"
check_env "WORKSPACE_ID"
echo -e "${GREEN}✓ Required environment variables set${NC}"

# Create data directories
echo -e "\n${YELLOW}Creating data directories...${NC}"
mkdir -p data/api
mkdir -p data/openclaw
echo -e "${GREEN}✓ Data directories created${NC}"

# Build containers
echo -e "\n${YELLOW}Building Docker containers...${NC}"
docker-compose build

# Run database migrations
echo -e "\n${YELLOW}Running database migrations...${NC}"
docker-compose run --rm api npm run db:migrate

# Seed database (optional)
read -p "Do you want to seed the database with sample data? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose run --rm api npm run db:seed
    echo -e "${GREEN}✓ Database seeded${NC}"
fi

echo -e "\n${GREEN}=========================================="
echo -e "  Setup Complete!"
echo -e "==========================================${NC}"
echo ""
echo "To start the workspace:"
echo "  docker-compose up -d"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "Dashboard will be available at:"
echo "  http://localhost (or your configured domain)"
echo ""
