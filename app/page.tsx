'use client'
import { useState, useEffect } from 'react'

interface Agent {
  id: string
  name: string
  role: string
  adapterType: string
  status: string
  createdAt?: string
}

interface Health {
  status: string
  version?: string
  uptime?: number
}

const AGENT_ROLES: Record<string, string> = {
  ceo: 'Chief Executive Officer',
  coo: 'Chief Operations Officer',
  cfo: 'Chief Financial Officer',
  cmo: 'Chief Marketing Officer',
  admin: 'Administrative',
  developer: 'Development',
  sales: 'Sales',
  support: 'Customer Support',
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: 'bg-emerald-600',
    running: 'bg-blue-600',
    active: 'bg-blue-600',
    stopped: 'bg-slate-600',
    error: 'bg-red-600',
    offline: 'bg-slate-700',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${colors[status] || 'bg-slate-600'}`}>
      {status || 'unknown'}
    </span>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg text-white">{agent.name}</h3>
          <p className="text-slate-400 text-sm mt-0.5">
            {AGENT_ROLES[agent.role?.toLowerCase()] || agent.role || 'Agent'}
          </p>
        </div>
        <StatusBadge status={agent.status} />
      </div>
      <div className="flex gap-4 text-xs text-slate-500">
        <span>Adapter: {agent.adapterType || 'default'}</span>
        <span>ID: {agent.id?.slice(0, 8)}...</span>
      </div>
    </div>
  )
}

function SystemHealth({ health }: { health: Health | null }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">System Health</h2>
      {health ? (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Status</span>
            <span className={health.status === 'ok' ? 'text-emerald-400' : 'text-yellow-400'}>
              {health.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Version</span>
            <span className="text-white">{health.version || 'unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Uptime</span>
            <span className="text-white">
              {health.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'unknown'}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-slate-500 text-sm">Checking...</p>
      )}
    </div>
  )
}

function QuickStats({ agents }: { agents: Agent[] }) {
  const stats = {
    total: agents.length,
    idle: agents.filter(a => a.status === 'idle').length,
    running: agents.filter(a => a.status === 'running' || a.status === 'active').length,
    stopped: agents.filter(a => a.status === 'stopped').length,
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {[
        { label: 'Total Agents', value: stats.total, color: 'text-white' },
        { label: 'Idle', value: stats.idle, color: 'text-emerald-400' },
        { label: 'Active', value: stats.running, color: 'text-blue-400' },
        { label: 'Stopped', value: stats.stopped, color: 'text-slate-400' },
      ].map(({ label, value, color }) => (
        <div key={label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
          <div className={`text-3xl font-bold ${color}`}>{value}</div>
          <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{label}</div>
        </div>
      ))}
    </div>
  )
}

function AgentList({ agents }: { agents: Agent[] }) {
  if (!agents.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-lg mb-2">No agents connected</p>
        <p className="text-sm">Agents will appear here when Paperclip is online</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent) => (
        <AgentCard key={agent.id} agent={agent} />
      ))}
    </div>
  )
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'agents' | 'runs' | 'logs'>('agents')

  const PAPERCLIP_API = process.env.NEXT_PUBLIC_PAPERCLIP_API || 'http://localhost:3100'
  const PAPERCLIP_KEY = process.env.NEXT_PUBLIC_PAPERCLIP_KEY || ''
  const PAPERCLIP_COMPANY = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b'

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch health
        const healthRes = await fetch(`${PAPERCLIP_API}/api/health`)
        if (healthRes.ok) {
          setHealth(await healthRes.json())
        }
      } catch (e) {
        // health check failed, system may be starting
      }

      try {
        // Fetch agents
        const agentsRes = await fetch(`${PAPERCLIP_API}/api/companies/${PAPERCLIP_COMPANY}/agents`, {
          headers: { Authorization: `Bearer ${PAPERCLIP_KEY}` },
        })
        if (agentsRes.ok) {
          const data = await agentsRes.json()
          const agentList = Array.isArray(data) ? data : data?.data || []
          setAgents(agentList)
          setError(null)
          setLastUpdated(new Date().toLocaleTimeString())
        } else {
          setError(`API returned ${agentsRes.status}`)
        }
      } catch (e) {
        setError(`Connection failed: ${String(e)}`)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 30000) // poll every 30s
    return () => clearInterval(interval)
  }, [PAPERCLIP_API, PAPERCLIP_KEY, PAPERCLIP_COMPANY])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Prospyr Control</h1>
            <p className="text-slate-500 text-sm">All Lines Auto Operations Hub</p>
          </div>
          <div className="text-right">
            {lastUpdated && (
              <p className="text-xs text-slate-500">Last updated: {lastUpdated}</p>
            )}
            <p className="text-xs text-slate-600 font-mono mt-0.5">{PAPERCLIP_API}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-800 rounded-xl text-red-300 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Stats */}
        <div className="mb-8">
          <QuickStats agents={agents} />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
          {[
            { id: 'agents', label: 'Agents' },
            { id: 'runs', label: 'Runs', disabled: true },
            { id: 'logs', label: 'Logs', disabled: true },
          ].map(({ id, label, disabled }) => (
            <button
              key={id}
              onClick={() => !disabled && setActiveTab(id as any)}
              disabled={disabled}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? 'bg-blue-600 text-white'
                  : disabled
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
              {disabled && <span className="ml-2 text-xs">(Soon)</span>}
            </button>
          ))}

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <SystemHealth health={health} />
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Agent Grid */}
        {activeTab === 'agents' && <AgentList agents={agents} />}

        {/* Coming Soon */}
        {activeTab !== 'agents' && (
          <div className="text-center py-20 text-slate-600">
            <p className="text-xl mb-2">Coming Soon</p>
            <p className="text-sm">{activeTab === 'runs' ? 'Run history and task tracking' : 'System logs and agent activity'} will appear here.</p>
          </div>
        )}
      </main>
    </div>
  )
}
