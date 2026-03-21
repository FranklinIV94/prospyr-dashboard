'use client'
import { useState, useEffect, useCallback } from 'react'

interface Agent {
  id: string
  name: string
  role: string
  status: string
  capabilities?: string[]
  lastSeen?: string
}

interface Task {
  id: string
  type: string
  description: string
  priority: string
  status: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
}

interface PlatformStats {
  stats: {
    totalTasks: number
    pending: number
    running: number
    completed: number
    failed: number
  }
  agents: Array<{
    id: string
    name: string
    role: string
    status: string
    activeTasks: number
  }>
}

type Tab = 'dashboard' | 'agents' | 'tasks' | 'submit'

function PriorityBadge({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-yellow-600',
    low: 'bg-slate-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${colors[priority] || 'bg-slate-600'}`}>
      {priority}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-emerald-600',
    thinking: 'bg-purple-600',
    running: 'bg-blue-600',
    waiting: 'bg-yellow-600',
    error: 'bg-red-600',
    offline: 'bg-slate-700',
    completed: 'bg-emerald-600',
    pending: 'bg-slate-600',
    failed: 'bg-red-600',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${colors[status] || 'bg-slate-600'}`}>
      {status}
    </span>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg text-white">{agent.name}</h3>
          <p className="text-slate-400 text-sm mt-0.5 capitalize">{agent.role}</p>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      {agent.capabilities && agent.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {agent.capabilities.slice(0, 4).map(cap => (
            <span key={cap} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-400">
              {cap}
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-4 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700">
        <span>ID: {agent.id.slice(0, 8)}...</span>
        {agent.lastSeen && <span>Last seen: {new Date(agent.lastSeen).toLocaleTimeString()}</span>}
      </div>
    </div>
  )
}

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-slate-500 font-mono">{task.type}</span>
        <div className="flex gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>
      <p className="text-slate-200 text-sm mb-2 line-clamp-2">{task.description}</p>
      <div className="flex justify-between text-xs text-slate-500">
        <span>{new Date(task.createdAt).toLocaleString()}</span>
        {task.assignedTo && <span>Assigned: {task.assignedTo}</span>}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
      <div className={`text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  )
}

function SubmitTask({ onSubmit }: { onSubmit: (task: string, type: string, priority: string) => void }) {
  const [description, setDescription] = useState('')
  const [type, setType] = useState('general')
  const [priority, setPriority] = useState('medium')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    onSubmit(description, type, priority)
    setDescription('')
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/70 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4">Submit New Task</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Task Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm resize-none h-24"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
            >
              <option value="general">General</option>
              <option value="research">Research</option>
              <option value="code">Code</option>
              <option value="operations">Operations</option>
              <option value="communication">Communication</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Priority</label>
            <select
              value={priority}
              onChange={e => setPriority(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
        >
          Submit Task
        </button>
      </div>
    </form>
  )
}

export default function ProspyrDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_PROSPYR_API || '/api/prospyr'

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        fetch(`${API}/status`).catch(() => null),
        fetch(`${API}/tasks`).catch(() => null),
      ])

      if (statsRes?.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
        setAgents(statsData.agents || [])
      }

      if (tasksRes?.ok) {
        const tasksData = await tasksRes.json()
        setTasks(tasksData.tasks || [])
      }

      setError(null)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [API])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleSubmitTask = async (description: string, type: string, priority: string) => {
    try {
      const res = await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, type, priority }),
      })
      if (res.ok) {
        fetchData()
      }
    } catch (e) {
      setError(String(e))
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agents', label: 'Agents' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'submit', label: 'Submit Task' },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospyr Control</h1>
            <p className="text-slate-500 text-sm">Multi-Agent Operations Platform</p>
          </div>
          <div className="text-right">
            {lastUpdated && <p className="text-xs text-slate-500">Updated: {lastUpdated}</p>}
            <div className="flex gap-2 mt-1">
              <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded text-xs">Active</span>
              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs">v2.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-300 text-sm">
            <strong>Connection Error:</strong> {error} — Using demo mode
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-5 gap-4">
                <StatCard label="Total Tasks" value={stats.stats.totalTasks} color="text-white" />
                <StatCard label="Pending" value={stats.stats.pending} color="text-yellow-400" />
                <StatCard label="Running" value={stats.stats.running} color="text-blue-400" />
                <StatCard label="Completed" value={stats.stats.completed} color="text-emerald-400" />
                <StatCard label="Failed" value={stats.stats.failed} color="text-red-400" />
              </div>
            )}

            {/* Agent Overview */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Active Agents</h2>
              {loading ? (
                <p className="text-slate-500">Loading...</p>
              ) : agents.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {agents.map(agent => (
                    <AgentCard key={agent.id} agent={agent} />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No agents connected</p>
              )}
            </div>

            {/* Recent Tasks */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Recent Tasks</h2>
              {tasks.length > 0 ? (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No tasks yet</p>
              )}
            </div>
          </div>
        )}

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Agent Registry</h2>
            {loading ? (
              <p className="text-slate-500">Loading...</p>
            ) : agents.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {agents.map(agent => (
                  <AgentCard key={agent.id} agent={agent} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg mb-2">No agents connected</p>
                <p className="text-sm">Start the Prospyr platform to see agents here</p>
              </div>
            )}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Task Queue</h2>
              <div className="flex gap-2">
                {['pending', 'running', 'completed', 'failed'].map(status => (
                  <span key={status} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 capitalize">
                    {status}: {tasks.filter(t => t.status === status).length}
                  </span>
                ))}
              </div>
            </div>
            {tasks.length > 0 ? (
              <div className="space-y-2">
                {tasks.map(task => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <p className="text-lg mb-2">No tasks in queue</p>
                <p className="text-sm">Submit a task to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Submit Tab */}
        {activeTab === 'submit' && (
          <div className="max-w-2xl">
            <SubmitTask onSubmit={handleSubmitTask} />
          </div>
        )}
      </main>
    </div>
  )
}
