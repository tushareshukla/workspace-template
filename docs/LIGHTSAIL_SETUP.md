# AWS Lightsail Setup Guide

Complete guide to deploy workspace-template on AWS Lightsail.

## Step 1: Create Lightsail Instance

1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click **Create instance**
3. Select:
   - **Region**: Choose closest to you
   - **Platform**: Linux/Unix
   - **Blueprint**: Ubuntu 22.04 LTS
   - **Instance plan**: $10/mo (2GB RAM) minimum, $20/mo (4GB RAM) recommended
4. Name it: `workspace-vm`
5. Click **Create instance**

## Step 2: Configure Networking

1. Go to your instance → **Networking** tab
2. Click **Add rule** under Firewall:

   | Application | Protocol | Port  |
   |-------------|----------|-------|
   | Custom      | TCP      | 3001  | (Dashboard)
   | Custom      | TCP      | 4000  | (API)
   | Custom      | TCP      | 4001  | (WebSocket)

3. **Optional**: Attach a static IP
   - Click **Create static IP**
   - Attach to your instance
## Step 3: Connect to VM

### Option A: Browser SSH
- Click **Connect using SSH** button in Lightsail console

### Option B: Terminal SSH
```bash
# Download your SSH key from Lightsail → Account → SSH keys
chmod 400 ~/Downloads/LightsailDefaultKey-*.pem

# Connect
ssh -i ~/Downloads/LightsailDefaultKey-*.pem ubuntu@YOUR_VM_IP
```

## Step 4: Run Setup Script

Once connected to VM:

```bash
# Download and run setup script
curl -fsSL https://raw.githubusercontent.com/tushareshukla/workspace-template/main/scripts/vm-setup.sh | bash
```

Or manually:

```bash
# Clone repo
git clone https://github.com/tushareshukla/workspace-template.git /opt/workspace
cd /opt/workspace

# Run setup
chmod +x scripts/vm-setup.sh
./scripts/vm-setup.sh
```

## Step 5: Configure Environment

```bash
cd /opt/workspace
nano .env
```

Set these values:
```env
# Required
WORKSPACE_ID=my-workspace-123

# OpenClaw (if running separately)
OPENCLAW_GATEWAY_URL=http://YOUR_OPENCLAW_IP:3000
OPENCLAW_WS_URL=ws://YOUR_OPENCLAW_IP:3000/ws

# Optional
NODE_ENV=production
```

## Step 6: Deploy

```bash
cd /opt/workspace
./scripts/vm-deploy.sh
```

## Step 7: Access Dashboard

Open in browser:
```
http://YOUR_VM_IP:3001
```

## Daily Workflow

### On your local machine (after making changes):
```bash
cd workspace-template
git add .
git commit -m "Your changes"
git push
```

### On the VM (to deploy changes):
```bash
cd /opt/workspace
./scripts/vm-deploy.sh
```

Or just pull without full redeploy:
```bash
cd /opt/workspace
git pull
```

## Useful Commands

### View logs
```bash
# API logs
tail -f /var/log/workspace-api.log

# Dashboard logs
tail -f /var/log/workspace-dashboard.log
```

### Restart services
```bash
cd /opt/workspace
./scripts/vm-deploy.sh
```

### Stop services
```bash
pkill -f "tsx.*api"
pkill -f "next.*dashboard"
```

### Check if services are running
```bash
ps aux | grep -E "(tsx|next)"
```

## Optional: Auto-start on Boot

```bash
# Copy service file
sudo cp /opt/workspace/scripts/workspace.service /etc/systemd/system/

# Enable auto-start
sudo systemctl enable workspace

# Start now
sudo systemctl start workspace

# Check status
sudo systemctl status workspace
```

## Troubleshooting

### Port already in use
```bash
# Find what's using the port
sudo lsof -i :3001
sudo lsof -i :4000

# Kill it
sudo kill -9 <PID>
```

### Permission denied
```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /opt/workspace
```

### Out of memory
- Upgrade to larger Lightsail instance ($20/mo for 4GB RAM)
- Or add swap:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
