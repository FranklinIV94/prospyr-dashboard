// Base Agent class - all agents inherit from this
// Handles LLM interaction, tool execution, memory, and state

import type {
  Agent,
  AgentContext,
  AgentRole,
  AgentStatus,
  AgentThought,
  LLMConfig,
  LLMResponse,
  MemoryEntry,
  Message,
  Task,
  Tool,
  ToolResult,
} from '../types'

const MAX_TOOL_CALLS = 20        // hard limit per task
const MAX_ITERATIONS = 50        // max loops before forcing completion

export abstract class BaseAgent {
  id: string
  name: string
  role: string
  status: AgentStatus = 'idle'
  capabilities: string[] = []
  adapterType: string = 'openai'
  createdAt: string

  protected llm: LLMConfig
  protected tools: Tool[] = []
  protected memory: MemoryEntry[] = []
  protected messages: Message[] = []
  protected currentTask?: Task
  protected thoughts: AgentThought[] = []

  constructor(
    id: string,
    name: string,
    role: string,
    llm: LLMConfig,
    tools: Tool[] = [],
  ) {
    this.id = id
    this.name = name
    this.role = role
    this.llm = llm
    this.tools = tools
    this.createdAt = new Date().toISOString()
  }

  // Called when agent receives a new task
  abstract systemPrompt(): string

  // What this agent can do
  abstract capabilitiesPrompt(): string

  // Override to add agent-specific logic
  async preprocessTask(task: Task): Promise<Task> {
    return task
  }

  // Override to add post-processing
  async postprocessResult(result: unknown, task: Task): Promise<unknown> {
    return result
  }

  // Main execution loop
  async executeTask(task: Task): Promise<{ result: unknown; error?: string }> {
    this.status = 'running'
    this.currentTask = task
    this.thoughts = []

    try {
      // Preprocess
      const processedTask = await this.preprocessTask(task)

      // Build context messages
      const contextMessages = await this.buildContext(processedTask)

      // Generate initial response
      let response = await this.callLLM(contextMessages)
      this.thoughts.push({
        agentId: this.id,
        thought: response.content,
        conclusion: response.thinking,
        timestamp: new Date().toISOString(),
      })

      // Tool execution loop
      let iterations = 0
      while (iterations < MAX_ITERATIONS) {
        if (response.finishReason === 'stop') {
          // Done naturally
          break
        }

        if (response.finishReason === 'error') {
          throw new Error(`LLM error: ${response.content}`)
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
          // Execute tools
          for (const toolCall of response.toolCalls) {
            if (iterations >= MAX_TOOL_CALLS) {
              response.content += `\n\n[Tool limit reached, forcing completion]`
              break
            }

            const result = await this.executeTool(toolCall.tool, toolCall.input as Record<string, unknown>)
            this.thoughts.push({
              agentId: this.id,
              thought: `Tool ${toolCall.tool} called`,
              action: {
                tool: toolCall.tool,
                input: toolCall.input as Record<string, unknown>,
                output: result.output,
                error: result.error,
                timestamp: new Date().toISOString(),
              },
              timestamp: new Date().toISOString(),
            })

            // Add tool result as a message
            this.messages.push({
              id: crypto.randomUUID(),
              role: 'tool',
              content: result.success
                ? JSON.stringify(result.output)
                : `Error: ${result.error}`,
              agentId: this.id,
              timestamp: new Date().toISOString(),
            })

            iterations++
          }

          // Get next response
          response = await this.callLLM(await this.buildContext(processedTask))
        } else {
          break
        }
      }

      this.status = 'idle'
      const finalResult = await this.postprocessResult(
        response.content,
        processedTask,
      )
      return { result: finalResult }
    } catch (error) {
      this.status = 'error'
      return { result: null, error: String(error) }
    } finally {
      this.currentTask = undefined
    }
  }

  // Build message context for LLM
  protected async buildContext(task: Task): Promise<Message[]> {
    const systemMessage: Message = {
      id: 'system',
      role: 'system',
      content: `${this.systemPrompt()}\n\n${this.capabilitiesPrompt()}`,
      agentId: this.id,
      timestamp: new Date().toISOString(),
    }

    // Relevant memories
    const relevantMemories = this.recallRelevant(task.description)

    let memoryContext = ''
    if (relevantMemories.length > 0) {
      memoryContext = `\n\nRelevant past experiences:\n${relevantMemories.map(m => `- ${m.content}`).join('\n')}`
    }

    // Inject memory context into system message
    if (memoryContext) {
      systemMessage.content += memoryContext
    }

    return [systemMessage, ...this.messages, {
      id: crypto.randomUUID(),
      role: 'user',
      content: task.description,
      agentId: this.id,
      timestamp: new Date().toISOString(),
    }]
  }

  // Call LLM - override for different providers
  protected async callLLM(messages: Message[]): Promise<LLMResponse> {
    // OpenAI-compatible by default
    const body: Record<string, unknown> = {
      model: this.llm.model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      temperature: this.llm.temperature ?? 0.7,
      max_tokens: this.llm.maxTokens ?? 4096,
    }

    // Add thinking if supported
    if (this.llm.thinkingEnabled) {
      body.max_completion_tokens = this.llm.thinkingBudget ?? 4096
    }

    const res = await fetch(`${this.llm.baseURL || 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.llm.apiKey}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`LLM API error ${res.status}: ${error}`)
    }

    const data = await res.json()
    const choice = data.choices[0]
    const message = choice.message

    // Extract tool calls if present
    let toolCalls
    if (message.tool_calls) {
      toolCalls = message.tool_calls.map((tc: any) => ({
        tool: tc.function.name,
        input: JSON.parse(tc.function.arguments),
      }))
    }

    return {
      content: message.content || '',
      thinking: data.choices[0].finish_reason === 'tool_calls' ? undefined : message.content,
      toolCalls,
      usage: data.usage ? {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      } : undefined,
      model: data.model,
      finishReason: choice.finish_reason,
    }
  }

  // Execute a tool
  protected async executeTool(
    toolName: string,
    input: Record<string, unknown>,
  ): Promise<ToolResult> {
    const tool = this.tools.find(t => t.name === toolName)
    if (!tool) {
      return { success: false, error: `Tool not found: ${toolName}` }
    }

    try {
      const context: AgentContext = {
        agent: this as unknown as Agent,
        task: this.currentTask,
        messages: this.messages,
        memory: this.memory,
        tools: this.tools,
        llm: this.llm,
      }
      return await tool.handler(input, context)
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  // Semantic memory search
  protected recallRelevant(query: string, limit = 5): MemoryEntry[] {
    // Simple keyword matching for now
    // In production, use vector embeddings
    const keywords = query.toLowerCase().split(/\s+/)
    return this.memory
      .filter(m => m.type === 'episodic' || m.type === 'semantic')
      .filter(m => keywords.some(k => m.content.toLowerCase().includes(k)))
      .sort((a, b) => {
        const aHits = keywords.filter(k => a.content.toLowerCase().includes(k)).length
        const bHits = keywords.filter(k => b.content.toLowerCase().includes(k)).length
        return bHits - aHits
      })
      .slice(0, limit)
  }

  // Store a memory
  protected remember(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): void {
    this.memory.push({
      ...entry,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    })
  }

  // Register tools
  protected registerTools(tools: Tool[]): void {
    this.tools.push(...tools)
  }

  // Get current thoughts for debugging/monitoring
  getThoughts(): AgentThought[] {
    return this.thoughts
  }

  // Serialize agent state
  toJSON(): Agent & { status: AgentStatus } {
    return {
      id: this.id,
      name: this.name,
      role: this.role as AgentRole,
      status: this.status,
      capabilities: this.capabilities,
      adapterType: this.adapterType,
      createdAt: this.createdAt,
    }
  }
}
