// API route: /api/prospyr/tasks
// Create and list tasks

import type { NextRequest } from 'next/server'

// In-memory task store (would be Redis in production)
const tasks: Map<string, any> = new Map()

function generateId() {
  return crypto.randomUUID()
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status')

  let taskList = Array.from(tasks.values())
  if (status) {
    taskList = taskList.filter(t => t.status === status)
  }

  // Sort by createdAt desc
  taskList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return Response.json({ tasks: taskList })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, type = 'general', priority = 'medium' } = body

    if (!description) {
      return Response.json({ error: 'Description required' }, { status: 400 })
    }

    const task = {
      id: generateId(),
      type,
      description,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    tasks.set(task.id, task)

    // Simulate task assignment - in production this would queue to the orchestrator
    setTimeout(() => {
      const t = tasks.get(task.id)
      if (t) {
        t.status = 'queued'
        t.assignedTo = 'supervisor-001'
        t.updatedAt = new Date().toISOString()
      }
    }, 1000)

    return Response.json({ task }, { status: 201 })
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
