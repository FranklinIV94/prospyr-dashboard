// API route: /api/chat
// Handles chat messages with Supabase database persistence

import { NextRequest, NextResponse } from 'next/server'
import { readJsonFile, writeJsonFile } from '../../lib/storage'
import { getMessages, createMessage, markMessagesRead } from '../../lib/database'

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

const CHAT_FILE = 'chat.json'

function generateId() {
  return crypto.randomUUID()
}

// File-based sessions (fallback)
function getSessions(): Map<string, any> {
  const data = readJsonFile<Record<string, any>>(CHAT_FILE, {})
  return new Map(Object.entries(data))
}

function saveSessions(sessions: Map<string, any>) {
  const obj = Object.fromEntries(sessions)
  writeJsonFile(CHAT_FILE, obj)
}

// GET - Get chat history for an agent
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')

  if (!agentId) {
    return NextResponse.json({ error: 'agentId required' }, { status: 400 })
  }

  // Try database first
  const dbMessages = await getMessages(agentId)
  
  if (dbMessages !== null) {
    await markMessagesRead(agentId)
    return NextResponse.json({
      messages: dbMessages.map((m: any) => ({
        id: m.id,
        agentId: m.agent_id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        read: m.read,
        replyTo: m.reply_to
      })),
      session: { agentId, lastActivity: new Date().toISOString() }
    })
  }

  // Fallback to file storage
  const sessions = getSessions()
  const session = sessions.get(agentId)
  
  if (!session) {
    return NextResponse.json({ messages: [], session: null })
  }

  session.messages.forEach((m: Message) => { m.read = true })
  sessions.set(agentId, session)
  saveSessions(sessions)

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

    const newMessage = {
      id: generateId(),
      agent_id: agentId,
      role: 'user',
      content: messageContent,
      timestamp: new Date().toISOString(),
      read: false,
      reply_to: replyTo || null
    }

    // Try database first
    const dbResult = await createMessage({
      agent_id: agentId,
      role: 'user',
      content: messageContent,
      read: false,
      reply_to: replyTo || null
    })
    
    if (dbResult !== null) {
      return NextResponse.json({
        message: {
          id: dbResult.id,
          agentId: dbResult.agent_id,
          role: dbResult.role,
          content: dbResult.content,
          timestamp: dbResult.timestamp,
          read: dbResult.read,
          replyTo: dbResult.reply_to
        },
        stored: true
      }, { status: 201 })
    }

    // Fallback to file storage
    const sessions = getSessions()

    if (!sessions.has(agentId)) {
      sessions.set(agentId, {
        id: generateId(),
        agentId,
        messages: [],
        lastActivity: new Date().toISOString()
      })
    }

    const session = sessions.get(agentId)!
    session.messages.push(newMessage)
    session.lastActivity = new Date().toISOString()
    sessions.set(agentId, session)
    saveSessions(sessions)

    return NextResponse.json({
      message: newMessage,
      stored: true
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// PUT - Agent responds to a message
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, content, messageId } = body

    if (!agentId || !content) {
      return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
    }

    const response = {
      id: generateId(),
      agent_id: agentId,
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
      read: false,
      reply_to: messageId || null
    }

    // Try database first
    const dbResult = await createMessage({
      agent_id: agentId,
      role: 'assistant',
      content,
      read: false,
      reply_to: messageId || null
    })
    
    if (dbResult !== null) {
      return NextResponse.json({ 
        message: {
          id: dbResult.id,
          agentId: dbResult.agent_id,
          role: dbResult.role,
          content: dbResult.content,
          timestamp: dbResult.timestamp,
          read: dbResult.read,
          replyTo: dbResult.reply_to
        }
      })
    }

    // Fallback to file storage
    const sessions = getSessions()
    const session = sessions.get(agentId)
    
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    session.messages.push(response)
    session.lastActivity = new Date().toISOString()
    sessions.set(agentId, session)
    saveSessions(sessions)

    return NextResponse.json({ message: response })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
