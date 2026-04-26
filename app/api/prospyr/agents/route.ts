// GET /api/prospyr/agents — list connected agents
// POST /api/prospyr/agents — register an agent

import { NextRequest, NextResponse } from 'next/server'
import { connectedAgents, registerAgent, sseClients, broadcastToAll } from '@/lib/store'
import { Agent } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agents = Array.from(connectedAgents.values()).map(a => ({
    ...a,
    connected: sseClients.has(a.id) && sseClients.get(a.id)!.size > 0
  }))
  return NextResponse.json({ agents, totalConnected: agents.filter(a => a.connected).length })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, name, role, capabilities } = body

    if (!id || !name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 })
    }

    const agent: Agent = {
      id,
      name,
      role: role || 'agent',
      status: 'idle',
      capabilities: capabilities || [],
      lastHeartbeat: new Date().toISOString(),
      currentTaskId: null,
      connected: true
    }

    registerAgent(agent)
    broadcastToAll({ type: 'connected', agentId: id, name, status: 'available', timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true, agent })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}