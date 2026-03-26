// API route: /api/prospyr/agents
// Agent registration, heartbeat, and connection tracking

import type { NextRequest } from 'next/server'
import { getConnectionStatus } from '../events/route'

interface Agent {
  id: string
  name: string
  role: string
  status: 'online' | 'idle' | 'busy' | 'offline'
  capabilities: string[]
  lastHeartbeat: string
  currentTaskId?: string
  connected?: boolean
}

// In-memory agent registry
const registeredAgents: Map<string, Agent> = new Map()

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')
  const action = url.searchParams.get('action')

  // Get connection status (real-time SSE connections)
  if (action === 'connections') {
    const connections = getConnectionStatus()
    return Response.json(connections)
  }

  // Get specific agent
  if (agentId) {
    const agent = registeredAgents.get(agentId)
    if (!agent) {
      return Response.json({ error: 'Agent not found' }, { status: 404 })
    }
    
    // Check if connected via SSE
    const connections = getConnectionStatus()
    agent.connected = connections.connectedAgents.includes(agentId)
    
    return Response.json({ agent })
  }

  // Return all agents with connection status
  const connections = getConnectionStatus()
  const agents = Array.from(registeredAgents.values()).map(agent => ({
    ...agent,
    connected: connections.connectedAgents.includes(agent.id)
  }))

  return Response.json({ 
    agents,
    totalConnected: connections.total
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, name, role, capabilities } = body

    if (!agentId || !name) {
      return Response.json({ error: 'agentId and name required' }, { status: 400 })
    }

    const agent: Agent = {
      id: agentId,
      name,
      role: role || 'agent',
      status: 'online',
      capabilities: capabilities || [],
      lastHeartbeat: new Date().toISOString(),
    }

    registeredAgents.set(agentId, agent)
    
    console.log(`[AGENTS] Registered: ${name} (${agentId})`)

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

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')

  if (!agentId) {
    return Response.json({ error: 'agentId required' }, { status: 400 })
  }

  const deleted = registeredAgents.delete(agentId)
  return Response.json({ deleted })
}
