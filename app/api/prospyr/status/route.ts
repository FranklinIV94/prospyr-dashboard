// API route: /api/prospyr/status
// Returns current platform status and agent states

import type { NextRequest } from 'next/server'

// In-memory state for demo (would be Redis/database in production)
const platformState = {
  initialized: false,
  agents: [
    {
      id: 'supervisor-001',
      name: 'CEO Agent',
      role: 'ceo',
      status: 'idle',
      capabilities: ['strategy', 'delegation', 'planning', 'memory'],
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'coo-southstar-001',
      name: 'Southstar',
      role: 'coo',
      status: 'idle',
      capabilities: ['operations', 'research', 'code', 'system_admin'],
      lastSeen: new Date().toISOString(),
    },
    {
      id: 'sales-001',
      name: 'Sales Agent',
      role: 'sales',
      status: 'offline',
      capabilities: ['lead_followup', 'outreach', 'crm'],
      lastSeen: null,
    },
  ],
  tasks: [] as any[],
}

export async function GET(request: NextRequest) {
  return Response.json({
    agents: platformState.agents,
    stats: {
      totalTasks: platformState.tasks.length,
      pending: platformState.tasks.filter(t => t.status === 'pending').length,
      running: platformState.tasks.filter(t => t.status === 'running').length,
      completed: platformState.tasks.filter(t => t.status === 'completed').length,
      failed: platformState.tasks.filter(t => t.status === 'failed').length,
    },
    initialized: platformState.initialized,
    timestamp: new Date().toISOString(),
  })
}
