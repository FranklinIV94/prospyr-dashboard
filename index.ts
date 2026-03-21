// Prospyr - Multi-Agent Operations Platform
// Main entry point

import { SupervisorAgent } from './agents/supervisor/SupervisorAgent'
import { COOSouthstarAgent } from './agents/specialists/COOSouthstarAgent'
import { Orchestrator } from './orchestrator/Orchestrator'
import type { Agent, LLMConfig, Task } from './types'

// Default LLM config (Ollama on Southstar machine)
export const DEFAULT_LLM: LLMConfig = {
  provider: 'ollama',
  model: 'minimax-m2.7:cloud',
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
  apiKey: 'ollama', // Not required for local Ollama
  temperature: 0.7,
  maxTokens: 4096,
  thinkingEnabled: false,
}

export class ProspyrPlatform {
  orchestrator: Orchestrator
  supervisor: SupervisorAgent
  coo: COOSouthstarAgent

  constructor(llmConfig: LLMConfig = DEFAULT_LLM) {
    // Initialize orchestrator
    this.orchestrator = new Orchestrator()

    // Initialize agents
    this.supervisor = new SupervisorAgent(
      'supervisor-001',
      'CEO Agent',
      llmConfig,
    )

    this.coo = new COOSouthstarAgent(
      'coo-southstar-001',
      'Southstar',
      llmConfig,
    )

    // Register agents with orchestrator
    this.orchestrator.registerAgent(
      this.supervisor.toJSON(),
      (task) => this.supervisor.executeTask(task),
    )

    this.orchestrator.registerAgent(
      this.coo.toJSON(),
      (task) => this.coo.executeTask(task),
    )

    // Supervisor knows about specialists
    this.supervisor.registerSpecialist(this.coo.toJSON())
  }

  // Submit a task for processing
  async submitTask(
    description: string,
    type: string = 'general',
    priority: 'critical' | 'high' | 'medium' | 'low' = 'medium',
  ): Promise<Task> {
    const task = this.orchestrator.createTask(type, description, priority)

    // Supervisor decides who handles it
    const { agentId } = await this.orchestrator.delegateToRole(task, 'ceo')

    return task
  }

  // Get platform status
  getStatus() {
    return {
      stats: this.orchestrator.getStats(),
      supervisor: this.supervisor.toJSON(),
      coo: this.coo.toJSON(),
    }
  }

  // Subscribe to events
  onEvent(handler: (event: any) => void) {
    return this.orchestrator.onEvent(handler)
  }
}

// Export singleton for easy use
let platformInstance: ProspyrPlatform | null = null

export function getPlatform(): ProspyrPlatform {
  if (!platformInstance) {
    platformInstance = new ProspyrPlatform()
  }
  return platformInstance
}

export { SupervisorAgent, COOSouthstarAgent, Orchestrator }
export type { Agent, Task, LLMConfig }
