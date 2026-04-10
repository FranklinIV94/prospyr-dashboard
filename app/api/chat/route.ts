// API route: /api/chat
// Handles chat messages between dashboard and agents
// Messages are stored locally and delivered via SSE

import { NextRequest, NextResponse } from 'next/server'
import { sendMessageToAgent } from './prospyr/events/route'

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

// In-memory chat sessions (per deployment)
const chatSessions: Map<string, ChatSession> = new Map()

function generateId() {
  return crypto.randomUUID()
}

// GET - Get chat history for an agent
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

// POST - Send a chat message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, content, message, replyTo } = body

    if (!agentId || !(content || message)) {
      return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
    }

    const messageContent = content || message

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

    // Create message
    const message: Message = {
      id: generateId(),
      agentId,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      read: false,
      replyTo
    }

    session.messages.push(message)
    session.lastActivity = new Date().toISOString()

    // Try to send via SSE to the agent
    sendMessageToAgent(agentId, {
      type: 'chat_message',
      message,
      from: 'dashboard'
    })

    return NextResponse.json({
      message,
      sessionId: session.id,
      delivered: true
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// PUT - Agent responds to a message (called by agent SSE client)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, content, messageId } = body

    if (!agentId || !content) {
      return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
    }

    const session = chatSessions.get(agentId)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Create response message
    const response: Message = {
      id: generateId(),
      agentId,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      read: false,
      replyTo: messageId
    }

    session.messages.push(response)
    session.lastActivity = new Date().toISOString()

    return NextResponse.json({ message: response })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
