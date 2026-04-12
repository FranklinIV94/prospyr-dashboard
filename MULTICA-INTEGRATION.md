# Prospyr + Multica Integration

## Decision: Option C - Hybrid Visual Integration

**Keep our current Prospyr dashboard + use Multica visually for task management.**

Multica becomes the "pretty face" for task management while we keep our custom API for agent communication and dashboard UI.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Prospyr Command Center (Dashboard)                          │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Tasks UI   │  │  Chat Panel  │  │  Agent View  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                 │                │
│         ↓                 ↓                 ↓                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Our Tasks API │  │  Chat API   │  │  Agent Reg   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ↓
              ┌───────────────────────┐
              │  Multica (Web/Visual) │
              │                       │
              │  • Issue Board        │
              │  • Task Management    │
              │  • Skills Compounding │
              │  • Visual Reports     │
              └───────────────────────┘
```

## What We Keep (Prospyr)

- Dashboard UI with tasks, chat, agent views
- Chat API (queue-based, real-time)
- Agent registration via SSE
- "New Task" button functionality
- All custom All Lines features
- Agent orchestration on your local machine

## What We Use Multica For (Visual)

- Issue board for visual task tracking
- GitHub-style issue management
- Agent skill tracking
- Team collaboration
- Reports and analytics
- **https://app.multica.ai** → open in browser

## Current Status

| Component | Status |
|-----------|--------|
| Multica account | ✅ Connected |
| Workspace | ✅ `Franklin Bryant's Workspace` |
| Daemon | ✅ Running (pid 623639) |
| Runtimes | ✅ 2 online (Claude, OpenClaw) |
| CLI auth | ✅ Authenticated |
| Server API | ⏸️ CLI token ≠ server token |

## Multica CLI Commands

```bash
# Authenticate
export PATH="$HOME/bin:$PATH" && multica login --token YOUR_TOKEN

# Daemon
multica daemon start    # Start daemon
multica daemon status   # Check status

# Issues
multica issue list                    # List all issues
multica issue create --title "..."   # Create issue
multica issue create --title "Fix login bug" --description "Users can't log in on mobile" --priority high
multica issue get FRA-1              # Get issue details
multica issue update FRA-1 --status in_progress  # Move to in progress
multica issue update FRA-1 --status done         # Mark done

# Agents & Runtimes
multica agent list                   # List agents
multica runtime list                 # List runtimes
multica skill list                   # List skills
```

## Environment Variables (for future)

```bash
MULTICA_TOKEN=mul_75f5e991f1a073a3dfe3f222f4ea3ca3ccfeeab6
MULTICA_WORKSPACE_ID=867ea099-de9d-4755-9609-10a0147c4d28
```

## Next Steps

1. [ ] Use Multica visually at https://app.multica.ai
2. [ ] Add "Open in Multica" link in Prospyr dashboard
3. [ ] Create issues in Multica for important tasks
4. [ ] Agents pick up work via daemon (already connected)

## Benefits of This Approach

| Aspect | Prospyr | Multica |
|--------|---------|---------|
| Task persistence | Railway memory (loses on restart) | ✅ Persists forever |
| Visual board | ❌ Basic list | ✅ GitHub-style kanban |
| Agent integration | ✅ Custom SSE | ✅ Built-in daemon |
| Skills | MemPalace | ✅ Built-in compounding |
| Chat | ✅ Real-time | ❌ Not real-time |
| Railway cost | $5/mo | ✅ Free cloud |
| Custom features | ✅ All Lines specific | ❌ Generic |

## Quick Start for Franklin

1. Open **https://app.multica.ai** in browser
2. Login with your Google account
3. Create issues for tasks you want to track
4. Assign to agents → they auto-pickup via daemon
5. Watch them work, see progress in real-time

The daemon running on your machine handles all agent communication automatically.
