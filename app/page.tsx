'use client'
import useSWR from 'swr'
import { useState } from 'react'
const fetcher = (url: string) => fetch(url).then(r => r.json())
const API = process.env.NEXT_PUBLIC_PAPERCLIP_API || 'http://localhost:3100'
const K = process.env.NEXT_PUBLIC_PAPERCLIP_KEY || ''
export default function Dashboard() {
  const { data: agents } = useSWR([`${API}/api/agents`, K], () =>
    fetch(`${API}/api/agents`, { headers: { Authorization: `Bearer ${K}` } }).then(r => r.json())
  )
  const { data: runs } = useSWR([`${API}/api/runs`, K], () =>
    fetch(`${API}/api/runs?limit=10`, { headers: { Authorization: `Bearer ${K}` } }).then(r => r.json())
  )
  const [activeTab, setActiveTab] = useState<'agents' | 'runs'>('agents')
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Prospyr Control</h1>
      <p className="text-slate-400 mb-8">All Lines Auto Operations Hub</p>
      <div className="flex gap-4 mb-6 border-b border-slate-700 pb-4">
        <button onClick={() => setActiveTab('agents')} className={`px-4 py-2 rounded ${activeTab === 'agents' ? 'bg-blue-600' : 'bg-slate-800'}`}>Agents</button>
        <button onClick={() => setActiveTab('runs')} className={`px-4 py-2 rounded ${activeTab === 'runs' ? 'bg-blue-600' : 'bg-slate-800'}`}>Recent Runs</button>
      </div>
      {activeTab === 'agents' ? (
        <div className="grid gap-4">
          {agents?.data ? agents.data.map((a: any) => (
            <div key={a.id} className="bg-slate-800 rounded p-4 flex justify-between items-center">
              <div><h3 className="font-semibold text-lg">{a.name}</h3><p className="text-slate-400 text-sm">{a.id}</p></div>
              <span className={`px-3 py-1 rounded text-sm ${a.status === 'online' ? 'bg-green-600' : 'bg-slate-600'}`}>{a.status || 'unknown'}</span>
            </div>
          )) : <p className="text-slate-400">Loading agents...</p>}
        </div>
      ) : (
        <div className="grid gap-4">
          {runs?.data ? runs.data.map((r: any) => (
            <div key={r.id} className="bg-slate-800 rounded p-4">
              <div className="flex justify-between"><span className="font-mono text-sm">{r.id}</span><span className={`text-sm ${r.status === 'completed' ? 'text-green-400' : 'text-slate-400'}`}>{r.status}</span></div>
              <p className="text-slate-400 text-sm mt-1">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
          )) : <p className="text-slate-400">Loading runs...</p>}
        </div>
      )}
    </div>
  )
}
