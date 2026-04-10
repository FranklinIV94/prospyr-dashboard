// Shared types for Prospyr Command Center
// Enhanced with agent capabilities and full task lifecycle

// Task status enum
export enum TaskStatus {
  PENDING = 'pending',           // Created, waiting for agent
  CLAIMED = 'claimed',          // Agent picked it up
  IN_PROGRESS = 'in_progress',  // Working on it
  COMPLETED = 'completed',       // Successfully done
  FAILED = 'failed',            // Couldn't complete
  BLOCKED = 'blocked'           // Waiting on something
}

// Task priority
export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Task types
export enum TaskType {
  SECURITY_AUDIT = 'security-audit',
  CODE_REVIEW = 'code-review',
  DOCUMENT_PROCESSING = 'document-processing',
  RESEARCH = 'research',
  CLIENT_COMMUNICATION = 'client-communication',
  GENERAL = 'general'
}

// Task comment interface
export interface TaskComment {
  id: string
  author: string
  content: string
  timestamp: string
  type: 'update' | 'blocker' | 'question' | 'resolution'
}

// Task interface
export interface Task {
  id: string
  title: string
  description: string
  type: TaskType | string
  priority: TaskPriority | string
  status: TaskStatus | string
  assignedTo: string | null
  claimedBy: string | null
  createdAt: string
  updatedAt: string
  startedAt: string | null
  completedAt: string | null
  result: string | null
  error: string | null
  blockers: string[]
  comments: TaskComment[]
  requiredCapabilities: string[]
  skillUsed: string | null
  workspaceId: string | null
}

// Agent interface
export interface Agent {
  agentId: string
  name: string
  role?: string
  capabilities: string[]
  status: 'available' | 'busy' | 'offline'
  workspaceId?: string
  tasksCompleted: number
  registeredAt: string
}

// Predefined capabilities
export const CAPABILITIES = {
  SECURITY_AUDIT: 'security-audit',
  CODE_REVIEW: 'code-review',
  DOCUMENT_PROCESSING: 'document-processing',
  WEB_SEARCH: 'web-search',
  CLIENT_COMMUNICATION: 'client-communication',
  GENERAL: 'general'
} as const

// Priority order for sorting
export const PRIORITY_ORDER: Record<string, number> = {
  [TaskPriority.CRITICAL]: 0,
  [TaskPriority.HIGH]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 3,
  'critical': 0,
  'high': 1,
  'medium': 2,
  'low': 3
}
