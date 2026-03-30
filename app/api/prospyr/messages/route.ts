// API route: /api/prospyr/messages
// Send messages to agents (real-time via SSE)
// Supports GET (poll) and POST (send)

import { NextRequest, NextResponse } from 'next/server'
import { sendMessageToAgent } from '../events/route'

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

// GET - Get messages or poll for new messages
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')
  const action = url.searchParams.get('action')

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  // Poll for new messages
  if (action === 'poll') {
    const session = chatSessions.get(agentId)
    if (!session) {
      return NextResponse.json({ messages: [] })
    }
    const unread = session.messages.filter(m => !m.read && m.role === 'user')
    return NextResponse.json({ messages: unread })
  }

  // Get full chat history
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

// POST - Send a message to an agent (or poll via query params)
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const agentId = url.searchParams.get('agentId') || url.searchParams.get('to')
    const content = url.searchParams.get('content')
    const action = url.searchParams.get('action')

    // If using query params (workaround for POST blocking)
    if (action === 'send' || (agentId && content)) {
      const targetAgentId = agentId || url.searchParams.get('to')
      const msgContent = content || url.searchParams.get('message')

      if (!targetAgentId || !msgContent) {
        return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
      }

      if (!chatSessions.has(targetAgentId)) {
        chatSessions.set(targetAgentId, {
          id: generateId(),
          agentId: targetAgentId,
          messages: [],
          lastActivity: new Date().toISOString()
        })
      }

      const session = chatSessions.get(targetAgentId)!

      const message: Message = {
        id: generateId(),
        agentId: targetAgentId,
        role: 'user',
        content: msgContent,
        timestamp: new Date().toISOString(),
        read: false
      }

      session.messages.push(message)
      session.lastActivity = new Date().toISOString()

      sendMessageToAgent(targetAgentId, message)

      return NextResponse.json({
        message,
        sessionId: session.id,
        delivered: true
      }, { status: 201 })
    }

    // Try JSON body
    const body = await request.json().catch(() => ({}))
    const { agentId: bodyAgentId, content: bodyContent } = body

    if (!bodyAgentId || !bodyContent) {
      return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
    }

    if (!chatSessions.has(bodyAgentId)) {
      chatSessions.set(bodyAgentId, {
        id: generateId(),
        agentId: bodyAgentId,
        messages: [],
        lastActivity: new Date().toISOString()
      })
    }

    const session = chatSessions.get(bodyAgentId)!

    const message: Message = {
      id: generateId(),
      agentId: bodyAgentId,
      role: 'user',
      content: bodyContent,
      timestamp: new Date().toISOString(),
      read: false
    }

    session.messages.push(message)
    session.lastActivity = new Date().toISOString()

    sendMessageToAgent(bodyAgentId, message)

    return NextResponse.json({
      message,
      sessionId: session.id,
      delivered: true
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
