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

const connectedAgents = new Map()
const eventBuffers = new Map()
const MAX_BUFFER = 50

export function createSSEConnection(
  agentId: string,
  controller: ReadableStreamDefaultController,
  info?: Partial<AgentInfo>
) {
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

  sendEvent(agentId, {
    type: 'connected',
    agentId,
    name: agentInfo.name,
    capabilities: agentInfo.capabilities,
    status: agentInfo.status,
    timestamp: new Date().toISOString()
  })

  return agentInfo
}

export function updateAgentInfo(agentId: string, updates: Partial<AgentInfo>) {
  const agent = connectedAgents.get(agentId)
  if (agent) {
    Object.assign(agent, updates, { lastActivity: new Date().toISOString() })
  }
}

export function closeSSEConnection(agentId: string) {
  connectedAgents.delete(agentId)
  eventBuffers.delete(agentId)
}

export function sendEvent(agentId: string, event: Record<string, unknown>) {
  const agent = connectedAgents.get(agentId)
  if (!agent) return false

  try {
    const encoder = new TextEncoder()
    agent.controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
    agent.lastActivity = new Date().toISOString()
    agent.events++

    const buffer = eventBuffers.get(agentId) || []
    buffer.push(event)
    if (buffer.length > MAX_BUFFER) buffer.shift()
    eventBuffers.set(agentId, buffer)

    return true
  } catch {
    closeSSEConnection(agentId)
    return false
  }
}

export function broadcastEvent(event: Record<string, unknown>) {
  for (const agentId of connectedAgents.keys()) {
    sendEvent(agentId, event)
  }
}

export function sendTaskToAgent(agentId: string, task: Record<string, unknown>) {
  return sendEvent(agentId, { type: 'new_task', task, timestamp: new Date().toISOString() })
}

export function sendMessageToAgent(agentId: string, message: Record<string, unknown>) {
  return sendEvent(agentId, { type: 'new_message', message, timestamp: new Date().toISOString() })
}

export function getConnectionStatus() {
  return {
    connectedAgents: Array.from(connectedAgents.keys()),
    total: connectedAgents.size
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')

  if (!agentId) {
    return Response.json({ error: 'agentId required' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      createSSEConnection(agentId, controller)

      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeatInterval)
          closeSSEConnection(agentId)
        }
      }, 30000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatInterval)
        closeSSEConnection(agentId)
      })
    },
    cancel() {
      closeSSEConnection(agentId)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, name, role, capabilities, status, workspaceId } = body

    if (!agentId) {
      return Response.json({ error: 'agentId required' }, { status: 400 })
    }

    const agent = connectedAgents.get(agentId)
    if (agent) {
      agent.name = name || agent.name
      agent.role = role || agent.role
      agent.capabilities = capabilities || agent.capabilities
      agent.status = status || agent.status
      agent.workspaceId = workspaceId || agent.workspaceId
      agent.lastActivity = new Date().toISOString()

      return Response.json({
        success: true,
        agent: { agentId: agent.agentId, name: agent.name, capabilities: agent.capabilities, status: agent.status }
      })
    }

    return Response.json({
      success: true,
      message: 'Agent info received. Connect via SSE to activate.',
      agent: { agentId, name, capabilities: capabilities || ['general'] }
    })
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}