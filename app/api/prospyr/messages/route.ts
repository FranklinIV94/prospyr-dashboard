// API route: /api/prospyr/messages
// Send messages to agents (real-time via SSE)
// This route is explicitly public - no auth required

import { NextRequest, NextResponse } from 'next/server'
import { sendMessageToAgent } from '../events/route'

// Bypass auth for this route entirely
export const dynamic = 'force-dynamic'

interface Message {
  id: string
  agentId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  read: boolean
  replyTo?: string
}

interface ChatSession {
  id: string
  agentId: string
  messages: Message[]
  lastActivity: string
}

const chatSessions: Map<string, ChatSession> = new Map()

function generateId() {
  return crypto.randomUUID()
}

// GET - Get messages or chat history
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  const session = chatSessions.get(agentId)
  if (!session) {
    return NextResponse.json({ messages: [], session: null })
  }

  return NextResponse.json({
    messages: session.messages,
    session: {
      agentId: session.agentId,
      lastActivity: session.lastActivity
    }
  })
}

// POST - Send a message to an agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, content, replyTo } = body

    if (!agentId || !content) {
      return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
    }

    // Create session if doesn't exist
    if (!chatSessions.has(agentId)) {
      chatSessions.set(agentId, {
        id: generateId(),
        agentId,
        messages: [],
        lastActivity: new Date().toISOString()
      })
    }

    const session = chatSessions.get(agentId)!

    // Store message
    const message: Message = {
      id: generateId(),
      agentId,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      read: false,
      replyTo
    }

    session.messages.push(message)
    session.lastActivity = new Date().toISOString()

    // Send via SSE if agent is connected
    const sent = sendMessageToAgent(agentId, message)

    return NextResponse.json({
      message,
      sessionId: session.id,
      delivered: sent
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
