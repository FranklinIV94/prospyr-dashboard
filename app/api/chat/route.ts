// API route: /api/chat
// Simple queue-based chat - no persistence needed
// Agent polls for messages, responds inline

import { NextRequest, NextResponse } from 'next/server'
import { addMessage, getMessages, markProcessed, addResponse, getResponse, clearProcessed } from '../../../lib/queue'

export const dynamic = 'force-dynamic'

// GET - Agent polls for messages, or dashboard checks for responses
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const agentId = url.searchParams.get('agentId')
  const responseId = url.searchParams.get('responseId')

  // Agent polling for messages
  if (agentId) {
    const messages = getMessages(agentId)
    return NextResponse.json({ messages })
  }

  // Dashboard checking for a response to a specific message
  if (responseId) {
    const response = getResponse(responseId)
    if (response) {
      return NextResponse.json({ response })
    }
    return NextResponse.json({ response: null })
  }

  return NextResponse.json({ error: 'agentId or responseId required' }, { status: 400 })
}

// POST - User sends message (dashboard -> queue)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, content } = body

    if (!agentId || !content) {
      return NextResponse.json({ error: 'agentId and content required' }, { status: 400 })
    }

    const messageId = addMessage(agentId, content)

    return NextResponse.json({
      success: true,
      messageId,
      queued: true
    }, { status: 201 })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// PUT - Agent responds to a message
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId, content, agentId } = body

    if (!messageId || !content) {
      return NextResponse.json({ error: 'messageId and content required' }, { status: 400 })
    }

    // Mark original message as processed
    markProcessed(messageId)

    // Add response to queue
    addResponse(messageId, content)

    return NextResponse.json({ success: true })

  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
