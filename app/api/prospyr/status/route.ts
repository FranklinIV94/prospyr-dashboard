// API route: /api/prospyr/status
// Returns current platform status and agent states from the shared store

import { connectedAgents } from '@/lib/store'

export async function GET() {
  const agents = Array.from(connectedAgents.values()).map(a => ({
    ...a,
    connected: true,
  }))

  return Response.json({
    agents,
    stats: {
      totalTasks: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
    },
    initialized: agents.length > 0,
    timestamp: new Date().toISOString(),
  })
}
