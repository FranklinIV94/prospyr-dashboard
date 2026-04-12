// Simple in-memory message queue for Prospyr
// No persistence needed - agent is always running on Franklin's machine

interface QueuedMessage {
  id: string
  agentId: string
  content: string
  timestamp: string
  processed: boolean
}

// In-memory queue - resets on Railway cold start
// Agent polls and marks as processed
const messageQueue: QueuedMessage[] = []

// Response queue - agent posts responses here
const responseQueue: Map<string, QueuedMessage> = new Map()

export function addMessage(agentId: string, content: string): string {
  const id = crypto.randomUUID()
  messageQueue.push({
    id,
    agentId,
    content,
    timestamp: new Date().toISOString(),
    processed: false
  })
  return id
}

export function getMessages(agentId: string): QueuedMessage[] {
  const messages = messageQueue.filter(m => m.agentId === agentId && !m.processed)
  return messages
}

export function markProcessed(messageId: string): void {
  const msg = messageQueue.find(m => m.id === messageId)
  if (msg) msg.processed = true
}

export function addResponse(originalId: string, content: string): void {
  responseQueue.set(originalId, {
    id: originalId,
    agentId: 'dashboard',
    content,
    timestamp: new Date().toISOString(),
    processed: true
  })
}

export function getResponse(originalId: string): QueuedMessage | undefined {
  return responseQueue.get(originalId)
}

export function clearProcessed(): void {
  // Clean up old processed messages periodically
  const cutoff = Date.now() - 60000 // 1 minute
  for (let i = messageQueue.length - 1; i >= 0; i--) {
    const msg = messageQueue[i]
    if (msg.processed) {
      const msgTime = new Date(msg.timestamp).getTime()
      if (msgTime < cutoff) {
        messageQueue.splice(i, 1)
      }
    }
  }
}
