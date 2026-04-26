// Core type definitions for Prospyr multi-agent system

export type AgentRole = 'ceo' | 'coo' | 'cfo' | 'cmo' | 'cto' | 'admin' | 'sales' | 'support' | 'developer'

export type AgentStatus = 'idle' | 'thinking' | 'running' | 'waiting' | 'error' | 'offline'

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low'

export type TaskStatus = 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface Agent {
  id: string
  name: string
  role: AgentRole
  status: AgentStatus
  capabilities: string[]
  adapterType: string
  createdAt?: string
  lastSeen?: string
}

export interface Task {
  id: string
  type: string
  description: string
  priority: TaskPriority
  status: TaskStatus
  assignedTo?: string  // agent id
  parentTaskId?: string // for sub-tasks
  result?: unknown
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  metadata?: Record<string, unknown>
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  agentId?: string
  taskId?: string
  timestamp: string
  attachments?: Attachment[]
  metadata?: Record<string, unknown>
}

export interface Attachment {
  type: 'image' | 'file' | 'link'
  name: string
  url: string
  mimeType?: string
  size?: number
}

export interface MemoryEntry {
  id: string
  type: 'episodic' | 'semantic' | 'procedural'
  content: string
  embedding?: number[]  // vector for semantic memory
  agentId?: string
  taskId?: string
  importance: number    // 0-1, for memory consolidation
  createdAt: string
  accessedAt?: string
  tags: string[]
}

export interface ToolCall {
  tool: string
  input: Record<string, unknown>
  output?: unknown
  error?: string
  duration?: number    // ms
  timestamp: string
}

export interface AgentThought {
  agentId: string
  thought: string       // reasoning trace
  action?: ToolCall
  conclusion?: string
  timestamp: string
}

export interface Flow {
  id: string
  name: string
  description?: string
  status: 'active' | 'paused' | 'completed' | 'failed'
  tasks: string[]       // task ids
  createdAt: string
  updatedAt: string
}

// LLM Provider types
export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'bedrock'
  model: string
  apiKey?: string
  baseURL?: string     // for custom endpoints / ollama
  maxTokens?: number
  temperature?: number
  thinkingEnabled?: boolean
  thinkingBudget?: number // max tokens for thinking
}

export interface LLMResponse {
  content: string
  thinking?: string    // extended thinking trace
  toolCalls?: ToolCall[]
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  model: string
  finishReason: 'stop' | 'length' | 'tool_use' | 'error'
}

// Tool interface
export interface Tool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (input: Record<string, unknown>, context: AgentContext) => Promise<ToolResult>
}

export interface ToolResult {
  success: boolean
  output?: unknown
  error?: string
  metadata?: Record<string, unknown>
}

// Agent execution context
export interface AgentContext {
  agent: Agent
  task?: Task
  messages: Message[]
  memory: MemoryEntry[]
  tools: Tool[]
  llm: LLMConfig
}

// Event types for real-time updates
export interface AgentEvent {
  type: 'status_change' | 'task_assigned' | 'task_completed' | 'error' | 'thought'
  agentId: string
  payload: unknown
  timestamp: string
}

// Dashboard API types
export interface DashboardConfig {
  paperclipApi: string
  paperclipKey: string
  paperclipCompany: string
  llmProvider: LLMConfig
  agents: Agent[]
}
