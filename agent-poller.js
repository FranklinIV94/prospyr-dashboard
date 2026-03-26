#!/usr/bin/env node
/**
 * Prospyr Agent Polling Client
 * 
 * This script runs on Southstar and polls the dashboard
 * for tasks, processes them, and reports results back.
 * 
 * Usage:
 *   node agent-poller.js --agent-id <id> --agent-name <name> --dashboard-url <url>
 * 
 * Environment variables:
 *   PROSPYR_AGENT_ID      - Agent ID
 *   PROSPYR_AGENT_NAME    - Agent name
 *   PROSPYR_DASHBOARD_URL - Dashboard base URL (e.g., https://control.simplifyingbusinesses.com)
 *   PROSPYR_AGENT_TOKEN   - Secret token for authentication
 */

const API_BASE = process.env.PROSPYR_DASHBOARD_URL || 'https://control.simplifyingbusinesses.com'
const AGENT_ID = process.env.PROSPYR_AGENT_ID || 'southstar-001'
const AGENT_NAME = process.env.PROSPYR_AGENT_NAME || 'Southstar'
const AGENT_TOKEN = process.env.PROSPYR_AGENT_TOKEN || ''
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '5000') // 5 seconds

let isRunning = true
let currentTaskId = null

// Register agent with dashboard
async function registerAgent() {
  try {
    const res = await fetch(`${API_BASE}/api/prospyr/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        name: AGENT_NAME,
        role: 'coo',
        capabilities: ['operations', 'research', 'code', 'system_admin', 'memory', 'web_search']
      })
    })
    
    if (res.ok) {
      const data = await res.json()
      console.log(`[${new Date().toISOString()}] ✅ Agent registered: ${data.agent.name} (${data.agent.id})`)
      return true
    } else {
      console.error(`[${new Date().toISOString()}] ❌ Registration failed: ${res.status}`)
      return false
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Registration error:`, error.message)
    return false
  }
}

// Send heartbeat to dashboard
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
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ⚠️ Heartbeat failed:`, error.message)
  }
}

// Poll for tasks
async function pollForTasks() {
  try {
    const res = await fetch(`${API_BASE}/api/prospyr/tasks?action=poll&agentId=${encodeURIComponent(AGENT_ID)}`)
    
    if (!res.ok) {
      console.error(`[${new Date().toISOString()}] ❌ Poll failed: ${res.status}`)
      return null
    }
    
    const data = await res.json()
    
    if (data.task) {
      console.log(`[${new Date().toISOString()}] 📋 Task received: ${data.task.id} - "${data.task.description}"`)
      return data.task
    }
    
    return null
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ⚠️ Poll error:`, error.message)
    return null
  }
}

// Complete a task
async function completeTask(taskId, result) {
  try {
    currentTaskId = null
    
    const res = await fetch(`${API_BASE}/api/prospyr/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        status: 'completed',
        result: typeof result === 'string' ? result : JSON.stringify(result)
      })
    })
    
    if (res.ok) {
      console.log(`[${new Date().toISOString()}] ✅ Task completed: ${taskId}`)
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Complete task error:`, error.message)
  }
}

// Fail a task
async function failTask(taskId, error) {
  try {
    currentTaskId = null
    
    await fetch(`${API_BASE}/api/prospyr/tasks`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId,
        status: 'failed',
        error: String(error)
      })
    })
    
    console.error(`[${new Date().toISOString()}] ❌ Task failed: ${taskId} - ${error}`)
  } catch (err) {
    console.error(`[${new Date().toISOString()}] ❌ Fail task error:`, err.message)
  }
}

// Check for new chat messages
async function checkChatMessages() {
  try {
    const res = await fetch(`${API_BASE}/api/prospyr/chat?action=poll&agentId=${encodeURIComponent(AGENT_ID)}`)
    
    if (!res.ok) return []
    
    const data = await res.json()
    return data.messages || []
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ⚠️ Chat poll error:`, error.message)
    return []
  }
}

// Send chat response
async function sendChatResponse(content) {
  try {
    await fetch(`${API_BASE}/api/prospyr/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'respond',
        agentId: AGENT_ID,
        content
      })
    })
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Chat response error:`, error.message)
  }
}

// Process a task (placeholder - implement actual task handling)
async function processTask(task) {
  console.log(`[${new Date().toISOString()}] 🔄 Processing task: ${task.description}`)
  
  // Simulate processing - replace with actual work
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  return `Task completed successfully: ${task.description}`
}

// Main polling loop
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     Prospyr Agent Poller                           ║
║     Agent: ${AGENT_NAME.padEnd(42)}║
║     Dashboard: ${API_BASE.padEnd(40)}║
║     Poll Interval: ${String(POLL_INTERVAL + 'ms').padEnd(36)}║
╚═══════════════════════════════════════════════════╝
`)
  
  // Initial registration
  const registered = await registerAgent()
  if (!registered) {
    console.error('Failed to register agent. Retrying in 10 seconds...')
    setTimeout(main, 10000)
    return
  }
  
  // Main loop
  while (isRunning) {
    try {
      // 1. Check for tasks
      const task = await pollForTasks()
      
      if (task) {
        currentTaskId = task.id
        await sendHeartbeat('busy')
        
        try {
          const result = await processTask(task)
          await completeTask(task.id, result)
        } catch (error) {
          await failTask(task.id, error.message)
        }
      }
      
      // 2. Check for chat messages
      const messages = await checkChatMessages()
      for (const msg of messages) {
        console.log(`[${new Date().toISOString()}] 💬 Chat message: ${msg.content.substring(0, 100)}...`)
        
        // Process chat message (placeholder)
        const response = `Acknowledged your message: "${msg.content.substring(0, 50)}...". I'm currently processing tasks and will respond shortly.`
        await sendChatResponse(response)
      }
      
      // 3. Send heartbeat
      if (!currentTaskId) {
        await sendHeartbeat(messages.length > 0 ? 'idle' : 'idle')
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ⚠️ Main loop error:`, error.message)
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log(`\n[${new Date().toISOString()}] 🛑 Shutting down agent...`)
  isRunning = false
  await sendHeartbeat('offline')
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log(`\n[${new Date().toISOString()}] 🛑 Shutting down agent...`)
  isRunning = false
  await sendHeartbeat('offline')
  process.exit(0)
})

// Start the agent
main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
