// API route: /api/chat
// Sends messages to agents via OpenClaw gateway

import type { NextRequest } from 'next/server'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:18789'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || '253ecf95f29059457d37566657ab1f1b68dedfab205fffde'

export async function POST(request: NextRequest) {
  try {
    const { agentId, message, sessionId } = await request.json()

    if (!agentId || !message) {
      return Response.json({ error: 'agentId and message required' }, { status: 400 })
    }

    // Send message to agent via OpenClaw gateway
    const gatewayRes = await fetch(`${GATEWAY_URL}/v1/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        message,
        sessionId: sessionId || crypto.randomUUID(),
      }),
    })

    if (!gatewayRes.ok) {
      const error = await gatewayRes.text()
      return Response.json({ error: `Gateway error: ${error}` }, { status: gatewayRes.status })
    }

    const data = await gatewayRes.json()
    return Response.json(data)
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}

export async function GET() {
  // Return available agents from Paperclip
  const PAPERCLIP_API = process.env.NEXT_PUBLIC_PAPERCLIP_API || 'http://localhost:3100'
  const PAPERCLIP_KEY = process.env.NEXT_PUBLIC_PAPERCLIP_KEY || ''
  const PAPERCLIP_COMPANY = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b'

  try {
    const res = await fetch(`${PAPERCLIP_API}/api/companies/${PAPERCLIP_COMPANY}/agents`, {
      headers: { Authorization: `Bearer ${PAPERCLIP_KEY}` },
    })
    const agents = await res.json()
    return Response.json({ agents })
  } catch (error) {
    return Response.json({ error: String(error), agents: [] }, { status: 500 })
  }
}
