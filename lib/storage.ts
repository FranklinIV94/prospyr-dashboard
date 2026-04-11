// File-based storage for Prospyr dashboard
// Persists tasks and messages to JSON files

import fs from 'fs'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || '/tmp/prospyr-data'

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

// Generic file read
export function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDataDir()
  const filepath = path.join(DATA_DIR, filename)
  try {
    if (fs.existsSync(filepath)) {
      const data = fs.readFileSync(filepath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.error(`[Storage] Error reading ${filename}:`, error)
  }
  return defaultValue
}

// Generic file write
export function writeJsonFile<T>(filename: string, data: T): void {
  ensureDataDir()
  const filepath = path.join(DATA_DIR, filename)
  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error(`[Storage] Error writing ${filename}:`, error)
  }
}
