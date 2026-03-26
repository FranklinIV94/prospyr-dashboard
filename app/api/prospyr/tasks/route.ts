// API route: /api/prospyr/tasks
// Create, list, claim, and complete tasks

import type { NextRequest } from 'next/server'

// In-memory task store (would be Redis in production)
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
const taskQueue: string[] = [] // FIFO queue for pending tasks

function generateId() {
  return crypto.randomUUID()
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const agentId = url.searchParams.get('agentId')
  const action = url.searchParams.get('action')

  // Agent polling for work
  if (action === 'poll' && agentId) {
    // Find pending task not assigned to anyone, or assigned to this agent
    let task = Array.from(tasks.values()).find(
      t => t.status === 'pending' || (t.status === 'assigned' && t.assignedTo === agentId)
    )
    
    // If no assigned task, claim an unassigned pending task
    if (!task) {
      task = Array.from(tasks.values()).find(
        t => t.status === 'queued' && !t.assignedTo
      )
      if (task) {
        task.status = 'assigned'
        task.assignedTo = agentId
        task.updatedAt = new Date().toISOString()
      }
    }
    
    if (!task) {
      return Response.json({ task: null, message: 'No tasks available' })
    }
    
    return Response.json({ task })
  }

  // Get tasks by status
  let taskList = Array.from(tasks.values())
  if (status) {
    taskList = taskList.filter(t => t.status === status)
  }
  if (agentId) {
    taskList = taskList.filter(t => t.assignedTo === agentId)
  }

  // Sort by priority then createdAt
  taskList.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority]
    if (pDiff !== 0) return pDiff
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return Response.json({ tasks: taskList })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, type = 'general', priority = 'medium', assignTo } = body

    if (!description) {
      return Response.json({ error: 'Description required' }, { status: 400 })
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
    if (!assignTo) taskQueue.push(task.id)

    return Response.json({ task }, { status: 201 })
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { taskId, status, result, error } = body

    if (!taskId) {
      return Response.json({ error: 'taskId required' }, { status: 400 })
    }

    const task = tasks.get(taskId)
    if (!task) {
      return Response.json({ error: 'Task not found' }, { status: 404 })
    }

    if (status) task.status = status
    if (result !== undefined) task.result = result
    if (error !== undefined) task.error = error
    task.updatedAt = new Date().toISOString()

    if (status === 'completed' || status === 'failed') {
      task.completedAt = new Date().toISOString()
    }

    return Response.json({ task })
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const url = new URL(request.url)
  const taskId = url.searchParams.get('id')

  if (!taskId) {
    return Response.json({ error: 'Task ID required' }, { status: 400 })
  }

  const deleted = tasks.delete(taskId)
  return Response.json({ deleted })
}
