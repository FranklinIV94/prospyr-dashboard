// API route: /api/prospyr/events
// Server-Sent Events (SSE) for real-time agent communication
// Agents connect and receive tasks, messages, and commands in real-time

import type { NextRequest } from 'next/server'

// Connected agents Map<agentId, {controller, lastActivity}>
const connectedAgents = new Map()

// Event buffer for each agent (holds last N events)
const eventBuffers = new Map()
const MAX_BUFFER = 50

// Create a new SSE connection for an agent
export function createSSEConnection(agentId: string, controller: ReadableStreamDefaultController) {
  const connection = {
    controller,
    lastActivity: new Date().toISOString(),
    events: 0
  }
  
  connectedAgents.set(agentId, connection)
  eventBuffers.set(agentId, [])
  
  console.log(`[SSE] Agent connected: ${agentId} (total: ${connectedAgents.size})`)
  
  // Send initial connection event
  sendEvent(agentId, {
    type: 'connected',
    agentId,
    timestamp: new Date().toISOString()
  })
  
  return connection
}

// Close an SSE connection
export function closeSSEConnection(agentId: string) {
  connectedAgents.delete(agentId)
  eventBuffers.delete(agentId)
  console.log(`[SSE] Agent disconnected: ${agentId} (remaining: ${connectedAgents.size})`)
}

// Send an event to a specific agent
export function sendEvent(agentId: string, event: Record<string, unknown>) {
  const connection = connectedAgents.get(agentId)
  if (!connection) {
    console.log(`[SSE] Agent not connected: ${agentId}`)
    return false
  }
  
  try {
    const eventData = JSON.stringify(event)
    const encoder = new TextEncoder()
    
    connection.controller.enqueue(encoder.encode(`data: ${eventData}\n\n`))
    connection.lastActivity = new Date().toISOString()
    connection.events++
    
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
    connections: Array.from(connectedAgents.entries()).map(([id, conn]) => ({
      agentId: id,
      lastActivity: conn.lastActivity,
      eventsSent: conn.events
    }))
  }
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
