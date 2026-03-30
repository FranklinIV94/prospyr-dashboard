// API route: /api/prospyr/tasks
// Create tasks and assign to agents (real-time via SSE)
// Uses GET for reading, POST for creating

import { NextRequest, NextResponse } from 'next/server'
import { sendTaskToAgent, getConnectionStatus } from '../events/route'

export const dynamic = 'force-dynamic'

interface Task {
  id: string
  type: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'pending' | 'queued' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled'
  assignedTo?: string
  result?: string
  error?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

const tasks: Map<string, Task> = new Map()

function generateId() {
  return crypto.randomUUID()
}

// GET - List tasks or check connection status
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const agentId = url.searchParams.get('agentId')
  const action = url.searchParams.get('action')

  // Connection status for agents
  if (action === 'status') {
    return NextResponse.json(getConnectionStatus())
  }

  // Create task via GET (workaround for POST blocking)
  if (action === 'create') {
    const description = url.searchParams.get('description')
    const assignTo = url.searchParams.get('assignTo')
    const type = url.searchParams.get('type') || 'general'
    const priority = (url.searchParams.get('priority') as Task['priority']) || 'medium'

    if (!description) {
      return NextResponse.json({ error: 'Description required' }, { status: 400 })
    }

    const task: Task = {
      id: generateId(),
      type,
      description,
      priority,
      status: assignTo ? 'assigned' : 'queued',
      assignedTo: assignTo || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    tasks.set(task.id, task)

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

  // Filter by status
  let taskList = Array.from(tasks.values())
  if (status) {
    taskList = taskList.filter(t => t.status === status)
  }

  taskList.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return NextResponse.json({ tasks: taskList })
}

// POST - Create a new task (standard REST)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, type = 'general', priority = 'medium', assignTo } = body

    if (!description) {
      return NextResponse.json({ error: 'Description required' }, { status: 400 })
    }

    const task: Task = {
      id: generateId(),
      type,
      description,
      priority,
      status: assignTo ? 'assigned' : 'queued',
      assignedTo: assignTo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    tasks.set(task.id, task)

    if (assignTo) {
      sendTaskToAgent(assignTo, task)
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// PATCH - Update task status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, status, result, error } = body

    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    const task = tasks.get(taskId)
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (status) task.status = status
    if (result !== undefined) task.result = result
    if (error !== undefined) task.error = error
    task.updatedAt = new Date().toISOString()

    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date().toISOString()
    }

    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
