// In-memory store for Prospyr command center
// NOTE: Data resets on server restart — fine for MVP

import { Agent, Task, ChatMessage } from './types'

// SSE connections per agent
export const sseClients = new Map<string, Set<{ agentId: string; controller: ReadableStreamDefaultController }>>()

// Agent registry
export const connectedAgents = new Map<string, Agent>()

// Message storage (agentId -> messages)
export const messages = new Map<string, ChatMessage[]>()

// Pre-populate known agents (这些会在 Railway 重启后消失 — MVP)
const INITIAL_AGENTS: Agent[] = [
  {
    id: 'supervisor-001',
    name: 'CEO Agent',
    role: 'ceo',
    status: 'idle',
    capabilities: ['strategy', 'delegation', 'planning', 'memory'],
    lastHeartbeat: new Date().toISOString(),
    currentTaskId: null,
    connected: false,
  },
  {
    id: 'coo-southstar-001',
    name: 'Southstar',
    role: 'coo',
    status: 'idle',
    capabilities: ['operations', 'research', 'code', 'system_admin'],
    lastHeartbeat: new Date().toISOString(),
    currentTaskId: null,
    connected: false,
  },
  {
    id: 'sales-001',
    name: 'Sales Agent',
    role: 'sales',
    status: 'offline',
    capabilities: ['lead_followup', 'outreach', 'crm'],
    lastHeartbeat: new Date().toISOString(),
    currentTaskId: null,
    connected: false,
  },
]

// Initialize with known agents
for (const agent of INITIAL_AGENTS) {
  connectedAgents.set(agent.id, agent)
}

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
  broadcastToAll({ type: 'agent_registered', agent })
  return agent
}
