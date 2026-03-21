// Next.js API route: /api/proxy
// Proxies requests to Southstar's Paperclip via Tailscale tunnel
// Keeps API keys server-side, not exposed to client

import type { NextRequest } from 'next/server'

const PAPERCLIP_API = process.env.PAPERCLIP_API || 'http://localhost:3100'
const PAPERCLIP_KEY = process.env.PAPERCLIP_KEY || ''

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || ''

  try {
    const res = await fetch(`${PAPERCLIP_API}${path}`, {
      headers: {
        Authorization: `Bearer ${PAPERCLIP_KEY}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    return Response.json(
      { error: 'Proxy failed', details: String(err) },
      { status: 502 }
    )
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || ''

  try {
    const body = await request.json()

    const res = await fetch(`${PAPERCLIP_API}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAPERCLIP_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    return Response.json(
      { error: 'Proxy failed', details: String(err) },
      { status: 502 }
    )
  }
}
