/* global process */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'

const app = express()
const PORT = Number(process.env.PORT || 4000)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.join(__dirname, '..', 'dist')
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null

app.use(cors())
app.use(express.json())

function getClientId(req) {
  return String(req.header('x-client-id') ?? '').trim().slice(0, 120)
}

function requireSupabase(res) {
  if (supabase) return true
  res.status(500).json({
    error: 'Server is missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
  })
  return false
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/blessings', (req, res) => {
  if (!requireSupabase(res)) return
  const clientId = getClientId(req)
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? '20'), 10) || 20))
  const start = (page - 1) * limit
  const end = start + limit - 1
  supabase
    .from('blessings')
    .select('id,name,message,author_id,created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, end)
    .then(({ data, error, count }) => {
      if (error) {
        res.status(500).json({ error: 'Failed to load blessings' })
        return
      }

      const rows = Array.isArray(data) ? data : []
      const items = rows.map((row) => ({
          id: row.id,
          name: row.name,
          message: row.message,
          createdAt: row.created_at,
          editable: Boolean(clientId) && row.author_id === clientId,
        }))
      const total = Number.isFinite(count) ? count : items.length
      const hasMore = page * limit < total
      res.json({ items, page, limit, total, hasMore })
    })
})

app.post('/api/blessings', (req, res) => {
  if (!requireSupabase(res)) return
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

  supabase
    .from('blessings')
    .insert({ name, message, author_id: clientId })
    .select('id,name,message,created_at')
    .single()
    .then(({ data, error }) => {
      if (error || !data) {
        res.status(500).json({ error: 'Failed to save blessing' })
        return
      }
      res.status(201).json({
        id: data.id,
        name: data.name,
        message: data.message,
        createdAt: data.created_at,
        editable: true,
      })
    })
})

app.put('/api/blessings/:id', (req, res) => {
  if (!requireSupabase(res)) return
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

  supabase
    .from('blessings')
    .select('id,author_id')
    .eq('id', blessingId)
    .maybeSingle()
    .then(async ({ data: row, error: findError }) => {
    if (findError) {
      res.status(500).json({ error: 'Failed to validate blessing ownership' })
      return
    }
    if (!row) {
      res.status(404).json({ error: 'Blessing not found' })
      return
    }
    if (row.author_id && row.author_id !== clientId) {
      res.status(403).json({ error: 'You can only edit blessings created by you' })
      return
    }

    const { error: updateError } = await supabase
      .from('blessings')
      .update({ name, message, author_id: row.author_id || clientId })
      .eq('id', blessingId)
    if (updateError) {
      res.status(500).json({ error: 'Failed to update blessing' })
      return
    }
    res.json({ id: blessingId, name, message, editable: true })
  })
})

app.use(express.static(distPath))
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})

