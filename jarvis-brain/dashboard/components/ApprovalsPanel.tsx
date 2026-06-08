'use client';

import { useEffect, useState } from 'react';
import { supabase, subscribeTable } from '../lib/supabase';

type Approval = {
  id: number;
  agent_name: string;
  task_type: string;
  payload: any;
  created_at: string;
};

export default function ApprovalsPanel() {
  const [items, setItems] = useState<Approval[]>([]);

  async function load() {
    const { data } = await supabase
      .from('task_queue')
      .select('*')
      .eq('status', 'pending_approval')
      .order('created_at', { ascending: false });
    setItems(data || []);
  }

  useEffect(() => {
    load();
    return subscribeTable('task_queue', load);
  }, []);

  async function decide(id: number, approve: boolean) {
    await supabase
      .from('task_queue')
      .update({
        status: approve ? 'queued' : 'rejected',
        approved_at: approve ? new Date().toISOString() : null,
        completed_at: approve ? null : new Date().toISOString(),
      })
      .eq('id', id);
    load();
  }

  function preview(payload: any): string {
    if (!payload) return '';
    return (
      payload.message ||
      payload.announcement ||
      payload.request ||
      JSON.stringify(payload).slice(0, 140)
    );
  }

  return (
    <div className="rounded-xl border border-status-blocked/30 bg-status-blocked/[0.04] p-5 backdrop-blur">
      <h2 className="font-display text-lg text-status-blocked mb-1">
        Awaiting Your Approval
      </h2>
      <p className="text-xs text-white/40 mb-4 font-mono">
        Side-effectful actions (messages, posts) wait here.
      </p>

      <div className="space-y-3 max-h-[360px] overflow-y-auto">
        {items.length === 0 && (
          <p className="text-white/30 text-sm font-mono py-6 text-center">
            Nothing pending — all clear
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-ink-border bg-ink/40 p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-gold-dim uppercase tracking-wider">
                {item.agent_name} · {item.task_type}
              </span>
            </div>
            <p className="text-sm text-white/70 mb-3 leading-relaxed">
              {preview(item.payload)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => decide(item.id, true)}
                className="flex-1 rounded-md bg-gold/90 hover:bg-gold text-ink text-xs font-semibold py-2 transition-colors"
              >
                Approve & Send
              </button>
              <button
                onClick={() => decide(item.id, false)}
                className="rounded-md border border-ink-border hover:border-status-error/50 text-white/60 hover:text-status-error text-xs px-4 py-2 transition-colors"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
