// API route: /api/prospyr/agents
// Agent registration and heartbeat

import type { NextRequest } from 'next/server'

// In-memory agent registry (would be Redis in production)
const registeredAgents: Map<string, {
  id: string
  name: string
  role: string
  status: 'online' | 'idle' | 'busy' | 'offline'
  capabilities: string[]
  lastHeartbeat: string
  currentTaskId?: string
}> = new Map()

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')

  if (agentId) {
    const agent = registeredAgents.get(agentId)
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 })
    }
    return Response.json({ agent })
  }

  // Return all agents
  return Response.json({ 
    agents: Array.from(registeredAgents.values()) 
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, name, role, capabilities } = body

    if (!agentId || !name) {
      return Response.json({ error: 'agentId and name required' }, { status: 400 })
    }

    const agent = {
      id: agentId,
      name,
      role: role || 'agent',
      status: 'online' as const,
      capabilities: capabilities || [],
      lastHeartbeat: new Date().toISOString(),
    }

    registeredAgents.set(agentId, agent)

    return Response.json({ 
      agent,
      message: 'Agent registered successfully' 
    }, { status: 201 })
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, status, currentTaskId } = body

    if (!agentId) {
      return Response.json({ error: 'agentId required' }, { status: 400 })
    }

    const agent = registeredAgents.get(agentId)
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 })
    }

    if (status) agent.status = status
    if (currentTaskId !== undefined) agent.currentTaskId = currentTaskId
    agent.lastHeartbeat = new Date().toISOString()

    return Response.json({ agent })
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
