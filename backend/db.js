import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import sqlite3 from 'sqlite3'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dbPath = path.join(__dirname, 'data', 'wedding.sqlite')
fs.mkdirSync(path.dirname(dbPath), { recursive: true })

sqlite3.verbose()

export const db = new sqlite3.Database(dbPath, (error) => {
  if (error) {
    console.error('Failed to open SQLite database:', error.message)
  } else {
    console.log('SQLite connected:', dbPath)
  }
})

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS blessings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      message TEXT NOT NULL,
      author_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.all(`PRAGMA table_info(blessings)`, [], (schemaError, rows) => {
    if (schemaError) {
      console.error('Failed to inspect blessings table:', schemaError.message)
      return
    }
    const hasAuthorId = rows.some((column) => column.name === 'author_id')
    if (hasAuthorId) return
    db.run(`ALTER TABLE blessings ADD COLUMN author_id TEXT`, (alterError) => {
      if (alterError) {
        console.error('Failed to add author_id column:', alterError.message)
      }
    })
  })

  db.get(`SELECT COUNT(*) AS total FROM blessings`, [], (error, row) => {
    if (error) {
      console.error('Failed to check blessings count:', error.message)
      return
    }

    if ((row?.total ?? 0) > 0) return

    const seed = db.prepare(`INSERT INTO blessings (name, message, author_id) VALUES (?, ?, ?)`)
    seed.run('Family Friend', 'Wishing you both a lifetime of laughter, love, and beautiful memories.', 'seed')
    seed.run('Well Wisher', 'May your marriage be filled with joy, blessings, and endless togetherness.', 'seed')
    seed.finalize()
  })
})

