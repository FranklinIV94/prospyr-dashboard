// API route: /api/prospyr/tasks
// Create, list, update tasks — backed by shared store

import type { NextRequest } from 'next/server'
import { broadcastToAll } from '@/lib/store'

export async function GET(request: NextRequest) {
  // Tasks stored in orchestrator — for MVP return empty list
  // Dashboard subscribes to SSE for task updates
  return Response.json({ tasks: [] })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description, type = 'general', priority = 'medium' } = body

    if (!description) {
      return Response.json({ error: 'Description required' }, { status: 400 })
    }

    const task = {
      id: crypto.randomUUID(),
      type,
      description,
      priority,
      status: 'queued',
      assignedTo: 'supervisor-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Broadcast to all SSE clients (dashboard + connected agents)
    broadcastToAll({
      type: 'task_created',
      task,
    })

    return Response.json({ task }, { status: 201 })
  } catch (e) {
    console.error('tasks POST error:', e)
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return Response.json({ error: 'id and status required' }, { status: 400 })
    }

    broadcastToAll({
      type: 'task_updated',
      task: { id, status, updatedAt: new Date().toISOString() },
    })

    return Response.json({ success: true })
  } catch (e) {
    console.error('tasks PATCH error:', e)
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}