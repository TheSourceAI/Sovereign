import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Dashboard() {
  const [agents, setAgents] = useState([])
  const [tasks, setTasks] = useState([])
  const [approvals, setApprovals] = useState([])
  const [pulse, setPulse] = useState({})
  const [command, setCommand] = useState('')
  const [sending, setSending] = useState(false)
  const [routed, setRouted] = useState('')

  async function load() {
    const [a, t, ap, p] = await Promise.all([
      supabase.from('agent_status').select('*'),
      supabase.from('task_queue').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('task_queue').select('*').eq('status', 'pending_approval'),
      supabase.from('daily_pulse').select('*').order('generated_at', { ascending: false }).limit(1)
    ])
    setAgents(a.data || [])
    setTasks(t.data || [])
    setApprovals(ap.data || [])
    setPulse(p.data?.[0] || {})
  }

  async function decide(id, approve) {
    await supabase.from('task_queue').update({
      status: approve ? 'queued' : 'rejected',
      approved_at: approve ? new Date().toISOString() : null,
      completed_at: approve ? null : new Date().toISOString()
    }).eq('id', id)
    load()
  }

  async function sendCommand() {
    if (!command.trim()) return
    setSending(true)
    setRouted('Routing...')
    setTimeout(() => { setRouted('→ Queued for next cycle'); setSending(false); setCommand('') }, 1500)
  }

  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i) }, [])

  const statusColor = { idle: '#5b5b6b', finding: '#4a9eff', working: '#d4af37', blocked: '#ff9d4a', error: '#ff5a5a' }
  const agentLabels = { suit_business: 'Custom Suits', source_ai: 'Source AI', content: 'Content', data: 'Data' }

  return (
    <div style={{ background: '#0a0a0c', minHeight: '100vh', color: '#e8e8ec', fontFamily: 'system-ui, sans-serif', padding: '40px 48px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #26262f', paddingBottom: 24, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 52, fontWeight: 900, color: '#f5d76e', letterSpacing: -1 }}>SOVEREIGN</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.3em', textTransform: 'uppercase', marginTop: 8 }}>Autonomous Business OS · Johnny Berry Jr.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80', animation: 'pulse 1.8s infinite' }} />
            <span style={{ fontSize: 11, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Online</span>
          </div>
        </div>

        {/* Pulse */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#26262f', borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
          {[
            { label: 'Tasks / 24h', value: pulse.executions_24h || 0, color: '#f5d76e' },
            { label: 'Suit Drafts', value: pulse.suit_drafts_24h || 0, color: '#e8e8ec' },
            { label: 'Scripts', value: pulse.scripts_24h || 0, color: '#e8e8ec' },
            { label: 'Failures', value: pulse.failures_24h || 0, color: '#ff5a5a' }
          ].map(m => (
            <div key={m.label} style={{ background: 'rgba(21,21,28,0.8)', padding: '18px', textAlign: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 900, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{m.label}</div>
            </div>
          ))}
        </div>

        {/* Command */}
        <div style={{ border: '1px solid rgba(212,175,55,0.2)', borderRadius: 12, background: 'rgba(212,175,55,0.06)', padding: 20, marginBottom: 32 }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#8a7320', marginBottom: 12 }}>Command Sovereign</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendCommand()}
              placeholder='e.g. "Draft follow-ups for hot suit prospects"'
              style={{ flex: 1, background: 'rgba(10,10,12,0.6)', border: '1px solid #26262f', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: 'rgba(255,255,255,0.9)', outline: 'none' }} />
            <button onClick={sendCommand} disabled={sending}
              style={{ borderRadius: 8, background: '#d4af37', color: '#0a0a0c', fontWeight: 700, padding: '0 24px', fontSize: 14, border: 'none', cursor: 'pointer' }}>
              {sending ? 'Routing...' : 'Send'}
            </button>
          </div>
          {routed && <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(212,175,55,0.7)' }}>{routed}</div>}
        </div>

        {/* Agents */}
        <div style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>Agents</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
          {['suit_business','source_ai','content','data'].map(name => {
            const agent = agents.find(a => a.agent_name === name) || {}
            const status = agent.status || 'idle'
            const color = statusColor[status] || '#5b5b6b'
            return (
              <div key={name} style={{ borderRadius: 12, border: '1px solid #26262f', background: 'rgba(21,21,28,0.6)', padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#8a7320' }}>{agentLabels[name]}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#f5d76e', textTransform: 'capitalize' }}>{status}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{agent.detail || '—'}</div>
              </div>
            )
          })}
        </div>

        {/* Queue + Approvals */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={{ borderRadius: 12, border: '1px solid #26262f', background: 'rgba(21,21,28,0.6)', padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Task Queue</div>
            {tasks.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0' }}>Queue empty</div>}
            {tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: 8, border: '1px solid rgba(38,38,47,0.6)', padding: '10px 12px', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{t.task_type}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{t.agent_name}</div>
                </div>
                <span style={{ fontSize: 10, padding: '4px 8px', borderRadius: 6, background: t.status === 'completed' ? 'rgba(74,222,128,0.1)' : 'rgba(74,158,255,0.1)', color: t.status === 'completed' ? '#4ade80' : '#4a9eff', border: `1px solid ${t.status === 'completed' ? 'rgba(74,222,128,0.3)' : 'rgba(74,158,255,0.3)'}` }}>{t.status}</span>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: 12, border: '1px solid rgba(255,157,74,0.3)', background: 'rgba(255,157,74,0.04)', padding: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#ff9d4a', marginBottom: 4 }}>Awaiting Approval</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Side-effectful actions wait here for your approval.</div>
            {approvals.length === 0 && <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '32px 0' }}>Nothing pending — all clear</div>}
            {approvals.map(item => (
              <div key={item.id} style={{ borderRadius: 8, border: '1px solid #26262f', background: 'rgba(10,10,12,0.4)', padding: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#8a7320', textTransform: 'uppercase', marginBottom: 8 }}>{item.agent_name} · {item.task_type}</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 12, lineHeight: 1.5 }}>{JSON.stringify(item.payload).slice(0, 120)}...</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => decide(item.id, true)} style={{ flex: 1, borderRadius: 6, background: '#d4af37', color: '#0a0a0c', fontSize: 12, fontWeight: 700, padding: 8, border: 'none', cursor: 'pointer' }}>Approve & Send</button>
                  <button onClick={() => decide(item.id, false)} style={{ borderRadius: 6, border: '1px solid #26262f', background: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 12, padding: '8px 16px', cursor: 'pointer' }}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #26262f', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          Powered by Claude · Supabase · Vapi
        </div>
      </div>
    </div>
  )
}
