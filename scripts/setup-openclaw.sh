#!/bin/bash
#
# OpenClaw Automated Setup Script
# Usage: curl -fsSL https://raw.githubusercontent.com/tushareshukla/workspace-template/main/scripts/setup-openclaw.sh | bash -s -- --api-key "YOUR_API_KEY"
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
LLM_PROVIDER="minimax"
GATEWAY_MODE="local"
GATEWAY_PORT="18789"
API_KEY=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-key)
            API_KEY="$2"
            shift 2
            ;;
        --provider)
            LLM_PROVIDER="$2"
            shift 2
            ;;
        --port)
            GATEWAY_PORT="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

echo -e "${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║     🦞 OpenClaw Automated Setup 🦞       ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check if API key is provided
if [ -z "$API_KEY" ]; then
    echo -e "${RED}Error: API key is required${NC}"
    echo "Usage: $0 --api-key YOUR_API_KEY [--provider minimax] [--port 18789]"
    exit 1
fi

# Step 1: Install OpenClaw
echo -e "${YELLOW}[1/6] Installing OpenClaw...${NC}"
if command -v openclaw &> /dev/null; then
    echo "OpenClaw already installed, upgrading..."
    npm update -g openclaw 2>/dev/null || npm install -g openclaw@latest
else
    curl -fsSL https://openclaw.ai/install.sh | bash
fi

# Wait for installation
sleep 2

# Step 2: Stop any existing OpenClaw instance
echo -e "${YELLOW}[2/6] Stopping existing OpenClaw instances...${NC}"
openclaw stop 2>/dev/null || true
sleep 2

# Step 3: Configure gateway mode
echo -e "${YELLOW}[3/6] Configuring gateway mode...${NC}"
openclaw config set gateway.mode "$GATEWAY_MODE"
openclaw config set gateway.port "$GATEWAY_PORT"

# Step 4: Configure LLM provider
echo -e "${YELLOW}[4/6] Configuring LLM provider ($LLM_PROVIDER)...${NC}"
openclaw config set llm.provider "$LLM_PROVIDER"
openclaw config set llm.apiKey "$API_KEY"

# Step 5: Generate gateway token
echo -e "${YELLOW}[5/6] Setting up gateway authentication...${NC}"
GATEWAY_TOKEN=$(openssl rand -hex 32)
openclaw config set gateway.token "$GATEWAY_TOKEN"
openclaw config set gateway.auth.enabled true

# Step 6: Start OpenClaw
echo -e "${YELLOW}[6/6] Starting OpenClaw...${NC}"
openclaw start

# Wait for startup
sleep 3

# Get status
echo -e "${GREEN}"
echo "╔══════════════════════════════════════════╗"
echo "║     ✅ OpenClaw Setup Complete!          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

echo ""
echo "Configuration:"
echo "  Provider:     $LLM_PROVIDER"
echo "  Gateway Mode: $GATEWAY_MODE"
echo "  Gateway Port: $GATEWAY_PORT"
echo ""
echo "Connection URLs (for your workspace API):"
echo "  OPENCLAW_GATEWAY_URL=http://localhost:$GATEWAY_PORT"
echo "  OPENCLAW_WS_URL=ws://localhost:$GATEWAY_PORT"
echo ""
echo "Gateway Token (save this!):"
echo "  $GATEWAY_TOKEN"
echo ""
echo "To check status:"
echo "  openclaw status"
echo ""
echo "To view logs:"
echo "  openclaw logs --follow"
echo ""

# Save config to file for reference
CONFIG_FILE="$HOME/.openclaw-setup-info"
cat > "$CONFIG_FILE" << EOF
# OpenClaw Setup Info - $(date)
OPENCLAW_GATEWAY_URL=http://localhost:$GATEWAY_PORT
OPENCLAW_WS_URL=ws://localhost:$GATEWAY_PORT
GATEWAY_TOKEN=$GATEWAY_TOKEN
LLM_PROVIDER=$LLM_PROVIDER
EOF

echo "Config saved to: $CONFIG_FILE"
echo ""

# Final status check
openclaw status
