# Prospyr Command Center

AI-powered business management dashboard with multi-agent orchestration.

## Features

- **Dashboard UI** - Next.js dashboard at `control.simplifyingbusinesses.com`
- **Task Management** - Create, assign, and track tasks across agents
- **Real-time Chat** - Queue-based chat between agents and users
- **Agent Registry** - Register and manage AI agents via SSE
- **Railway Deployment** - Docker-based deployment

## Quick Start

```bash
npm install
npm run dev
```

## Architecture

```
├── app/
│   ├── api/
│   │   ├── chat/          # Chat API (queue-based)
│   │   └── prospyr/
│   │       ├── tasks/     # Task CRUD API
│   │       └── events/    # Agent registration via SSE
│   └── page.tsx          # Dashboard UI
├── agents/                # Agent implementations
├── lib/
│   ├── queue.ts           # In-memory message queue
│   ├── storage.ts         # File-based persistence
│   └── types.ts          # Shared TypeScript types
├── orchestrator/         # Multi-agent orchestration
└── agent-sse.js          # Agent polling client
```

## Environment Variables

```bash
# Railway (auto-configured)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Multica Integration

This project integrates with **Multica** for visual task management:

- Workspace: `Franklin Bryant's Workspace` (Multica cloud)
- Agents connect via `multica daemon start`
- See https://app.multica.ai for visual issue board

```bash
# Install Multica CLI
curl -fsSL https://raw.githubusercontent.com/multica-ai/multica/main/scripts/install.sh | bash

# Authenticate
multica login --token YOUR_TOKEN

# Start daemon
multica daemon start
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/chat` | Chat messages |
| GET | `/api/prospyr/tasks` | List tasks |
| POST | `/api/prospyr/tasks` | Create task |
| PATCH | `/api/prospyr/tasks` | Update task |
| GET | `/api/prospyr/events` | SSE agent events |

## Agent Setup

Agents run locally and connect via SSE:

```bash
node agent-sse.js
```

The agent polls for messages and responds via the chat API.

## Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, TypeScript
- **Backend**: Next.js API routes
- **Real-time**: Server-Sent Events (SSE) + polling
- **Agents**: OpenClaw, Claude Code
- **Deployment**: Railway (Docker)
- **Task Management**: Multica (visual layer)

## License

Proprietary - All Lines Automotive / Prospyr Inc.
