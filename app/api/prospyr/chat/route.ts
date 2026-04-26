// POST /api/prospyr/chat — send a message to an agent
// GET /api/prospyr/chat?agentId=xxx — get message history for an agent

import { NextRequest, NextResponse } from 'next/server'
import { addMessage, getMessages } from '@/lib/store'
import { ChatMessage } from '@/lib/types'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) {
    return NextResponse.json({ error: 'agentId is required' }, { status: 400 })
  }
  const msgs = getMessages(agentId)
  return NextResponse.json({ messages: msgs })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { toAgentId, content, from, fromId, fromName } = body

    if (!toAgentId || !content) {
      return NextResponse.json({ error: 'toAgentId and content are required' }, { status: 400 })
    }

    const message: ChatMessage = {
      id: randomUUID(),
      from: from || 'user',
      fromId: fromId || 'user',
      fromName: fromName || 'Franklin',
      toAgentId,
      content,
      timestamp: new Date().toISOString()
    }

    addMessage(message)

    return NextResponse.json({ success: true, message }, { status: 201 })
  } catch (e) {
    console.error('chat route error:', e)
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}