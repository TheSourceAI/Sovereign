import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const { id, approve } = req.body
  try {
    await supabase.from('task_queue').update({
      status: approve ? 'queued' : 'rejected',
      approved_at: approve ? new Date().toISOString() : null,
      completed_at: approve ? null : new Date().toISOString()
    }).eq('id', id)
    res.status(200).json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
