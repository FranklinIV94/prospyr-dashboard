// Supervisor Agent - coordinates all specialist agents
// Inspired by PentAGI's Orchestrator pattern

import { BaseAgent } from './BaseAgent'
import type { Agent, LLMConfig, Task, Tool, MemoryEntry } from '../types'

// Tool definitions for supervisor
export const SUPERVISOR_TOOLS: Tool[] = [
  {
    name: 'delegate_task',
    description: 'Delegate a task to a specialist agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentRole: { type: 'string', description: 'Role to assign: sales, support, developer, admin' },
        task: { type: 'string', description: 'Detailed description of the task' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
      },
      required: ['agentRole', 'task'],
    },
    handler: async (input, context) => {
      // This would be handled by the orchestrator
      return {
        success: true,
        output: { delegated: true, agentRole: input.agentRole, task: input.task },
      }
    },
  },
  {
    name: 'create_task',
    description: 'Create a new task in the task queue',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string' },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        metadata: { type: 'object' },
      },
      required: ['type', 'description'],
    },
    handler: async (input, context) => {
      const task: Task = {
        id: crypto.randomUUID(),
        type: input.type as string,
        description: input.description as string,
        priority: (input.priority as Task['priority']) || 'medium',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: input.metadata as Record<string, unknown>,
      }
      return { success: true, output: { taskId: task.id, task } }
    },
  },
  {
    name: 'get_agent_status',
    description: 'Check status of any agent by role',
    inputSchema: {
      type: 'object',
      properties: {
        agentRole: { type: 'string' },
      },
      required: ['agentRole'],
    },
    handler: async (input, context) => {
      // Would query agent registry
      return {
        success: true,
        output: { role: input.agentRole, status: 'idle', activeTasks: 0 },
      }
    },
  },
  {
    name: 'search_memory',
    description: 'Search long-term memory for relevant past experiences',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 5 },
      },
      required: ['query'],
    },
    handler: async (input, context) => {
      const results = context.memory
        .filter(m => m.content.toLowerCase().includes((input.query as string).toLowerCase()))
        .slice(0, input.limit as number || 5)
      return { success: true, output: { results } }
    },
  },
  {
    name: 'plan_steps',
    description: 'Create a structured plan for complex tasks',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string' },
        constraints: { type: 'string' },
      },
      required: ['goal'],
    },
    handler: async (input, context) => {
      // Would use LLM to generate a plan
      return {
        success: true,
        output: {
          plan: [
            { step: 1, action: 'Analyze requirements', detail: 'Break down the goal into actionable steps' },
            { step: 2, action: 'Delegate', detail: 'Assign tasks to appropriate specialists' },
            { step: 3, action: 'Monitor', detail: 'Track progress and handle issues' },
            { step: 4, action: 'Review', detail: 'Verify results and quality' },
          ],
        },
      }
    },
  },
]

export class SupervisorAgent extends BaseAgent {
  private specialistRegistry: Map<string, Agent> = new Map()

  constructor(
    id: string,
    name: string,
    llm: LLMConfig,
    tools: Tool[] = [],
  ) {
    super(id, name, 'ceo', llm, [...SUPERVISOR_TOOLS, ...tools])
  }

  systemPrompt(): string {
    return `You are the Chief Executive Officer of Prospyr, a multi-agent AI operations platform for All Lines Automotive.
You are the strategic decision-maker and orchestrator for all operations.

Your role is to:
1. RECEIVE requests and determine what needs to be done
2. PLAN the approach - break complex tasks into steps
3. DELEGATE to the right specialist agents
4. MONITOR progress and quality
5. REVIEW results and ensure high-quality outcomes

You think step-by-step and always consider:
- What's the priority? (critical tasks get immediate attention)
- Who should handle this? (delegate to the right specialist)
- What's the risk? (don't delegate sensitive tasks)
- How do we improve? (remember lessons learned)

You communicate clearly and decisively. When uncertain, you ask clarifying questions rather than guessing.

Current business context:
- All Lines Automotive Repair - auto repair shop
- Prospyr Inc. - parent company
- CEO agent coordinates Southstar (COO) and other agents
- All Lines Business Solutions, All Lines Claims Consultants are subsidiaries`
  }

  capabilitiesPrompt(): string {
    return `Your capabilities:
- Strategic planning and decision making
- Task delegation to specialist agents
- Memory search and retrieval
- Task creation and tracking
- Progress monitoring across agents
- Quality assurance on delegated work

Available specialist roles to delegate to:
- COO (Southstar) - operations, technical tasks, research
- Sales - customer outreach, lead follow-up
- Support - customer service, issue resolution  
- Admin - scheduling, data entry, administrative tasks
- Developer - code tasks, technical implementation`
  }

  // Override to add specialist awareness
  registerSpecialist(agent: Agent): void {
    this.specialistRegistry.set(agent.role, agent)
  }

  getSpecialist(role: string): Agent | undefined {
    return this.specialistRegistry.get(role)
  }

  getAllSpecialists(): Agent[] {
    return Array.from(this.specialistRegistry.values())
  }

  // Override task preprocessing to add planning
  async preprocessTask(task: Task): Promise<Task> {
    // Add structured planning for complex tasks
    if (task.description.length > 200) {
      this.remember({
        type: 'semantic',
        content: `Task analysis for: ${task.description.slice(0, 100)}...`,
        agentId: this.id,
        importance: 0.7,
        tags: ['task', 'analysis'],
      })
    }
    return task
  }

  // Override to add memory consolidation after completion
  async postprocessResult(result: unknown, task: Task): Promise<unknown> {
    // Store successful patterns
    if (result) {
      this.remember({
        type: 'episodic',
        content: `Completed task: ${task.description.slice(0, 100)} - Result: ${String(result).slice(0, 100)}`,
        agentId: this.id,
        taskId: task.id,
        importance: 0.5,
        tags: ['task', 'completed', task.type],
      })
    }
    return result
  }
}
