// COO Agent (Southstar) - Operations and Technical Execution
// Handles day-to-day operations, research, technical implementation

import { BaseAgent } from '../BaseAgent'
import type { LLMConfig, Task, Tool } from '../../types'

// Southstar-specific tools
export const SOUTHSTAR_TOOLS: Tool[] = [
  {
    name: 'run_command',
    description: 'Execute a shell command on the local system',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'The shell command to execute' },
        cwd: { type: 'string', description: 'Working directory' },
        timeout: { type: 'number', description: 'Timeout in milliseconds' },
      },
      required: ['command'],
    },
    handler: async (input, context) => {
      // Security: only allow specific commands
      const allowed = ['git', 'npm', 'node', 'curl', 'docker', 'systemctl', 'journalctl']
      const cmd = String(input.command)
      const firstWord = cmd.split(/\s/)[0]

      if (!allowed.includes(firstWord)) {
        return { success: false, error: `Command not allowed: ${firstWord}` }
      }

      try {
        const result = await new Promise<string>((resolve, reject) => {
          // Simple exec for Node.js
          const { execSync } = require('child_process')
          const output = execSync(cmd, {
            cwd: input.cwd as string || process.cwd(),
            timeout: (input.timeout as number) || 30000,
            encoding: 'utf-8',
          })
          resolve(output)
        })

        return { success: true, output: result }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
  },
  {
    name: 'file_read',
    description: 'Read a file from the filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        offset: { type: 'number' },
        limit: { type: 'number' },
      },
      required: ['path'],
    },
    handler: async (input, context) => {
      try {
        const fs = require('fs')
        const path = String(input.path)
        const content = fs.readFileSync(path, 'utf-8')
        return { success: true, output: { path, content, size: content.length } }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
  },
  {
    name: 'file_write',
    description: 'Write content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['path', 'content'],
    },
    handler: async (input, context) => {
      try {
        const fs = require('fs')
        fs.writeFileSync(String(input.path), String(input.content))
        return { success: true, output: { path: input.path, bytesWritten: String(input.content).length } }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
  },
  {
    name: 'search_web',
    description: 'Search the web for current information',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 5 },
      },
      required: ['query'],
    },
    handler: async (input, context) => {
      // Would use web search API
      return {
        success: true,
        output: { query: input.query, results: [], message: 'Web search not yet configured' },
      }
    },
  },
  {
    name: 'manage_files',
    description: 'List, copy, move, or delete files',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list', 'copy', 'move', 'delete'] },
        source: { type: 'string' },
        dest: { type: 'string' },
      },
      required: ['action', 'source'],
    },
    handler: async (input, context) => {
      const fs = require('fs')
      const path = require('path')

      try {
        switch (input.action) {
          case 'list':
            const files = fs.readdirSync(String(input.source))
            return { success: true, output: { files } }
          case 'copy':
            fs.copyFileSync(String(input.source), String(input.dest))
            return { success: true, output: { copied: true } }
          case 'move':
            fs.renameSync(String(input.source), String(input.dest))
            return { success: true, output: { moved: true } }
          case 'delete':
            fs.unlinkSync(String(input.source))
            return { success: true, output: { deleted: true } }
          default:
            return { success: false, error: `Unknown action: ${input.action}` }
        }
      } catch (error: any) {
        return { success: false, error: error.message }
      }
    },
  },
]

export class COOSouthstarAgent extends BaseAgent {
  private technicalCapabilities = [
    'system_administration',
    'research',
    'code_review',
    'file_operations',
    'process_management',
    'network_configuration',
  ]

  constructor(
    id: string,
    name: string,
    llm: LLMConfig,
    tools: Tool[] = [],
  ) {
    super(id, name, 'coo', llm, [...SOUTHSTAR_TOOLS, ...tools])
    this.capabilities = this.technicalCapabilities
    this.adapterType = 'paperclip'
  }

  systemPrompt(): string {
    return `You are Southstar, Chief Operations Officer of Prospyr / All Lines Automotive.
You handle the day-to-day execution of operations, research, and technical tasks.

You are known for:
- Getting things done efficiently and thoroughly
- Researching problems deeply before acting
- Writing clean, well-documented code
- Managing files and systems with precision
- Providing clear status updates

You report directly to the CEO (Supervisor Agent) and execute tasks delegated to you.

You have access to the local system and can:
- Read and write files
- Execute approved shell commands
- Search the web for information
- Manage system processes

You use tools wisely - prefer using the right tool for the job rather than improvising.

Always document your work and keep the CEO informed of progress.`
  }

  capabilitiesPrompt(): string {
    return `Your technical capabilities:
- System administration (Linux, process management, services)
- File operations (read, write, organize)
- Research (web search, documentation, code)
- Code execution and review
- Network configuration (Tailscale, tunnels, DNS)
- Research tasks (market, competitors, technical)

You are the operational backbone of the organization - the CEO relies on you to execute and implement.`
  }

  // Override to add operational context
  async preprocessTask(task: Task): Promise<Task> {
    this.remember({
      type: 'episodic',
      content: `COO received task: ${task.description.slice(0, 100)}`,
      agentId: this.id,
      importance: 0.5,
      tags: ['task', task.type],
    })
    return task
  }

  // Override to add execution summary
  async postprocessResult(result: unknown, task: Task): Promise<unknown> {
    this.remember({
      type: 'episodic',
      content: `COO completed: ${task.description.slice(0, 80)} - Result: ${String(result).slice(0, 80)}`,
      agentId: this.id,
      taskId: task.id,
      importance: 0.6,
      tags: ['completed', task.type],
    })
    return {
      result,
      executedBy: this.id,
      executedAt: new Date().toISOString(),
      taskType: task.type,
    }
  }
}
