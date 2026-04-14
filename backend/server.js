/* global process */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { db } from './db.js'

const app = express()
const PORT = Number(process.env.PORT || 4000)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.join(__dirname, '..', 'dist')

app.use(cors())
app.use(express.json())

function getClientId(req) {
  return String(req.header('x-client-id') ?? '').trim().slice(0, 120)
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/blessings', (req, res) => {
  const clientId = getClientId(req)
  db.all(
    `SELECT id, name, message, author_id AS authorId, created_at AS createdAt FROM blessings ORDER BY datetime(created_at) DESC LIMIT 100`,
    [],
    (error, rows) => {
      if (error) {
        res.status(500).json({ error: 'Failed to load blessings' })
        return
      }
      res.json(
        rows.map((row) => ({
          id: row.id,
          name: row.name,
          message: row.message,
          createdAt: row.createdAt,
          editable: Boolean(clientId) && row.authorId === clientId,
        })),
      )
    },
  )
})

app.post('/api/blessings', (req, res) => {
  const clientId = getClientId(req)
  const name = String(req.body?.name ?? '').trim()
  const message = String(req.body?.message ?? '').trim()

  if (!clientId) {
    res.status(400).json({ error: 'Client identity is required' })
    return
  }

  if (!name || !message) {
    res.status(400).json({ error: 'Name and message are required' })
    return
  }

  if (name.length > 80 || message.length > 500) {
    res.status(400).json({ error: 'Name or message is too long' })
    return
  }

  db.run(
    `INSERT INTO blessings (name, message, author_id) VALUES (?, ?, ?)`,
    [name, message, clientId],
    function onInsert(error) {
      if (error) {
        res.status(500).json({ error: 'Failed to save blessing' })
        return
      }
      res.status(201).json({
        id: this.lastID,
        name,
        message,
        createdAt: new Date().toISOString(),
        editable: true,
      })
    },
  )
})

app.put('/api/blessings/:id', (req, res) => {
  const clientId = getClientId(req)
  const blessingId = Number(req.params.id)
  const name = String(req.body?.name ?? '').trim()
  const message = String(req.body?.message ?? '').trim()

  if (!Number.isInteger(blessingId) || blessingId <= 0) {
    res.status(400).json({ error: 'Invalid blessing id' })
    return
  }

  if (!clientId) {
    res.status(400).json({ error: 'Client identity is required' })
    return
  }

  if (!name || !message) {
    res.status(400).json({ error: 'Name and message are required' })
    return
  }

  if (name.length > 80 || message.length > 500) {
    res.status(400).json({ error: 'Name or message is too long' })
    return
  }

  db.get(`SELECT id, author_id AS authorId FROM blessings WHERE id = ?`, [blessingId], (findError, row) => {
    if (findError) {
      res.status(500).json({ error: 'Failed to validate blessing ownership' })
      return
    }
    if (!row) {
      res.status(404).json({ error: 'Blessing not found' })
      return
    }
    if (row.authorId && row.authorId !== clientId) {
      res.status(403).json({ error: 'You can only edit blessings created by you' })
      return
    }

    db.run(
      `UPDATE blessings SET name = ?, message = ?, author_id = COALESCE(author_id, ?) WHERE id = ?`,
      [name, message, clientId, blessingId],
      (updateError) => {
        if (updateError) {
          res.status(500).json({ error: 'Failed to update blessing' })
          return
        }
        res.json({ id: blessingId, name, message, editable: true })
      },
    )
  })
})

app.use(express.static(distPath))
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})

