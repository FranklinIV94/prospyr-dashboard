// Paperclip API client - server-side
// Railway deployment: uses PAPERCLIP_API env var
// Local dev: falls back to localhost:3100

export const PAPERCLIP_API = process.env.PAPERCLIP_API || 'http://localhost:3100'
export const PAPERCLIP_KEY = process.env.PAPERCLIP_KEY || ''
export const PAPERCLIP_COMPANY = process.env.PAPERCLIP_COMPANY || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b'

export interface Agent {
  id: string
  name: string
  role: string
  adapterType: string
  status: 'idle' | 'running' | 'stopped'
}

export interface Flow {
  id: string
  name: string
  status: string
  createdAt: string
  updatedAt: string
}

export async function getAgents(): Promise<Agent[]> {
  const res = await fetch(`${PAPERCLIP_API}/api/companies/${PAPERCLIP_COMPANY}/agents`, {
    headers: { Authorization: `Bearer ${PAPERCLIP_KEY}` },
    next: { revalidate: 10 }, // ISR: revalidate every 10s
  })
  if (!res.ok) throw new Error(`Paperclip API error: ${res.status}`)
  const data = await res.json()
  // Handle both raw array and wrapped response
  return Array.isArray(data) ? data : data?.data || []
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${PAPERCLIP_API}/api/health`)
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`)
  return res.json()
}

// Send a message to an agent via OpenClaw gateway
export async function sendMessage(
  agentId: string,
  message: string,
  gatewayUrl: string,
  gatewayToken: string
): Promise<string> {
  const res = await fetch(`${gatewayUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: `openclaw:${agentId}`,
      messages: [{ role: 'user', content: message }],
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Gateway error ${res.status}: ${error}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'No response'
}
