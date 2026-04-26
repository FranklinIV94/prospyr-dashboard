// Prospyr Command Center — Shared Types (used by API routes)

export interface Agent {
  id: string
  name: string
  role: string
  status: 'idle' | 'running' | 'offline'
  capabilities: string[]
  lastHeartbeat: string
  currentTaskId: string | null
  connected: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  assigneeId: string | null
  assigneeName: string | null
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface ChatMessage {
  id: string
  from: 'user' | 'agent'
  fromId: string
  fromName: string
  toAgentId: string
  content: string
  timestamp: string
}
