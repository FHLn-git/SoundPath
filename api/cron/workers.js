export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const token = process.env.WORKER_TOKEN

    if (!supabaseUrl) return res.status(500).json({ error: 'Missing VITE_SUPABASE_URL in Vercel env' })
    if (!token) return res.status(500).json({ error: 'Missing WORKER_TOKEN in Vercel env' })

    const endpoints = [
      'webhook-delivery',
      'communication-delivery',
      'calendar-sync',
      'push-worker',
    ]

    const results = {}
    for (const fn of endpoints) {
      const url = `${supabaseUrl}/functions/v1/${fn}?token=${encodeURIComponent(token)}`
      const r = await fetch(url, { method: 'POST' }).catch((e) => ({ ok: false, status: 0, text: async () => e.message }))
      const text = await r.text()
      results[fn] = { ok: r.ok, status: r.status, body: text.slice(0, 1000) }
    }

    return res.status(200).json({ ok: true, ran_at: new Date().toISOString(), results })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' })
  }
}

