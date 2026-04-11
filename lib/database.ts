// Database storage for Prospyr dashboard
// Uses Supabase PostgreSQL for persistence

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create Supabase client (server-side only)
export function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('[DB] Supabase not configured, falling back to file storage')
    return null
  }
  return createClient(supabaseUrl, supabaseKey)
}

// Task interface
export interface Task {
  id: string
  title: string
  description: string
  type: string
  priority: string
  status: string
  assigned_to: string | null
  claimed_by: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  completed_at: string | null
  result: string | null
  error: string | null
  blockers: string[]
  comments: any[]
  required_capabilities: string[]
  skill_used: string | null
  workspace_id: string | null
}

// Message interface  
export interface Message {
  id: string
  agent_id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  read: boolean
  reply_to: string | null
}

// Get all tasks
export async function getTasks(filters?: { status?: string; agentId?: string }) {
  const supabase = getSupabase()
  if (!supabase) return null
  
  let query = supabase.from('tasks').select('*').order('created_at', { ascending: false })
  
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }
  if (filters?.agentId) {
    query = query.eq('assigned_to', filters.agentId)
  }
  
  const { data, error } = await query
  if (error) { console.error('[DB] getTasks error:', error); return null }
  return data
}

// Create task
export async function createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) {
  const supabase = getSupabase()
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
    
  if (error) { console.error('[DB] createTask error:', error); return null }
  return data
}

// Update task
export async function updateTask(id: string, updates: Partial<Task>) {
  const supabase = getSupabase()
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
    
  if (error) { console.error('[DB] updateTask error:', error); return null }
  return data
}

// Delete task
export async function deleteTask(id: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) { console.error('[DB] deleteTask error:', error); return null }
  return true
}

// Get chat messages for agent
export async function getMessages(agentId: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('agent_id', agentId)
    .order('timestamp', { ascending: true })
    
  if (error) { console.error('[DB] getMessages error:', error); return null }
  return data
}

// Create message
export async function createMessage(message: Omit<Message, 'id' | 'timestamp'>) {
  const supabase = getSupabase()
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('messages')
    .insert(message)
    .select()
    .single()
    
  if (error) { console.error('[DB] createMessage error:', error); return null }
  return data
}

// Mark messages as read
export async function markMessagesRead(agentId: string) {
  const supabase = getSupabase()
  if (!supabase) return null
  
  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('agent_id', agentId)
    .eq('read', false)
    
  if (error) { console.error('[DB] markMessagesRead error:', error) }
}
