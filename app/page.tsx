'use client'
import useSWR from 'swr'
import { useState } from 'react'
const API = process.env.NEXT_PUBLIC_PAPERCLIP_API || 'http://localhost:3100'
const K = process.env.NEXT_PUBLIC_PAPERCLIP_KEY || ''
const COMPANY = process.env.NEXT_PUBLIC_PAPERCLIP_COMPANY || 'b18b9b76-bb39-42b8-8349-c323bffd5e3b'
const fetcher = (url: string) => fetch(url, { headers: { Authorization: `Bearer ${K}` } }).then(r => r.json())
export default function Dashboard() {
  const { data: agents } = useSWR(`${API}/api/companies/${COMPANY}/agents`, fetcher)
  const [activeTab, setActiveTab] = useState<'agents' | 'runs'>('agents')
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Prospyr Control</h1>
      <p className="text-slate-400 mb-8">All Lines Auto Operations Hub</p>
      <div className="flex gap-4 mb-6 border-b border-slate-700 pb-4">
        <button onClick={() => setActiveTab('agents')} className={`px-4 py-2 rounded ${activeTab === 'agents' ? 'bg-blue-600' : 'bg-slate-800'}`}>Agents</button>
      </div>
      {activeTab === 'agents' ? (
        <div className="grid gap-4">
          {agents ? agents.map((a: any) => (
            <div key={a.id} className="bg-slate-800 rounded p-4 flex justify-between items-center">
              <div><h3 className="font-semibold text-lg">{a.name}</h3><p className="text-slate-400 text-sm">{a.role} · {a.adapterType}</p></div>
              <span className={`px-3 py-1 rounded text-sm ${a.status === 'idle' || a.status === 'running' ? 'bg-green-600' : 'bg-slate-600'}`}>{a.status || 'unknown'}</span>
            </div>
          )) : <p className="text-slate-400">Loading agents...</p>}
        </div>
      ) : null}
      <div className="mt-8 p-4 bg-slate-800 rounded">
        <p className="text-slate-400 text-sm">Connected to: {API}</p>
        <p className="text-slate-500 text-xs mt-1">Company: {COMPANY}</p>
      </div>
    </div>
  )
}
