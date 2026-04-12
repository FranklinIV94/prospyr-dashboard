#!/usr/bin/env node
/**
 * Prospyr Agent - Simple Queue-Based Client
 * Polls for messages, responds directly
 */

const API_BASE = process.env.PROSPYR_DASHBOARD_URL || 'https://control.simplifyingbusinesses.com'
const AGENT_ID = process.env.PROSPYR_AGENT_ID || 'southstar-001'
const AGENT_NAME = process.env.PROSPYR_AGENT_NAME || 'Southstar'
const AGENT_CAPABILITIES = (process.env.PROSPYR_AGENT_CAPABILITIES || 'security-audit,code-review,document-processing,web-search,client-communication').split(',')

const { EventSource } = require('eventsource')
global.EventSource = EventSource

let currentTaskId = null

const styles = {
  reset: '\x1b[0m', bright: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

function log(type, ...args) {
  const timestamp = new Date().toISOString()
  const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌', task: '📋', chat: '💬', poll: '🔄' }
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
  await new Promise(resolve => setTimeout(resolve, 2000))
  return { success: true, output: `Completed: ${task.description}`, timestamp: new Date().toISOString() }
}

async function pollMessages() {
  try {
    // Poll for messages addressed to this agent
    const res = await fetch(`${API_BASE}/api/chat?agentId=${encodeURIComponent(AGENT_ID)}`)
    if (!res.ok) return
    const data = await res.json()
    const messages = data.messages || []
    
    for (const msg of messages) {
      log('chat', `New message: ${msg.content.substring(0, 50)}...`)
      
      // Generate response
      const responses = [
        `Got your message! I'm ${currentTaskId ? 'busy with a task' : 'available'} and ready to help.`,
        `Message received. How can I assist you today?`,
        `I'm here and ready to help. What's on your mind?`
      ]
      const response = `[${AGENT_NAME}] ${responses[Math.floor(Math.random() * responses.length)]}`
      
      // Send response directly via POST
      await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: AGENT_ID, role: 'assistant', content: response, messageId: msg.id })
      })
      
      log('chat', 'Response sent')
    }
  } catch (error) { log('warn', `Poll error: ${error.message}`) }
}

async function pollTasks() {
  try {
    const res = await fetch(`${API_BASE}/api/prospyr/tasks?status=pending`)
    if (!res.ok) return
    const data = await res.json()
    const tasks = data.tasks || []
    
    for (const task of tasks) {
      if (!currentTaskId && task.status === 'pending') {
        log('task', `New task: ${task.id} - ${task.title || task.description}`)
        currentTaskId = task.id
        
        try {
          await updateTaskStatus(task.id, 'in_progress')
          const result = await processTask(task)
          await updateTaskStatus(task.id, 'completed', JSON.stringify(result))
          log('success', `Task completed`)
        } catch (error) {
          log('error', `Task failed: ${error.message}`)
          await updateTaskStatus(task.id, 'failed', null, error.message)
        }
        
        currentTaskId = null
      }
    }
  } catch (error) { log('warn', `Task poll error: ${error.message}`) }
}

async function shutdown() {
  log('warn', 'Shutting down...')
  await sendHeartbeat('offline')
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

async function main() {
  console.log(`\n${styles.bright}${styles.cyan}╔═══════════════════════════════════════╗
║  Prospyr Agent - Simple Queue Client    ║
╠═══════════════════════════════════════╣
║  Agent: ${AGENT_NAME.padEnd(32)}║
║  Dashboard: ${API_BASE.substring(0, 30).padEnd(30)}║
╚═══════════════════════════════════════╝${styles.reset}\n`)
  
  const registered = await registerAgent()
  if (!registered) { log('error', 'Registration failed'); setTimeout(main, 5000); return }
  
  // Poll every 5 seconds
  setInterval(pollMessages, 5000)
  setInterval(pollTasks, 5000)
  setInterval(() => sendHeartbeat(currentTaskId ? 'busy' : 'available'), 30000)
  
  log('success', 'Agent running. Ctrl+C to stop.')
  
  // Initial polls
  pollMessages()
  pollTasks()
}

main()
