// In-memory store for Prospyr command center
// NOTE: Data resets on server restart — fine for MVP

import { Agent, Task, ChatMessage } from './types'

// SSE connections per agent
export const sseClients = new Map<string, Set<{ agentId: string; controller: ReadableStreamDefaultController }>>()

// Agent registry
export const connectedAgents = new Map<string, Agent>()

// Message storage (agentId -> messages)
export const messages = new Map<string, ChatMessage[]>()

// Broadcast an event to a specific agent's SSE connections
export function broadcastToAgent(agentId: string, event: object) {
  const clients = sseClients.get(agentId)
  if (!clients) return
  const data = `data: ${JSON.stringify(event)}\n\n`
  clients.forEach(client => {
    try {
      client.controller.enqueue(new TextEncoder().encode(data))
    } catch {
      clients.delete(client)
    }
  })
}

// Broadcast to all connected agents
export function broadcastToAll(event: object) {
  sseClients.forEach((_, agentId) => {
    broadcastToAgent(agentId, event)
  })
}

// Add a message
export function addMessage(message: ChatMessage) {
  const key = message.toAgentId
  if (!messages.has(key)) messages.set(key, [])
  messages.get(key)!.push(message)
  broadcastToAgent(message.toAgentId, { type: 'message', message })
  return message
}

// Get messages for an agent
export function getMessages(agentId: string) {
  return messages.get(agentId) || []
}

// Register/update an agent
export function registerAgent(agent: Agent) {
  connectedAgents.set(agent.id, agent)
  broadcastToAll({ type: 'agent', action: 'registered', agent })
  return agent
}
