# Workspace Template

A scalable, multi-agent AI workspace with a Mission Control dashboard.

## Architecture

```
workspace-template/
├── apps/
│   ├── dashboard/          # Next.js Dashboard UI
│   └── api/                # Express Backend API
├── packages/
│   ├── types/              # Shared TypeScript types
│   ├── database/           # Database client (Drizzle + SQLite)
│   └── openclaw-client/    # OpenClaw integration
├── infra/
│   ├── docker/             # Dockerfiles
│   └── nginx/              # Nginx config
├── scripts/                # Setup & deployment scripts
└── docker-compose.yml      # Container orchestration
```

## Features

- **Kanban Board**: Drag-and-drop task management
- **Real-time Updates**: WebSocket-powered live updates
- **Multi-Agent Support**: Spawn and manage multiple AI agents
- **Human-in-the-Loop**: Block tasks for human input
- **Activity Feed**: Live stream of agent activities
- **Isolated OpenClaw**: Sandboxed AI execution

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Development

```bash
# Install dependencies
pnpm install

# Run database migrations
pnpm db:migrate

# Seed sample data (optional)
pnpm db:seed

# Start development servers
pnpm dev
```

Dashboard: http://localhost:3001
API: http://localhost:4000

### Production (Docker)

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: OPENROUTER_API_KEY, WORKSPACE_ID

# Run setup script
./scripts/setup.sh

# Deploy
./scripts/deploy.sh
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENROUTER_API_KEY` | Your OpenRouter API key | Yes |
| `WORKSPACE_ID` | Unique workspace identifier | Yes |
| `WORKSPACE_DOMAIN` | Domain for the dashboard | No |
| `JWT_SECRET` | Secret for JWT tokens | No |

## API Endpoints

### Tasks

- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `POST /api/tasks/:id/assign` - Assign to agent
- `POST /api/tasks/:id/unblock` - Resolve block

### Agents

- `GET /api/agents` - List agents
- `POST /api/agents` - Create agent
- `PATCH /api/agents/:id` - Update agent

### Dashboard

- `GET /api/dashboard` - Full dashboard data
- `GET /api/dashboard/stats` - Quick stats

## WebSocket Events

Connect to `ws://localhost:4001` for real-time updates:

- `task_update` - Task changed
- `agent_update` - Agent status changed
- `activity` - New activity
- `output_delta` - Live agent output

## Security

OpenClaw runs in an isolated Docker container with:

- Read-only filesystem (except /data)
- Dropped capabilities
- No privilege escalation
- Resource limits (CPU/Memory)
- Isolated network

## License

MIT
