#!/bin/bash
#
# First-time VM Setup Script for AWS Lightsail
# Run this ONCE when setting up a new VM
#
set -e

echo "=========================================="
echo "  Workspace VM Setup (First Time)"
echo "=========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
REPO_URL="${REPO_URL:-https://github.com/tushareshukla/workspace-template.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/workspace}"

echo -e "\n${YELLOW}[1/6] Updating system...${NC}"
sudo apt-get update && sudo apt-get upgrade -y

echo -e "\n${YELLOW}[2/6] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker $USER
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

echo -e "\n${YELLOW}[3/6] Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

echo -e "\n${YELLOW}[4/6] Installing Node.js & pnpm...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js installed${NC}"
else
    echo -e "${GREEN}✓ Node.js already installed${NC}"
fi

if ! command -v pnpm &> /dev/null; then
    sudo npm install -g pnpm
    echo -e "${GREEN}✓ pnpm installed${NC}"
else
    echo -e "${GREEN}✓ pnpm already installed${NC}"
fi

echo -e "\n${YELLOW}[5/6] Cloning repository...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo -e "${YELLOW}Directory exists, pulling latest...${NC}"
    cd $INSTALL_DIR
    git pull
else
    sudo mkdir -p $INSTALL_DIR
    sudo chown $USER:$USER $INSTALL_DIR
    git clone $REPO_URL $INSTALL_DIR
fi
cd $INSTALL_DIR

echo -e "\n${YELLOW}[6/6] Setting up environment...${NC}"
if [ ! -f .env ]; then
    cp .env.example .env
    echo -e "${YELLOW}⚠ Created .env file - PLEASE EDIT IT with your settings:${NC}"
    echo "   nano $INSTALL_DIR/.env"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

# Create data directories
mkdir -p data/api data/openclaw

echo -e "\n${GREEN}=========================================="
echo -e "  Setup Complete!"
echo -e "==========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Edit your .env file:"
echo "     nano $INSTALL_DIR/.env"
echo ""
echo "  2. Start the services:"
echo "     cd $INSTALL_DIR && ./scripts/vm-deploy.sh"
echo ""
echo "  3. Access your dashboard at:"
echo "     http://YOUR_VM_IP:3001"
echo ""
