'use client';

import { useEffect, useState } from 'react';
import { supabase, subscribeTable } from '../lib/supabase';

type Task = {
  id: number;
  agent_name: string;
  task_type: string;
  status: string;
  priority: number;
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  queued: 'text-status-finding border-status-finding/30 bg-status-finding/10',
  claimed: 'text-gold border-gold/30 bg-gold/10',
  completed: 'text-status-ok border-status-ok/30 bg-status-ok/10',
  failed: 'text-status-error border-status-error/30 bg-status-error/10',
  pending_approval: 'text-status-blocked border-status-blocked/30 bg-status-blocked/10',
};

export default function TaskQueuePanel() {
  const [tasks, setTasks] = useState<Task[]>([]);

  async function load() {
    const { data } = await supabase
      .from('task_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(12);
    setTasks(data || []);
  }

  useEffect(() => {
    load();
    return subscribeTable('task_queue', load);
  }, []);

  return (
    <div className="rounded-xl border border-ink-border bg-ink-panel/60 p-5 backdrop-blur">
      <h2 className="font-display text-lg text-white/90 mb-4 flex items-center gap-2">
        <span className="status-dot live" style={{ color: '#d4af37' }} />
        Task Queue
      </h2>
      <div className="space-y-2 max-h-[420px] overflow-y-auto">
        {tasks.length === 0 && (
          <p className="text-white/30 text-sm font-mono py-8 text-center">
            Queue empty — agents idle
          </p>
        )}
        {tasks.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-lg border border-ink-border/60 px-3 py-2.5 hover:border-gold/20 transition-colors"
          >
            <div className="min-w-0">
              <div className="text-sm text-white/80 truncate font-mono">
                {t.task_type}
              </div>
              <div className="text-xs text-white/40">{t.agent_name}</div>
            </div>
            <span
              className={`shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded border font-mono ${
                STATUS_STYLES[t.status] || 'text-white/40 border-white/10'
              }`}
            >
              {t.status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
