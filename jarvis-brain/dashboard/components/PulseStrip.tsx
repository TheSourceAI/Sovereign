'use client';

import { useEffect, useState } from 'react';
import { supabase, subscribeTable } from '../lib/supabase';

type Pulse = {
  executions_24h: number;
  suit_drafts_24h: number;
  scripts_24h: number;
  failures_24h: number;
};

export default function PulseStrip() {
  const [pulse, setPulse] = useState<Pulse | null>(null);

  async function load() {
    const { data } = await supabase
      .from('daily_pulse')
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();
    setPulse(data);
  }

  useEffect(() => {
    load();
    return subscribeTable('task_executions', load);
  }, []);

  const metrics = [
    { label: 'Tasks / 24h', value: pulse?.executions_24h ?? 0, color: 'text-gold-bright' },
    { label: 'Suit Drafts', value: pulse?.suit_drafts_24h ?? 0, color: 'text-white/90' },
    { label: 'Scripts', value: pulse?.scripts_24h ?? 0, color: 'text-white/90' },
    { label: 'Failures', value: pulse?.failures_24h ?? 0, color: 'text-status-error' },
  ];

  return (
    <div className="grid grid-cols-4 gap-px rounded-xl overflow-hidden border border-ink-border bg-ink-border">
      {metrics.map((m) => (
        <div key={m.label} className="bg-ink-panel/80 p-4 text-center">
          <div className={`font-display text-3xl ${m.color}`}>{m.value}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40 font-mono mt-1">
            {m.label}
          </div>
        </div>
      ))}
    </div>
  );
}
