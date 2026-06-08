'use client';

import { useEffect, useState } from 'react';
import { supabase, subscribeTable } from '../lib/supabase';

const STATUS_COLORS: Record<string, string> = {
  idle: '#5b5b6b',
  finding: '#4a9eff',
  working: '#d4af37',
  blocked: '#ff9d4a',
  error: '#ff5a5a',
};

const AGENT_LABELS: Record<string, string> = {
  suit_business: 'Custom Suits',
  source_ai: 'Source AI',
  content: 'Content',
  data: 'Data & Reports',
};

type AgentStatus = {
  agent_name: string;
  status: string;
  detail: string | null;
  updated_at: string;
};

export default function AgentStatusPanel() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);

  async function load() {
    const { data } = await supabase.from('agent_status').select('*');
    setAgents(data || []);
  }

  useEffect(() => {
    load();
    return subscribeTable('agent_status', load);
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.keys(AGENT_LABELS).map((name, i) => {
        const agent = agents.find((a) => a.agent_name === name);
        const status = agent?.status || 'idle';
        const color = STATUS_COLORS[status] || '#5b5b6b';
        const isLive = status === 'working' || status === 'finding';

        return (
          <div
            key={name}
            className="rounded-xl border border-ink-border bg-ink-panel/60 p-5 backdrop-blur animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs uppercase tracking-widest text-gold-dim font-mono">
                {AGENT_LABELS[name]}
              </span>
              <span
                className={`status-dot ${isLive ? 'live' : ''}`}
                style={{ color }}
              />
            </div>
            <div className="font-display text-2xl text-gold-bright capitalize">
              {status}
            </div>
            <div className="mt-1 text-xs text-white/40 font-mono truncate h-4">
              {agent?.detail || '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
