#!/usr/bin/env node
/**
 * Prospyr Agent - Real-time SSE Client
 * Connects to dashboard via SSE, polls for messages, responds to tasks
 */

const API_BASE = process.env.PROSPYR_DASHBOARD_URL || 'https://control.simplifyingbusinesses.com'
const AGENT_ID = process.env.PROSPYR_AGENT_ID || 'southstar-001'
const AGENT_NAME = process.env.PROSPYR_AGENT_NAME || 'Southstar'
const AGENT_CAPABILITIES = (process.env.PROSPYR_AGENT_CAPABILITIES || 'security-audit,code-review,document-processing,web-search,client-communication').split(',')

const { EventSource } = require('eventsource')
global.EventSource = EventSource

let eventSource = null
let isConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 30000
let currentTaskId = null

const styles = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

function log(type, ...args) {
  const timestamp = new Date().toISOString()
  const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌', task: '📋', chat: '💬', sse: '🔌', heartbeat: '💓' }
  console.log(`${styles.dim}[${timestamp}]${styles.reset} ${icons[type] || '•'} ${styles.cyan}[${AGENT_NAME}]${styles.reset}`, ...args)
}

async function registerAgent() {
  try {
    log('info', `Registering as ${AGENT_NAME}...`)
    const res = await fetch(`${API_BASE}/api/prospyr/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID, name: AGENT_NAME, capabilities: AGENT_CAPABILITIES })
    })
    if (res.ok) { log('success', 'Registered'); return true }
    log('error', `Registration failed: ${res.status}`); return false
  } catch (error) { log('error', `Error: ${error.message}`); return false }
}

async function sendHeartbeat(status = 'available') {
  try {
    await fetch(`${API_BASE}/api/prospyr/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: AGENT_ID, name: AGENT_NAME, capabilities: AGENT_CAPABILITIES, status, currentTaskId })
    })
  } catch {}
}

async function updateTaskStatus(taskId, status, result = null, error = null) {
  try {
    if (status === 'completed' || status === 'failed') currentTaskId = null
    await fetch(`${API_BASE}/api/prospyr/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status, result, error })
    })
    log('task', `Task ${taskId} -> ${status}`)
  } catch (error) { log('error', `Task update failed: ${error.message}`) }
}

async function processTask(task) {
  log('task', `Processing: ${task.title || task.description}`)
  // Simulate processing
  await new Promise(resolve => setTimeout(resolve, 1000))
  return { success: true, output: `Completed: ${task.description}`, timestamp: new Date().toISOString() }
}

async function pollMessages() {
  try {
    // Get chat history
    const res = await fetch(`${API_BASE}/api/chat?agentId=${encodeURIComponent(AGENT_ID)}`)
    if (!res.ok) return
    const data = await res.json()
    const messages = data.messages || []
    
    // Find unread user messages
    const unread = messages.filter(m => m.role === 'user' && !m.read)
    for (const msg of unread) {
      log('chat', `New message: ${msg.content.substring(0, 50)}...`)
      
      // Send auto-response
      const responses = [
        `Thanks for your message! I'm currently ${currentTaskId ? 'working on a task' : 'available'}.`,
        `Got your message. I'll get back to you shortly.`,
        `Message received! How can I help you today?`
      ]
      const response = `[${AGENT_NAME}] ${responses[Math.floor(Math.random() * responses.length)]}`
      
      await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: AGENT_ID, content: response, replyTo: msg.id })
      })
      log('chat', 'Response sent')
    }
  } catch (error) { log('warn', `Poll error: ${error.message}`) }
}

function handleEvent(event) {
  const data = typeof event === 'string' ? JSON.parse(event) : event
  log('sse', `Event: ${data.type}`)
  switch (data.type) {
    case 'connected': isConnected = true; reconnectAttempts = 0; log('success', 'Connected'); sendHeartbeat('available'); break
    case 'new_task': handleNewTask(data.task); break
    case 'chat_message': log('chat', `Dashboard message: ${data.message?.content}`); break
    case 'ping': break
    default: log('warn', `Unknown: ${data.type}`)
  }
}

async function handleNewTask(task) {
  log('task', `New task: ${task.id}`)
  currentTaskId = task.id
  try {
    await updateTaskStatus(task.id, 'in_progress')
    const result = await processTask(task)
    await updateTaskStatus(task.id, 'completed', JSON.stringify(result))
    log('success', 'Task completed')
  } catch (error) {
    log('error', `Task failed: ${error.message}`)
    await updateTaskStatus(task.id, 'failed', null, error.message)
  }
  sendHeartbeat('available')
}

function connect() {
  const sseUrl = `${API_BASE}/api/prospyr/events?agentId=${encodeURIComponent(AGENT_ID)}`
  log('info', `Connecting to SSE...`)
  eventSource = new EventSource(sseUrl)
  eventSource.onopen = () => { isConnected = true; reconnectAttempts = 0; log('success', 'SSE connected') }
  eventSource.onmessage = (event) => { if (event.data && !event.data.startsWith(':')) handleEvent(event.data) }
  eventSource.onerror = () => {
    log('error', 'SSE error'); isConnected = false; eventSource.close()
    reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
    log('warn', `Reconnecting in ${delay}ms...`)
    setTimeout(connect, delay)
  }
}

async function shutdown() {
  log('warn', 'Shutting down...')
  if (eventSource) eventSource.close()
  await sendHeartbeat('offline')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

async function main() {
  console.log(`\n${styles.bright}${styles.cyan}╔═══════════════════════════════════════╗
║  Prospyr Agent - SSE Client            ║
╠═══════════════════════════════════════╣
║  Agent: ${AGENT_NAME.padEnd(32)}║
║  Dashboard: ${API_BASE.substring(0, 30).padEnd(30)}║
╚═══════════════════════════════════════╝${styles.reset}\n`)
  
  const registered = await registerAgent()
  if (!registered) { log('error', 'Registration failed'); setTimeout(main, 5000); return }
  
  connect()
  
  // Heartbeat every 30s
  setInterval(() => { if (isConnected) sendHeartbeat(currentTaskId ? 'busy' : 'available') }, 30000)
  
  // Poll for messages every 5s
  setInterval(() => { if (isConnected) pollMessages() }, 5000)
  
  log('success', 'Agent running. Ctrl+C to stop.')
}

main()
