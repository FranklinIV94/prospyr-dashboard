'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

// Company definitions
const COMPANIES = [
  { id: 'all', name: 'All Companies', icon: '🏢' },
  { id: 'auto', name: 'All Lines Auto', icon: '🚗' },
  { id: 'albs', name: 'All Lines Business Solutions', icon: '💼' },
  { id: 'claims', name: 'All Lines Claims Consultants', icon: '📋' },
]

// Mock agents for demo
const MOCK_AGENTS = [
  { id: 'ceo-001', name: 'CEO Agent', role: 'ceo', company: 'all', status: 'idle', icon: '👔', description: 'Strategic decisions & delegation' },
  { id: 'southstar-001', name: 'Southstar', role: 'coo', company: 'auto', status: 'idle', icon: '⚡', description: 'COO — Operations & Technical' },
  { id: 'northstar-001', name: 'Northstar', role: 'coo', company: 'albs', status: 'idle', icon: '⭐', description: 'COO — Business Solutions' },
  { id: 'sales-001', name: 'Sales Agent', role: 'sales', company: 'auto', status: 'offline', icon: '📈', description: 'Lead generation & follow-up' },
  { id: 'support-001', name: 'Support Agent', role: 'support', company: 'auto', status: 'offline', icon: '🎧', description: 'Customer service & issues' },
  { id: 'admin-001', name: 'Admin Agent', role: 'admin', company: 'albs', status: 'offline', icon: '📝', description: 'Scheduling & data entry' },
  { id: 'claims-001', name: 'Claims Agent', role: 'claims', company: 'claims', status: 'offline', icon: '🏥', description: 'Insurance claims processing' },
]

// Mock tasks
const MOCK_TASKS = [
  { id: 't1', description: 'Review Q1 operational costs for All Lines Auto', company: 'auto', priority: 'high', assignedTo: 'southstar-001', status: 'in_progress' },
  { id: 't2', description: 'Follow up with potential ALBS clients', company: 'albs', priority: 'medium', assignedTo: 'northstar-001', status: 'pending' },
  { id: 't3', description: 'Process insurance claim for Johnson auto', company: 'claims', priority: 'critical', assignedTo: 'claims-001', status: 'pending' },
]

// Mock usage stats
const MOCK_USAGE = {
  todayTokens: 128450,
  todayCost: 0.64,
  weekTokens: 892300,
  weekCost: 4.46,
  activeAgents: 3,
  totalAgents: 7,
}

function CompanySelector({ selected, onChange }: { selected: string; onChange: (id: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {COMPANIES.map((company) => (
        <button
          key={company.id}
          onClick={() => onChange(company.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            selected === company.id
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          <span className="mr-1.5">{company.icon}</span>
          {company.name}
        </button>
      ))}
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
    </div>
  )
}

function AgentCard({ agent, onChat }: { agent: typeof MOCK_AGENTS[0]; onChat: () => void }) {
  const statusColors: Record<string, string> = {
    idle: 'bg-emerald-500',
    running: 'bg-blue-500',
    busy: 'bg-yellow-500',
    offline: 'bg-slate-600',
  }

  const roleLabels: Record<string, string> = {
    ceo: 'Chief Executive Officer',
    coo: 'Chief Operations Officer',
    sales: 'Sales Agent',
    support: 'Support Agent',
    admin: 'Admin Agent',
    claims: 'Claims Agent',
  }

  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-all">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xl">
            {agent.icon}
          </div>
          <div>
            <h3 className="font-semibold text-white">{agent.name}</h3>
            <p className="text-slate-400 text-xs">{roleLabels[agent.role] || agent.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusColors[agent.status]}`} />
          <span className="text-xs text-slate-400 capitalize">{agent.status}</span>
        </div>
      </div>
      <p className="text-slate-400 text-sm mb-3">{agent.description}</p>
      <div className="flex gap-2">
        <button
          onClick={onChat}
          disabled={agent.status === 'offline'}
          className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          💬 Chat
        </button>
        <button className="py-2 px-3 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors">
          📋 Tasks
        </button>
      </div>
    </div>
  )
}

function TaskRow({ task }: { task: typeof MOCK_TASKS[0] }) {
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-yellow-600',
    low: 'bg-slate-600',
  }
  const statusColors: Record<string, string> = {
    pending: 'bg-slate-600',
    in_progress: 'bg-blue-600',
    completed: 'bg-emerald-600',
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-slate-800/40 border border-slate-700/50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{task.description}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {COMPANIES.find(c => c.id === task.company)?.name}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-xs font-medium text-white ${priorityColors[task.priority]}`}>
          {task.priority}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs text-white ${statusColors[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  )
}

function ChatPanel({ agent, onClose }: { agent: typeof MOCK_AGENTS[0]; onClose: () => void }) {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([
    { role: 'agent', content: `Hello, I'm ${agent.name}. How can I assist you today?` }
  ])
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim() || loading) return

    const userMsg = message
    setMessage('')
    setLoading(true)

    // Add user message immediately
    setHistory(prev => [...prev, { role: 'user', content: userMsg }])

    try {
      // Call server-side API route which proxies to the gateway
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, message: userMsg }),
      })

      if (!res.ok) throw new Error(`Error: ${res.status}`)

      const data = await res.json()
      const reply = data.reply || data.error || 'No response'

      setHistory(prev => [...prev, { role: 'agent', content: reply }])
    } catch (error) {
      setHistory(prev => [...prev, { role: 'agent', content: `Error: ${String(error)}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-full max-h-[32rem] bg-slate-900 border border-slate-700 rounded-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-lg">
              {agent.icon}
            </div>
            <div>
              <h3 className="font-semibold text-white">{agent.name}</h3>
              <p className="text-xs text-slate-400">{agent.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            ✕
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-200'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Message ${agent.name}...`}
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl transition-colors"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState('all')
  const [activeTab, setActiveTab] = useState<'agents' | 'tasks' | 'analytics'>('agents')
  const [chatAgent, setChatAgent] = useState<typeof MOCK_AGENTS[0] | null>(null)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Redirect if not authenticated
  useEffect(() => {
    if (mounted && status === 'unauthenticated') {
      router.push('/login')
    }
  }, [mounted, status, router])

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!session) return null

  const filteredAgents = selectedCompany === 'all'
    ? MOCK_AGENTS
    : MOCK_AGENTS.filter(a => a.company === selectedCompany || a.company === 'all')

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center font-bold text-lg">
                P
              </div>
              <div>
                <h1 className="text-xl font-bold">Prospyr Control</h1>
                <p className="text-xs text-slate-500">Prospyr Inc. Operations Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{session.user?.name}</p>
                <p className="text-xs text-slate-500">CEO</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Company Selector */}
        <div className="mb-8">
          <CompanySelector selected={selectedCompany} onChange={setSelectedCompany} />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Today's Cost" value={`$${MOCK_USAGE.todayCost.toFixed(2)}`} sub={`${MOCK_USAGE.todayTokens.toLocaleString()} tokens`} color="text-emerald-400" />
          <StatCard label="Week Cost" value={`$${MOCK_USAGE.weekCost.toFixed(2)}`} sub={`${MOCK_USAGE.weekTokens.toLocaleString()} tokens`} color="text-blue-400" />
          <StatCard label="Active Agents" value={`${MOCK_USAGE.activeAgents}/${MOCK_USAGE.totalAgents}`} sub="online now" color="text-purple-400" />
          <StatCard label="Pending Tasks" value={MOCK_TASKS.length} sub="require attention" color="text-orange-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
          {[
            { id: 'agents', label: 'Agents', icon: '🤖' },
            { id: 'tasks', label: 'Tasks', icon: '📋' },
            { id: 'analytics', label: 'Analytics', icon: '📊' },
          ].map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="mr-1.5">{icon}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onChat={() => setChatAgent(agent)}
              />
            ))}
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Active Tasks</h2>
              <button 
                onClick={() => setShowNewTaskModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                + New Task
              </button>
            </div>
            {MOCK_TASKS.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Token Usage (7 Days)</h3>
              <div className="h-48 flex items-end gap-2">
                {[65, 45, 80, 55, 90, 70, 85].map((h, i) => (
                  <div key={i} className="flex-1 bg-blue-600/30 rounded-t" style={{ height: `${h}%` }}>
                    <div className="w-full bg-blue-600 rounded-t" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Cost by Company</h3>
              <div className="space-y-4">
                {[
                  { name: 'All Lines Auto', cost: 2.34, pct: 52 },
                  { name: 'ALBS', cost: 1.45, pct: 33 },
                  { name: 'ALBS Claims', cost: 0.67, pct: 15 },
                ].map(({ name, cost, pct }) => (
                  <div key={name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{name}</span>
                      <span className="text-slate-400">${cost.toFixed(2)} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Chat Panel */}
      {chatAgent && (
        <ChatPanel agent={chatAgent} onClose={() => setChatAgent(null)} />
      )}

      {/* New Task Modal */}
      {showNewTaskModal && (
        <NewTaskModal 
          onClose={() => setShowNewTaskModal(false)} 
          onTaskCreated={(task) => {
            console.log('Task created:', task)
            setShowNewTaskModal(false)
          }}
        />
      )}
    </div>
  )
}

function NewTaskModal({ onClose, onTaskCreated }: { onClose: () => void; onTaskCreated: (task: any) => void }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState('general')
  const [priority, setPriority] = useState('medium')
  const [assignTo, setAssignTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const taskTypes = [
    { value: 'security-audit', label: '🔒 Security Audit' },
    { value: 'code-review', label: '📝 Code Review' },
    { value: 'document-processing', label: '📄 Document Processing' },
    { value: 'research', label: '🔍 Research' },
    { value: 'client-communication', label: '💬 Client Communication' },
    { value: 'general', label: '⚡ General' },
  ]

  const priorities = [
    { value: 'critical', label: '🔴 Critical', color: 'bg-red-600' },
    { value: 'high', label: '🟠 High', color: 'bg-orange-600' },
    { value: 'medium', label: '🟡 Medium', color: 'bg-yellow-600' },
    { value: 'low', label: '⚪ Low', color: 'bg-slate-600' },
  ]

  const agents = MOCK_AGENTS.filter(a => a.status !== 'offline')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/prospyr/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type,
          priority,
          assignTo: assignTo || undefined,
          requiredCapabilities: type !== 'general' ? [type] : [],
        }),
      })

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`)
      }

      const data = await res.json()
      onTaskCreated(data.task)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/90 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Create New Task</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief task title"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed task description"
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                {taskTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                {priorities.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Assign To (optional)
            </label>
            <select
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Unassigned - Any available agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-xl transition-colors"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
