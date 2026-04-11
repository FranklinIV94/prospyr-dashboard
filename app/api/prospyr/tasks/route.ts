// API route: /api/prospyr/tasks
// Create tasks and assign to agents (real-time via SSE)
// Enhanced with full lifecycle, capabilities, priorities, file persistence

import { NextRequest, NextResponse } from 'next/server'
import { sendTaskToAgent, getConnectionStatus, getConnectedAgents } from '../events/route'
import { readJsonFile, writeJsonFile } from '../../../lib/storage'

export const dynamic = 'force-dynamic'

// Task status enum
enum TaskStatus {
  PENDING = 'pending',
  CLAIMED = 'claimed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked'
}

// Task priority
enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Task types
enum TaskType {
  SECURITY_AUDIT = 'security-audit',
  CODE_REVIEW = 'code-review',
  DOCUMENT_PROCESSING = 'document-processing',
  RESEARCH = 'research',
  CLIENT_COMMUNICATION = 'client-communication',
  GENERAL = 'general'
}

// Task comment interface
interface TaskComment {
  id: string
  author: string
  content: string
  timestamp: string
  type: 'update' | 'blocker' | 'question' | 'resolution'
}

// Enhanced Task interface
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

const TASKS_FILE = 'tasks.json'

function generateId() {
  return crypto.randomUUID()
}

// Priority order for sorting
const priorityOrder: Record<string, number> = {
  [TaskPriority.CRITICAL]: 0,
  [TaskPriority.HIGH]: 1,
  [TaskPriority.MEDIUM]: 2,
  [TaskPriority.LOW]: 3,
  'critical': 0,
  'high': 1,
  'medium': 2,
  'low': 3
}

// File-based task storage
function getTasks(): Map<string, Task> {
  const data = readJsonFile<Record<string, Task>>(TASKS_FILE, {})
  return new Map(Object.entries(data))
}

function saveTasks(tasks: Map<string, Task>) {
  const obj = Object.fromEntries(tasks)
  writeJsonFile(TASKS_FILE, obj)
}

// GET - List tasks or check connection status
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const agentId = url.searchParams.get('agentId')
  const taskType = url.searchParams.get('type')
  const priority = url.searchParams.get('priority')
  const workspaceId = url.searchParams.get('workspaceId')
  const action = url.searchParams.get('action')

  // Connection status for agents
  if (action === 'status') {
    return NextResponse.json(getConnectionStatus())
  }

  // Get all connected agents with capabilities
  if (action === 'agents') {
    const agents = getConnectedAgents()
    const agentList = Array.from(agents.values()).map(a => ({
      agentId: a.agentId,
      name: a.name,
      capabilities: a.capabilities,
      status: a.status,
      workspaceId: a.workspaceId,
      tasksCompleted: a.tasksCompleted
    }))
    return NextResponse.json({ agents: agentList })
  }

  const tasks = getTasks()

  // Create task via GET (workaround for POST blocking)
  if (action === 'create') {
    const title = url.searchParams.get('title')
    const description = url.searchParams.get('description')
    const type = url.searchParams.get('type') || TaskType.GENERAL
    const priorityVal = url.searchParams.get('priority') || TaskPriority.MEDIUM
    const assignTo = url.searchParams.get('assignTo')
    const requiredCapabilities = url.searchParams.get('capabilities')?.split(',').filter(Boolean) || []
    const workspace = url.searchParams.get('workspaceId')

    if (!description) {
      return NextResponse.json({ error: 'Description required' }, { status: 400 })
    }

    const task: Task = {
      id: generateId(),
      title: title || description.slice(0, 50),
      description,
      type,
      priority: priorityVal,
      status: TaskStatus.PENDING,
      assignedTo: null,
      claimedBy: assignTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      blockers: [],
      comments: [],
      requiredCapabilities,
      skillUsed: null,
      workspaceId: workspace || null
    }

    tasks.set(task.id, task)
    saveTasks(tasks)

    // Auto-assign to capable agent if specified
    if (assignTo) {
      sendTaskToAgent(assignTo, task)
    }

    return NextResponse.json({ task }, { status: 201 })
  }

  // Get tasks assigned to specific agent
  if (agentId) {
    const agentTasks = Array.from(tasks.values()).filter(t => t.assignedTo === agentId)
    return NextResponse.json({ tasks: agentTasks })
  }

  // Filter by multiple criteria
  let taskList = Array.from(tasks.values())

  if (status) {
    const statuses = status.split(',')
    taskList = taskList.filter(t => statuses.includes(t.status))
  }
  if (taskType) {
    taskList = taskList.filter(t => t.type === taskType)
  }
  if (priority) {
    taskList = taskList.filter(t => t.priority === priority)
  }
  if (workspaceId) {
    taskList = taskList.filter(t => t.workspaceId === workspaceId)
  }

  // Sort by priority, then by creation date
  taskList.sort((a, b) => {
    const pDiff = (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4)
    if (pDiff !== 0) return pDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return NextResponse.json({ tasks: taskList })
}

// POST - Create a new task (standard REST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      type = TaskType.GENERAL,
      priority = TaskPriority.MEDIUM,
      assignTo,
      requiredCapabilities = [],
      workspaceId,
      blockers = [],
      comments = []
    } = body

    if (!description) {
      return NextResponse.json({ error: 'Description required' }, { status: 400 })
    }

    const tasks = getTasks()

    const task: Task = {
      id: generateId(),
      title: title || description.slice(0, 50),
      description,
      type,
      priority,
      status: TaskStatus.PENDING,
      assignedTo: null,
      claimedBy: assignTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      blockers: blockers || [],
      comments: comments || [],
      requiredCapabilities: requiredCapabilities || [],
      skillUsed: null,
      workspaceId: workspaceId || null
    }

    tasks.set(task.id, task)
    saveTasks(tasks)

    // Auto-assign to capable agent if specified
    if (assignTo) {
      sendTaskToAgent(assignTo, task)
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH - Update task status, add comments, manage blockers
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      taskId,
      status,
      result,
      error,
      assignedTo,
      claimedBy,
      addBlocker,
      removeBlocker,
      addComment,
      clearBlockers,
      skillUsed
    } = body

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const tasks = getTasks()
    const task = tasks.get(taskId)
    
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Update status with lifecycle management
    if (status) {
      task.status = status
      task.updatedAt = new Date().toISOString()

      // Track lifecycle timestamps
      if (status === TaskStatus.IN_PROGRESS && !task.startedAt) {
        task.startedAt = new Date().toISOString()
      }
      if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
        task.completedAt = new Date().toISOString()
      }
    }

    // Assign/reassign agent
    if (assignedTo !== undefined) {
      task.assignedTo = assignedTo
    }

    // Track who claimed the task
    if (claimedBy !== undefined) {
      task.claimedBy = claimedBy
    }

    // Update result
    if (result !== undefined) {
      task.result = result
    }

    // Update error
    if (error !== undefined) {
      task.error = error
    }

    // Add blocker
    if (addBlocker) {
      task.blockers.push(addBlocker)
    }

    // Remove blocker
    if (removeBlocker) {
      task.blockers = task.blockers.filter(b => b !== removeBlocker)
    }

    // Clear all blockers
    if (clearBlockers) {
      task.blockers = []
    }

    // Add comment
    if (addComment) {
      task.comments.push({
        id: generateId(),
        author: addComment.author || 'system',
        content: addComment.content,
        timestamp: new Date().toISOString(),
        type: addComment.type || 'update'
      })
    }

    // Track skill used
    if (skillUsed !== undefined) {
      task.skillUsed = skillUsed
    }

    tasks.set(taskId, task)
    saveTasks(tasks)

    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE - Remove a task
export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  const taskId = url.searchParams.get('taskId')

  if (!taskId) {
    return NextResponse.json({ error: 'taskId required' }, { status: 400 })
  }

  const tasks = getTasks()
  const deleted = tasks.delete(taskId)
  saveTasks(tasks)

  if (!deleted) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}
