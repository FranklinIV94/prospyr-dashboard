// API route: /api/chat
// Proxies chat requests to OpenClaw gateway
// Called from browser → Railway → Southstar gateway

import type { NextRequest } from 'next/server'

const GATEWAY_TOKEN = '253ecf95f29059457d37566657ab1f1b68dedfab205fffde'

// Use internal Tailscale IP - Railway servers can reach this
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'https://alllinesauto.taile32c4c.ts.net:18789'

export async function POST(request: NextRequest) {
  try {
    const { agentId, message } = await request.json()

    if (!agentId || !message) {
      return Response.json({ error: 'agentId and message required' }, { status: 400 })
    }

    // Route to gateway via Tailscale Funnel
    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: `openclaw:${agentId}`,
        messages: [{ role: 'user', content: message }],
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      return Response.json({ error: `Gateway error ${res.status}: ${error}` }, { status: res.status })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || 'No response'
    return Response.json({ reply })
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 })
  }
}