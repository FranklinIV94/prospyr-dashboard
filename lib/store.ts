// In-memory store for Prospyr command center
// NOTE: Data resets on server restart — fine for MVP

import { Agent, Task, ChatMessage } from './types'

// SSE connections per agent
export const sseClients = new Map<string, Set<{ agentId: string; controller: ReadableStreamDefaultController }>>()

// Task storage
export const tasks = new Map<string, Task>()

// Message storage (agentId -> messages)
export const messages = new Map<string, ChatMessage[]>()

// Agent registry (static for now, could be dynamic)
export const connectedAgents = new Map<string, Agent>()

// Broadcast an event to a specific agent's SSE connections
export function broadcastToAgent(agentId: string, event: object) {
  const clients = sseClients.get(agentId)
  if (!clients) return
  const data = `data: ${JSON.stringify(event)}\n\n`
  for (const client of clients) {
    try {
      client.controller.enqueue(new TextEncoder().encode(data))
    } catch {
      clients.delete(client)
    }
  }
}

// Broadcast to all connected agents
export function broadcastToAll(event: object) {
  for (const [agentId] of sseClients) {
    broadcastToAgent(agentId, event)
  }
}

// Register a new SSE client for an agent
export function registerSSEClient(agentId: string, controller: ReadableStreamDefaultController) {
  if (!sseClients.has(agentId)) {
    sseClients.set(agentId, new Set())
  }
  sseClients.get(agentId)!.add({ agentId, controller })
}

// Remove SSE client
export function removeSSEClient(agentId: string, controller: ReadableStreamDefaultController) {
  const clients = sseClients.get(agentId)
  if (clients) {
    for (const client of clients) {
      if (client.controller === controller) {
        clients.delete(client)
        break
      }
    }
  }
}

// Add a task
export function addTask(task: Task) {
  tasks.set(task.id, task)
  broadcastToAll({ type: 'task', action: 'created', task })
  return task
}

// Update a task
export function updateTask(taskId: string, updates: Partial<Task>) {
  const task = tasks.get(taskId)
  if (!task) return null
  const updated = { ...task, ...updates, updatedAt: new Date().toISOString() }
  tasks.set(taskId, updated)
  broadcastToAll({ type: 'task', action: 'updated', task: updated })
  return updated
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

// Get all tasks
export function getAllTasks() {
  return Array.from(tasks.values())
}

// Register/update an agent
export function registerAgent(agent: Agent) {
  connectedAgents.set(agent.id, agent)
  broadcastToAll({ type: 'agent', action: 'registered', agent })
  return agent
}