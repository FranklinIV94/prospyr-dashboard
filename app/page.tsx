'use client'
import useSWR from 'swr'
import { useState, useEffect, useRef } from 'react'

const API = process.env.NEXT_PUBLIC_PAPERCLIP_API || 'http://localhost:3100'
const K = process.env.NEXT_PUBLIC_PAPERCLIP_KEY || ''
const COMPANY = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b'

const fetcher = (url: string) => fetch(url, { headers: { Authorization: `Bearer ${K}` } }).then(r => r.json())

interface Agent {
  id: string; name: string; role: string; status: string
  capabilities: string[]; lastHeartbeat: string; currentTaskId: string | null; connected: boolean
}
interface Task {
  id: string; title: string; description: string; assigneeId: string | null
  assigneeName: string | null; status: string; priority: string
  createdBy: string; createdAt: string; updatedAt: string
}
interface ChatMessage {
  id: string; from: string; fromId: string; fromName: string
  toAgentId: string; content: string; timestamp: string
}

export default function Dashboard() {
  const { data: paperclipAgents } = useSWR(`${API}/api/companies/${COMPANY}/agents`, fetcher)
  const [activeTab, setActiveTab] = useState<'agents' | 'tasks' | 'chat'>('agents')
  const [tasks, setTasks] = useState<Task[]>([])
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [selectedAgent, setSelectedAgent] = useState<string>('')
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskAssignee, setTaskAssignee] = useState('')
  const [taskPriority, setTaskPriority] = useState('medium')

  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/prospyr/tasks')
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch {}
  }

  const loadMessages = async (agentId: string) => {
    try {
      const res = await fetch(`/api/prospyr/chat?agentId=${agentId}`)
      const data = await res.json()
      setMessages(prev => ({ ...prev, [agentId]: data.messages || [] }))
    } catch {}
  }

  useEffect(() => {
    const es = new EventSource('/api/prospyr/events?agentId=dashboard')
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data)
        if (event.type === 'task' || event.type === 'message') loadTasks()
      } catch {}
    }
    setEventSource(es)
    loadTasks()
    return () => es.close()
  }, [])

  useEffect(() => {
    if (selectedAgent) loadMessages(selectedAgent)
  }, [selectedAgent])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const handleCreateTask = async () => {
    if (!taskTitle.trim()) return
    const agentName = paperclipAgents?.find((a: Agent) => a.id === taskAssignee)?.name || null
    await fetch('/api/prospyr/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: taskTitle, description: taskDesc, assigneeId: taskAssignee || null, assigneeName: agentName, priority: taskPriority, createdBy: 'Franklin' })
    })
    setTaskTitle(''); setTaskDesc(''); setTaskAssignee(''); setTaskPriority('medium')
    loadTasks()
  }

  const handleSendChat = async () => {
    if (!chatMessage.trim() || !selectedAgent) return
    await fetch('/api/prospyr/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toAgentId: selectedAgent, content: chatMessage, from: 'user', fromId: 'franklin', fromName: 'Franklin' })
    })
    setChatMessage('')
    loadMessages(selectedAgent)
  }

  const handleUpdateTask = async (taskId: string, status: string) => {
    await fetch('/api/prospyr/tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status })
    })
    loadTasks()
  }

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId)
    setActiveTab('chat')
    loadMessages(agentId)
    setChatHistory(messages[agentId] || [])
  }

  useEffect(() => {
    if (selectedAgent && messages[selectedAgent]) setChatHistory(messages[selectedAgent])
  }, [messages, selectedAgent])

  const statusColor = (s: string) => {
    if (s === 'done') return 'bg-green-600'
    if (s === 'in_progress') return 'bg-blue-600'
    if (s === 'blocked') return 'bg-red-600'
    return 'bg-slate-600'
  }
  const priorityColor = (p: string) => {
    if (p === 'critical') return 'text-red-400'
    if (p === 'high') return 'text-orange-400'
    if (p === 'low') return 'text-slate-400'
    return 'text-slate-300'
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Prospyr Control</h1>
      <p className="text-slate-400 mb-8">All Lines Operations Hub</p>

      <div className="flex gap-4 mb-6 border-b border-slate-700 pb-4">
        {['agents', 'tasks', 'chat'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`px-4 py-2 rounded capitalize ${activeTab === tab ? 'bg-blue-600' : 'bg-slate-800'}`}>{tab}</button>
        ))}
        <span className="ml-auto text-slate-400 text-sm pt-2">
          {paperclipAgents?.length || 0} agents · {tasks.length} tasks
        </span>
      </div>

      {activeTab === 'agents' && (
        <div className="space-y-4">
          {(paperclipAgents || []).map((a: Agent) => (
            <div key={a.id} className="bg-slate-800 rounded p-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">{a.name}</h3>
                <p className="text-slate-400 text-sm">{a.role || 'agent'} · {a.adapterType || 'unknown'}</p>
                <p className="text-slate-500 text-xs mt-1">
                  {a.lastHeartbeat ? `Last heartbeat: ${new Date(a.lastHeartbeat).toLocaleTimeString()}` : 'Never'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded text-sm ${a.status === 'idle' || a.status === 'running' ? 'bg-green-600' : 'bg-slate-600'}`}>
                  {a.connected ? '🟢 connected' : '⚪ disconnected'}
                </span>
                {a.capabilities?.length > 0 && (
                  <div className="flex gap-1 flex-wrap max-w-[200px]">
                    {a.capabilities.slice(0, 4).map(c => (
                      <span key={c} className="text-xs bg-slate-700 px-2 py-0.5 rounded">{c}</span>
                    ))}
                  </div>
                )}
                <button onClick={() => handleSelectAgent(a.id)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm">Message</button>
              </div>
            </div>
          ))}
          {(!paperclipAgents || paperclipAgents.length === 0) && <p className="text-slate-400">Loading agents from Paperclip...</p>}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded p-4">
            <h2 className="text-lg font-semibold mb-4">Create Task</h2>
            <div className="space-y-3">
              <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title"
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
              <textarea value={taskDesc} onChange={e => setTaskDesc(e.target.value)} placeholder="Description (optional)" rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
              <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white">
                <option value="">Unassigned</option>
                {(paperclipAgents || []).map((a: Agent) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white">
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="critical">Critical</option>
              </select>
              <button onClick={handleCreateTask} className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-semibold">Create Task</button>
            </div>
          </div>

          <div className="bg-slate-800 rounded p-4">
            <h2 className="text-lg font-semibold mb-4">Tasks ({tasks.length})</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {tasks.length === 0 && <p className="text-slate-400 text-sm">No tasks yet</p>}
              {tasks.map(t => (
                <div key={t.id} className="bg-slate-700 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{t.title}</p>
                      {t.description && <p className="text-slate-400 text-sm mt-1">{t.description}</p>}
                      <p className="text-slate-500 text-xs mt-2">
                        {t.assigneeName || 'Unassigned'} · {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColor(t.status)}`}>{t.status}</span>
                      <span className={`text-xs ${priorityColor(t.priority)}`}>{t.priority}</span>
                    </div>
                  </div>
                  {t.status !== 'done' && (
                    <div className="flex gap-2 mt-2">
                      {t.status === 'todo' && (
                        <button onClick={() => handleUpdateTask(t.id, 'in_progress')} className="text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded">Start</button>
                      )}
                      {t.status === 'in_progress' && (
                        <button onClick={() => handleUpdateTask(t.id, 'done')} className="text-xs bg-green-600 hover:bg-green-500 px-2 py-1 rounded">Done</button>
                      )}
                      <button onClick={() => handleUpdateTask(t.id, 'blocked')} className="text-xs bg-red-600 hover:bg-red-500 px-2 py-1 rounded">Block</button>
                    </div>
                  )}
                  {t.status === 'done' && (
                    <button onClick={() => handleUpdateTask(t.id, 'todo')} className="text-xs bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded mt-2">Reopen</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded p-4">
            <h2 className="text-lg font-semibold mb-4">Agents</h2>
            <div className="space-y-2">
              {(paperclipAgents || []).map((a: Agent) => (
                <button key={a.id} onClick={() => { setSelectedAgent(a.id); loadMessages(a.id) }}
                  className={`w-full text-left p-3 rounded ${selectedAgent === a.id ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                  <p className="font-medium">{a.name}</p>
                  <p className="text-xs text-slate-400">{a.connected ? '🟢' : '⚪'} {a.status}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-2 bg-slate-800 rounded p-4 flex flex-col" style={{ minHeight: '400px' }}>
            <h2 className="text-lg font-semibold mb-4">
              Chat with {selectedAgent ? paperclipAgents?.find((a: Agent) => a.id === selectedAgent)?.name : 'Select an agent'}
            </h2>
            {!selectedAgent ? (
              <p className="text-slate-400">Select an agent from the left to start chatting</p>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-[200px]">
                  {(messages[selectedAgent] || []).map((m: ChatMessage) => (
                    <div key={m.id} className={`p-3 rounded ${m.from === 'user' ? 'bg-blue-600 ml-8' : 'bg-slate-700 mr-8'}`}>
                      <p className="text-sm font-medium text-slate-300">{m.fromName} · {new Date(m.timestamp).toLocaleTimeString()}</p>
                      <p className="mt-1">{m.content}</p>
                    </div>
                  ))}
                  {(!messages[selectedAgent] || messages[selectedAgent].length === 0) && (
                    <p className="text-slate-500 text-sm">No messages yet</p>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input value={chatMessage} onChange={e => setChatMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()} placeholder="Type a message..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white" />
                  <button onClick={handleSendChat} className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded font-semibold">Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 p-4 bg-slate-800 rounded">
        <p className="text-slate-400 text-sm">Connected to: {API}</p>
        <p className="text-slate-500 text-xs mt-1">Company: {COMPANY}</p>
      </div>
    </div>
  )
}