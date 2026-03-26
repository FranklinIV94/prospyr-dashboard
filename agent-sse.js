#!/usr/bin/env node
/**
 * Prospyr Agent - Real-time SSE Client
 * 
 * Connects to dashboard via Server-Sent Events (SSE) for instant
 * task delivery, chat messages, and command execution.
 * 
 * Usage:
 *   node agent-sse.js --agent-id <id> --agent-name <name> --dashboard-url <url>
 * 
 * Environment variables:
 *   PROSPYR_AGENT_ID       - Agent ID
 *   PROSPYR_AGENT_NAME     - Agent name  
 *   PROSPYR_DASHBOARD_URL  - Dashboard URL (e.g., https://control.simplifyingbusinesses.com)
 *   PROSPYR_AGENT_TOKEN    - Authentication token
 */

const API_BASE = process.env.PROSPYR_DASHBOARD_URL || 'https://control.simplifyingbusinesses.com'
const AGENT_ID = process.env.PROSPYR_AGENT_ID || 'southstar-001'
const AGENT_NAME = process.env.PROSPYR_AGENT_NAME || 'Southstar'
const AGENT_ROLE = process.env.PROSPYR_AGENT_ROLE || 'coo'
const AGENT_CAPABILITIES = (process.env.PROSPYR_AGENT_CAPABILITIES || 'operations,research,code,system_admin').split(',')

let eventSource = null
let isConnected = false
let reconnectAttempts = 0
const MAX_RECONNECT_DELAY = 30000
let currentTaskId = null

// Console styling
const styles = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

function log(type, ...args) {
  const timestamp = new Date().toISOString()
  const icons = {
    info: 'ℹ️',
    success: '✅',
    warn: '⚠️',
    error: '❌',
    task: '📋',
    chat: '💬',
    sse: '🔌',
    heartbeat: '💓'
  }
  console.log(`${styles.dim}[${timestamp}]${styles.reset} ${icons[type] || '•'} ${styles.cyan}[${AGENT_NAME}]${styles.reset}`, ...args)
}

// Register agent with dashboard
async function registerAgent() {
  try {
    log('info', `Registering as ${AGENT_NAME} (${AGENT_ID})...`)
    
    const res = await fetch(`${API_BASE}/api/prospyr/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        name: AGENT_NAME,
        role: AGENT_ROLE,
        capabilities: AGENT_CAPABILITIES
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      log('success', `Registered: ${data.agent.name} (${data.agent.role})`)
      return true
    } else {
      log('error', `Registration failed: ${res.status}`)
      return false
    }
  } catch (error) {
    log('error', `Registration error:`, error.message)
    return false
  }
}

// Send heartbeat
async function sendHeartbeat(status = 'idle') {
  try {
    await fetch(`${API_BASE}/api/prospyr/agents`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        status,
        currentTaskId
      })
    })
    log('heartbeat', `Heartbeat: ${status}`)
  } catch (error) {
    log('warn', `Heartbeat failed:`, error.message)
  }
}

// Update task status
async function updateTaskStatus(taskId, status, result = null, error = null) {
  try {
    if (status === 'completed' || status === 'failed') {
      currentTaskId = null
    }
    
    await fetch(`${API_BASE}/api/prospyr/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        status,
        result,
        error
      })
    })
    
    log('task', `Task ${taskId} -> ${status}`)
  } catch (error) {
    log('error', `Failed to update task:`, error.message)
  }
}

// Send chat response
async function sendChatResponse(messageId, content) {
  try {
    await fetch(`${API_BASE}/api/prospyr/chat/${messageId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    log('chat', `Response sent: ${content.substring(0, 50)}...`)
  } catch (error) {
    log('error', `Failed to send response:`, error.message)
  }
}

// Process a task (implement your actual task logic here)
async function processTask(task) {
  log('task', `Processing: ${task.description}`)
  log('info', `Task type: ${task.type}, priority: ${task.priority}`)
  
  // Simulate work - replace with actual implementation
  // This is where you'd call your AI, run commands, etc.
  
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Example: return success result
  return {
    success: true,
    output: `Task completed: ${task.description}`,
    timestamp: new Date().toISOString()
  }
}

// Handle incoming events from dashboard
function handleEvent(event) {
  const data = typeof event === 'string' ? JSON.parse(event) : event
  
  log('sse', `Event received: ${data.type}`)
  
  switch (data.type) {
    case 'connected':
      log('success', 'Connected to dashboard SSE stream')
      isConnected = true
      reconnectAttempts = 0
      sendHeartbeat('idle')
      break
      
    case 'new_task':
      handleNewTask(data.task)
      break
      
    case 'new_message':
      handleNewMessage(data.message)
      break
      
    case 'cancel_task':
      handleCancelTask(data.taskId)
      break
      
    case 'ping':
      log('heartbeat', 'Received ping from dashboard')
      break
      
    default:
      log('warn', `Unknown event type: ${data.type}`)
  }
}

// Handle new task
async function handleNewTask(task) {
  log('task', `New task received: ${task.id}`)
  log('info', `Description: ${task.description}`)
  
  currentTaskId = task.id
  
  try {
    // Update status to running
    await updateTaskStatus(task.id, 'running')
    
    // Process the task
    const result = await processTask(task)
    
    // Complete the task
    await updateTaskStatus(task.id, 'completed', JSON.stringify(result))
    log('success', `Task completed: ${task.id}`)
    
  } catch (error) {
    log('error', `Task failed: ${error.message}`)
    await updateTaskStatus(task.id, 'failed', null, error.message)
  }
  
  sendHeartbeat('idle')
}

// Handle new message
async function handleNewMessage(message) {
  log('chat', `New message from user:`)
  log('info', message.content)
  
  // Send automatic acknowledgment (replace with AI processing)
  const response = `[${AGENT_NAME}] Message received. I'm currently ${currentTaskId ? 'processing a task' : 'idle'}. I'll respond to your message shortly.`
  
  try {
    await fetch(`${API_BASE}/api/prospyr/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        content: response,
        replyTo: message.id
      })
    })
    log('success', 'Response sent')
  } catch (error) {
    log('error', 'Failed to send response:', error.message)
  }
}

// Handle task cancellation
async function handleCancelTask(taskId) {
  log('warn', `Task cancellation received: ${taskId}`)
  
  if (currentTaskId === taskId) {
    currentTaskId = null
    log('warn', 'Current task cancelled')
    sendHeartbeat('idle')
  }
}

// Connect to SSE stream
function connect() {
  const sseUrl = `${API_BASE}/api/prospyr/events?agentId=${encodeURIComponent(AGENT_ID)}`
  
  log('info', `Connecting to SSE: ${sseUrl}`)
  
  eventSource = new EventSource(sseUrl)
  
  eventSource.onopen = () => {
    log('success', 'SSE connection established')
    isConnected = true
    reconnectAttempts = 0
  }
  
  eventSource.onmessage = (event) => {
    if (event.data && !event.data.startsWith(':')) {
      handleEvent(event.data)
    }
  }
  
  eventSource.onerror = (error) => {
    log('error', 'SSE connection error')
    isConnected = false
    eventSource.close()
    
    // Reconnect with exponential backoff
    reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY)
    
    log('warn', `Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
    
    setTimeout(connect, delay)
  }
  
  // Custom event listeners
  eventSource.addEventListener('task', (event) => {
    handleEvent(event.data)
  })
  
  eventSource.addEventListener('message', (event) => {
    handleEvent(event.data)
  })
}

// Graceful shutdown
async function shutdown() {
  log('warn', 'Shutting down...')
  
  if (eventSource) {
    eventSource.close()
  }
  
  await sendHeartbeat('offline')
  
  log('warn', 'Shutdown complete')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Main
async function main() {
  console.log(`
${styles.bright}${styles.cyan}
╔═══════════════════════════════════════════════════════════╗
║     Prospyr Agent - Real-time SSE Client                  ║
╠═══════════════════════════════════════════════════════════╣
║     Agent: ${AGENT_NAME.padEnd(47)}║
║     Role:  ${AGENT_ROLE.padEnd(47)}║
║     Dashboard: ${API_BASE.substring(0, 40).padEnd(40)}║
╚═══════════════════════════════════════════════════════════╝${styles.reset}
`)
  
  // Register with dashboard
  const registered = await registerAgent()
  if (!registered) {
    log('error', 'Failed to register. Retrying in 5 seconds...')
    setTimeout(main, 5000)
    return
  }
  
  // Connect to SSE stream
  connect()
  
  // Periodic heartbeat
  setInterval(() => {
    if (isConnected && !currentTaskId) {
      sendHeartbeat('idle')
    }
  }, 30000)
  
  log('success', 'Agent started. Waiting for tasks...')
}

main()
