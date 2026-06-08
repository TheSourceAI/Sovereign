'use client';

import { useState } from 'react';

export default function CommandInput() {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const [lastRoute, setLastRoute] = useState<string | null>(null);

  async function send() {
    if (!value.trim()) return;
    setSending(true);
    setLastRoute(null);
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request: value, source: 'dashboard' }),
      });
      const data = await res.json();
      setLastRoute(`→ ${data.agent} (${data.task_type || 'adhoc'})`);
      setValue('');
    } catch {
      setLastRoute('→ error routing request');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-gold/20 bg-gradient-to-b from-gold/[0.06] to-transparent p-5 shadow-glow">
      <label className="text-xs uppercase tracking-widest text-gold-dim font-mono">
        Command the Brain
      </label>
      <div className="mt-3 flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder='e.g. "Draft follow-ups for my hot suit prospects"'
          className="flex-1 bg-ink/60 border border-ink-border rounded-lg px-4 py-3 text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-gold/40 font-body"
        />
        <button
          onClick={send}
          disabled={sending}
          className="rounded-lg bg-gold text-ink font-semibold px-6 text-sm hover:bg-gold-bright disabled:opacity-50 transition-colors"
        >
          {sending ? 'Routing…' : 'Send'}
        </button>
      </div>
      {lastRoute && (
        <p className="mt-2 text-xs font-mono text-gold/70 animate-fade-up">{lastRoute}</p>
      )}
    </div>
  );
}
