import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    const [a, t, ap, p] = await Promise.all([
      supabase.from('agent_status').select('*'),
      supabase.from('task_queue').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('task_queue').select('*').eq('status', 'pending_approval'),
      supabase.from('daily_pulse').select('*').order('generated_at', { ascending: false }).limit(1)
    ])
    res.status(200).json({
      agents: a.data || [],
      tasks: t.data || [],
      approvals: ap.data || [],
      pulse: (p.data && p.data[0]) || {}
    })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
}
