// Orchestrator - task queue and agent coordination
// Handles task distribution, monitoring, and execution flow

import type { Agent, Task, TaskPriority, TaskStatus, Flow, AgentEvent } from '../types'

type EventHandler = (event: AgentEvent) => void

export class Orchestrator {
  private taskQueue: Map<string, Task> = new Map()
  private flows: Map<string, Flow> = new Map()
  private agentRegistry: Map<string, Agent> = new Map()
  private eventHandlers: Set<EventHandler> = new Set()
  private agentExecutors: Map<string, (task: Task) => Promise<unknown>> = new Map()

  // Register an agent with its executor function
  registerAgent(agent: Agent, executor: (task: Task) => Promise<unknown>): void {
    this.agentRegistry.set(agent.id, agent)
    this.agentExecutors.set(agent.id, executor)
  }

  // Subscribe to events
  onEvent(handler: EventHandler): () => void {
    this.eventHandlers.add(handler)
    return () => this.eventHandlers.delete(handler)
  }

  private emit(type: AgentEvent['type'], agentId: string, payload: unknown): void {
    const event: AgentEvent = { type, agentId, payload, timestamp: new Date().toISOString() }
    this.eventHandlers.forEach(h => h(event))
  }

  // Create a new task
  createTask(
    type: string,
    description: string,
    priority: TaskPriority = 'medium',
    metadata?: Record<string, unknown>,
  ): Task {
    const task: Task = {
      id: crypto.randomUUID(),
      type,
      description,
      priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata,
    }
    this.taskQueue.set(task.id, task)
    return task
  }

  // Queue a task for execution
  async queueTask(taskId: string, assignedTo?: string): Promise<void> {
    const task = this.taskQueue.get(taskId)
    if (!task) throw new Error(`Task not found: ${taskId}`)

    task.status = 'queued'
    task.assignedTo = assignedTo
    task.updatedAt = new Date().toISOString()
    this.emit('task_assigned', assignedTo || 'system', { task })

    if (assignedTo) {
      await this.executeTask(taskId, assignedTo)
    }
  }

  // Execute a task with a specific agent
  async executeTask(taskId: string, agentId: string): Promise<unknown> {
    const task = this.taskQueue.get(taskId)
    const executor = this.agentExecutors.get(agentId)
    const agent = this.agentRegistry.get(agentId)

    if (!task) throw new Error(`Task not found: ${taskId}`)
    if (!executor) throw new Error(`Agent executor not found: ${agentId}`)

    task.status = 'running'
    task.assignedTo = agentId
    task.updatedAt = new Date().toISOString()

    this.emit('status_change', agentId, { status: 'running', taskId })

    try {
      const result = await executor(task)
      task.status = 'completed'
      task.result = result
      task.completedAt = new Date().toISOString()
      task.updatedAt = new Date().toISOString()

      this.emit('task_completed', agentId, { task, result })
      this.emit('status_change', agentId, { status: 'idle', taskId })

      return result
    } catch (error) {
      task.status = 'failed'
      task.error = String(error)
      task.updatedAt = new Date().toISOString()

      this.emit('error', agentId, { task, error })
      this.emit('status_change', agentId, { status: 'error', taskId })

      throw error
    }
  }

  // Delegate task to the best available agent for the role
  async delegateToRole(
    task: Task,
    role: string,
  ): Promise<{ taskId: string; agentId: string }> {
    // Find agent by role
    const agent = Array.from(this.agentRegistry.values()).find(a => a.role === role)
    if (!agent) throw new Error(`No agent found for role: ${role}`)

    task.assignedTo = agent.id
    task.status = 'queued'

    // Run asynchronously
    this.queueTask(task.id, agent.id).catch(console.error)

    return { taskId: task.id, agentId: agent.id }
  }

  // Get tasks by status
  getTasksByStatus(status: TaskStatus): Task[] {
    return Array.from(this.taskQueue.values()).filter(t => t.status === status)
  }

  // Get all tasks for an agent
  getTasksForAgent(agentId: string): Task[] {
    return Array.from(this.taskQueue.values()).filter(t => t.assignedTo === agentId)
  }

  // Get next priority task for an agent
  getNextTaskForAgent(agentId: string): Task | undefined {
    return Array.from(this.taskQueue.values())
      .filter(t => t.assignedTo === agentId && t.status === 'pending')
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      })[0]
  }

  // Cancel a task
  cancelTask(taskId: string): void {
    const task = this.taskQueue.get(taskId)
    if (task) {
      task.status = 'cancelled'
      task.updatedAt = new Date().toISOString()
    }
  }

  // Create a flow (multi-task workflow)
  createFlow(name: string, description?: string): Flow {
    const flow: Flow = {
      id: crypto.randomUUID(),
      name,
      description,
      status: 'active',
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.flows.set(flow.id, flow)
    return flow
  }

  // Add task to flow
  addTaskToFlow(flowId: string, taskId: string): void {
    const flow = this.flows.get(flowId)
    if (flow) {
      flow.tasks.push(taskId)
      flow.updatedAt = new Date().toISOString()
    }
  }

  // Get flow progress
  getFlowProgress(flowId: string): { total: number; completed: number; failed: number } {
    const flow = this.flows.get(flowId)
    if (!flow) return { total: 0, completed: 0, failed: 0 }

    const tasks = flow.tasks.map(id => this.taskQueue.get(id)).filter(Boolean) as Task[]
    return {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    }
  }

  // Get agent by ID
  getAgent(agentId: string): Agent | undefined {
    return this.agentRegistry.get(agentId)
  }

  // Get all agents
  getAllAgents(): Agent[] {
    return Array.from(this.agentRegistry.values())
  }

  // Get queue stats
  getStats(): {
    totalTasks: number
    pending: number
    running: number
    completed: number
    failed: number
    agents: { id: string; name: string; role: string; status: string; activeTasks: number }[]
  } {
    const tasks = Array.from(this.taskQueue.values())
    const agents = Array.from(this.agentRegistry.values())

    return {
      totalTasks: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      agents: agents.map(a => ({
        id: a.id,
        name: a.name,
        role: a.role,
        status: a.status,
        activeTasks: tasks.filter(t => t.assignedTo === a.id && t.status === 'running').length,
      })),
    }
  }
}
