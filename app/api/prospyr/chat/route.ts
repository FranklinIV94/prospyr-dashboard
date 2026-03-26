// API route: /api/prospyr/chat
// Send messages to agents and poll for responses

import type { NextRequest } from 'next/server'

interface Message {
  id: string
  agentId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  read: boolean
}

interface ChatSession {
  id: string
  agentId: string
  messages: Message[]
  lastActivity: string
}

// In-memory chat store (would be Redis in production)
const chatSessions: Map<string, ChatSession> = new Map()

function generateId() {
  return crypto.randomUUID()
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')
  const action = url.searchParams.get('action')

  // Agent polling for new messages
  if (action === 'poll' && agentId) {
    const session = chatSessions.get(agentId)
    if (!session) {
      return Response.json({ messages: [] })
    }
    
    // Return unread messages addressed to this agent
    const unread = session.messages.filter(m => !m.read && m.role === 'user')
    return Response.json({ messages: unread })
  }

  // Get full chat history for agent
  if (agentId) {
    const session = chatSessions.get(agentId)
    if (!session) {
      return Response.json({ messages: [], session: null })
    }
    return Response.json({ 
      messages: session.messages,
      session: {
        agentId: session.agentId,
        lastActivity: session.lastActivity
      }
    })
  }

  // List all sessions
  const sessions = Array.from(chatSessions.values()).map(s => ({
    agentId: s.agentId,
    messageCount: s.messages.length,
    lastActivity: s.lastActivity
  }))
  return Response.json({ sessions })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, content, action } = body

    if (action === 'send' && agentId && content) {
      // Send a message to an agent
      if (!chatSessions.has(agentId)) {
        chatSessions.set(agentId, {
          id: generateId(),
          agentId,
          messages: [],
          lastActivity: new Date().toISOString()
        })
      }

      const session = chatSessions.get(agentId)!
      const message: Message = {
        id: generateId(),
        agentId,
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
        read: false
      }

      session.messages.push(message)
      session.lastActivity = new Date().toISOString()

      return Response.json({ message, sessionId: session.id }, { status: 201 })
    }

    if (action === 'respond' && agentId && content) {
      // Agent responding to messages
      if (!chatSessions.has(agentId)) {
        return Response.json({ error: 'No chat session found' }, { status: 404 })
      }

      const session = chatSessions.get(agentId)!
      const response: Message = {
        id: generateId(),
        agentId,
        role: 'assistant',
        content,
        timestamp: new Date().toISOString(),
        read: true // Agent messages marked as read
      }

      session.messages.push(response)
      session.lastActivity = new Date().toISOString()

      return Response.json({ message: response })
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, messageIds } = body

    if (!agentId || !messageIds) {
      return Response.json({ error: 'agentId and messageIds required' }, { status: 400 })
    }

    const session = chatSessions.get(agentId)
    if (!session) {
      return Response.json({ error: 'No chat session found' }, { status: 404 })
    }

    session.messages.forEach(m => {
      if (messageIds.includes(m.id)) {
        m.read = true
      }
    })

    return Response.json({ success: true })
  } catch (error) {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
