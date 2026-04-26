// API route: /api/prospyr/events
// Server-Sent Events (SSE) for real-time agent communication

import type { NextRequest } from 'next/server'

// Connected agents with full info
interface AgentInfo {
  agentId: string
  name: string
  role?: string
  capabilities: string[]
  status: 'available' | 'busy' | 'offline'
  workspaceId?: string
  tasksCompleted: number
  registeredAt: string
  controller: ReadableStreamDefaultController
  lastActivity: string
  events: number
}

const connectedAgents = new Map<string, AgentInfo>()
const eventBuffers = new Map<string, any[]>()
const sseClients = new Map<string, Set<ReadableStreamDefaultController>>()
const MAX_BUFFER = 50

function createSSEConnection(agentId: string, controller: ReadableStreamDefaultController, info?: Partial<AgentInfo>) {
  const agentInfo: AgentInfo = {
    agentId,
    name: info?.name || agentId,
    role: info?.role,
    capabilities: info?.capabilities || ['general'],
    status: info?.status || 'available',
    workspaceId: info?.workspaceId,
    tasksCompleted: info?.tasksCompleted || 0,
    registeredAt: new Date().toISOString(),
    controller,
    lastActivity: new Date().toISOString(),
    events: 0
  }
  connectedAgents.set(agentId, agentInfo)
  eventBuffers.set(agentId, [])
  if (!sseClients.has(agentId)) sseClients.set(agentId, new Set())
  sseClients.get(agentId)!.add(controller)
  sendEvent(agentId, { type: 'connected', agentId, name: agentInfo.name, status: agentInfo.status })
  return agentInfo
}

function updateAgentInfo(agentId: string, updates: Partial<AgentInfo>) {
  const agent = connectedAgents.get(agentId)
  if (agent) {
    Object.assign(agent, updates, { lastActivity: new Date().toISOString() })
  }
  return agent
}

function closeSSEConnection(agentId: string) {
  connectedAgents.delete(agentId)
  eventBuffers.delete(agentId)
  sseClients.delete(agentId)
}

function sendEvent(agentId: string, event: Record<string, unknown>) {
  const clients = sseClients.get(agentId)
  if (!clients || clients.size === 0) return false
  const data = `data: ${JSON.stringify(event)}\n\n`
  let sent = false
  clients.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(data))
      sent = true
    } catch {
      clients.delete(controller)
    }
  })
  const buffer = eventBuffers.get(agentId)
  if (buffer) {
    buffer.push(event)
    if (buffer.length > MAX_BUFFER) buffer.shift()
  }
  const agent = connectedAgents.get(agentId)
  if (agent) agent.events++
  return sent
}

function broadcastEvent(event: Record<string, unknown>) {
  for (const agentId of connectedAgents.keys()) {
    sendEvent(agentId, event)
  }
}

function sendTaskToAgent(agentId: string, task: Record<string, unknown>) {
  return sendEvent(agentId, { type: 'new_task', task, timestamp: new Date().toISOString() })
}

function sendMessageToAgent(agentId: string, message: Record<string, unknown>) {
  return sendEvent(agentId, { type: 'new_message', message, timestamp: new Date().toISOString() })
}

function getConnectionStatus() {
  return {
    connectedAgents: Array.from(connectedAgents.keys()),
    total: connectedAgents.size
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')

  const stream = new ReadableStream({
    start(controller) {
      if (!agentId) {
        controller.close()
        return
      }
      createSSEConnection(agentId, controller, {
        name: url.searchParams.get('name') || agentId,
        role: url.searchParams.get('role') || 'agent',
        capabilities: url.searchParams.get('capabilities')?.split(',') || []
      })

      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`))
        } catch {
          clearInterval(keepAlive)
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(keepAlive)
        closeSSEConnection(agentId)
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, agentId, name, role, capabilities } = body

    if (action === 'register' && agentId) {
      const agent = connectedAgents.get(agentId)
      if (agent) {
        return Response.json({ success: true, agent: { ...agent, controller: undefined } })
      }
      return Response.json({ error: 'Agent not connected' }, { status: 404 })
    }

    if (action === 'status') {
      return Response.json(getConnectionStatus())
    }

    if (action === 'broadcast' && body.event) {
      broadcastEvent(body.event)
      return Response.json({ success: true })
    }

    if (action === 'sendTask' && agentId && body.task) {
      const sent = sendTaskToAgent(agentId, body.task)
      return Response.json({ success: sent })
    }

    if (action === 'sendMessage' && agentId && body.message) {
      const sent = sendMessageToAgent(agentId, body.message)
      return Response.json({ success: sent })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}