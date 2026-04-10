// API route: /api/prospyr/events
// Server-Sent Events (SSE) for real-time agent communication
// Enhanced with agent capabilities and profiles

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

// Connected agents Map<agentId, AgentInfo>
const connectedAgents = new Map()

// Event buffer for each agent (holds last N events)
const eventBuffers = new Map()
const MAX_BUFFER = 50

// Create a new SSE connection for an agent
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
  
  console.log(`[SSE] Agent connected: ${agentId} (capabilities: ${agentInfo.capabilities.join(', ')}) (total: ${connectedAgents.size})`)
  
  // Send initial connection event
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

// Update agent info
export function updateAgentInfo(agentId: string, updates: Partial<AgentInfo>) {
  const agent = connectedAgents.get(agentId)
  if (agent) {
    Object.assign(agent, updates, { lastActivity: new Date().toISOString() })
  }
}

// Close an SSE connection
export function closeSSEConnection(agentId: string) {
  connectedAgents.delete(agentId)
  eventBuffers.delete(agentId)
  console.log(`[SSE] Agent disconnected: ${agentId} (remaining: ${connectedAgents.size})`)
}

// Send an event to a specific agent
export function sendEvent(agentId: string, event: Record<string, unknown>) {
  const agent = connectedAgents.get(agentId)
  if (!agent) {
    console.log(`[SSE] Agent not connected: ${agentId}`)
    return false
  }
  
  try {
    const eventData = JSON.stringify(event)
    const encoder = new TextEncoder()
    
    agent.controller.enqueue(encoder.encode(`data: ${eventData}\n\n`))
    agent.lastActivity = new Date().toISOString()
    agent.events++
    
    // Add to buffer
    const buffer = eventBuffers.get(agentId) || []
    buffer.push(event)
    if (buffer.length > MAX_BUFFER) buffer.shift()
    eventBuffers.set(agentId, buffer)
    
    return true
  } catch (error) {
    console.error(`[SSE] Send error for ${agentId}:`, error)
    closeSSEConnection(agentId)
    return false
  }
}

// Broadcast an event to all connected agents
export function broadcastEvent(event: Record<string, unknown>) {
  for (const agentId of connectedAgents.keys()) {
    sendEvent(agentId, event)
  }
  console.log(`[SSE] Broadcast: ${event.type} to ${connectedAgents.size} agents`)
}

// Send a task to a specific agent
export function sendTaskToAgent(agentId: string, task: Record<string, unknown>) {
  return sendEvent(agentId, {
    type: 'new_task',
    task,
    timestamp: new Date().toISOString()
  })
}

// Send a chat message to a specific agent
export function sendMessageToAgent(agentId: string, message: Record<string, unknown>) {
  return sendEvent(agentId, {
    type: 'new_message',
    message,
    timestamp: new Date().toISOString()
  })
}

// Get connection status
export function getConnectionStatus() {
  return {
    connectedAgents: Array.from(connectedAgents.keys()),
    total: connectedAgents.size,
    connections: Array.from(connectedAgents.entries()).map(([id, agent]) => ({
      agentId: id,
      name: agent.name,
      capabilities: agent.capabilities,
      status: agent.status,
      lastActivity: agent.lastActivity,
      eventsSent: agent.events
    }))
  }
}

// Get all connected agents with full info
export function getConnectedAgents() {
  const agents: Record<string, AgentInfo> = {}
  for (const [id, agent] of connectedAgents.entries()) {
    // Don't expose controller
    agents[id] = {
      agentId: agent.agentId,
      name: agent.name,
      role: agent.role,
      capabilities: agent.capabilities,
      status: agent.status,
      workspaceId: agent.workspaceId,
      tasksCompleted: agent.tasksCompleted,
      registeredAt: agent.registeredAt
    }
  }
  return agents
}

// Get buffered events for an agent (for reconnection)
export function getBufferedEvents(agentId: string) {
  return eventBuffers.get(agentId) || []
}

// Handler for agent SSE connections
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')

  if (!agentId) {
    return Response.json({ error: 'agentId required' }, { status: 400 })
  }

  // Create SSE stream
  const encoder = new TextEncoder()
  
  const stream = new ReadableStream({
    start(controller) {
      // Register this connection
      createSSEConnection(agentId, controller)
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`))
        } catch {
          clearInterval(heartbeatInterval)
          closeSSEConnection(agentId)
        }
      }, 30000)
      
      // Cleanup on close
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
      'X-Accel-Buffering': 'no' // Disable nginx buffering
    }
  })
}

// POST - Agent registers with full info (including capabilities)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, name, role, capabilities, status, workspaceId } = body

    if (!agentId) {
      return Response.json({ error: 'agentId required' }, { status: 400 })
    }

    // Update agent info if already connected
    const agent = connectedAgents.get(agentId)
    if (agent) {
      agent.name = name || agent.name
      agent.role = role || agent.role
      agent.capabilities = capabilities || agent.capabilities
      agent.status = status || agent.status
      agent.workspaceId = workspaceId || agent.workspaceId
      agent.lastActivity = new Date().toISOString()
      
      console.log(`[SSE] Agent updated: ${agentId} (capabilities: ${agent.capabilities.join(', ')})`)
      
      return Response.json({ 
        success: true, 
        agent: {
          agentId: agent.agentId,
          name: agent.name,
          capabilities: agent.capabilities,
          status: agent.status
        }
      })
    }

    // Not connected yet - just acknowledge
    return Response.json({ 
      success: true, 
      message: 'Agent info received. Connect via SSE to activate.',
      agent: { agentId, name, capabilities: capabilities || ['general'] }
    })
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
