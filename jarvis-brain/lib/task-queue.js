import { supabase } from '../config/clients.js';

/**
 * Task Queue — the shared nervous system.
 *
 * Agents push work here. The dashboard reads/approves it. The voice layer
 * can inject tasks into it. Everything routes through one table so there's
 * a single source of truth for "what is the system doing / about to do".
 *
 * status lifecycle:
 *   queued -> claimed -> completed | failed
 *   pending_approval -> approved -> claimed -> completed
 *   pending_approval -> rejected
 */

export async function enqueue(agentName, taskType, payload, { priority = 5, needsApproval = false } = {}) {
  const { data, error } = await supabase
    .from('task_queue')
    .insert({
      agent_name: agentName,
      task_type: taskType,
      payload,
      priority,
      status: needsApproval ? 'pending_approval' : 'queued',
      created_at: new Date(),
    })
    .select()
    .single();

  if (error) throw new Error(`enqueue failed: ${error.message}`);
  return data;
}

/** Claim the highest-priority queued task for an agent (atomic-ish). */
export async function claimNext(agentName) {
  const { data: candidates } = await supabase
    .from('task_queue')
    .select('*')
    .eq('agent_name', agentName)
    .eq('status', 'queued')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);

  if (!candidates || candidates.length === 0) return null;

  const task = candidates[0];
  const { data: claimed } = await supabase
    .from('task_queue')
    .update({ status: 'claimed', claimed_at: new Date() })
    .eq('id', task.id)
    .eq('status', 'queued') // guard against double-claim
    .select()
    .single();

  return claimed;
}

export async function complete(taskId, result) {
  await supabase
    .from('task_queue')
    .update({
      status: 'completed',
      result: typeof result === 'string' ? result : JSON.stringify(result),
      completed_at: new Date(),
    })
    .eq('id', taskId);
}

export async function fail(taskId, errorMessage) {
  await supabase
    .from('task_queue')
    .update({ status: 'failed', result: errorMessage, completed_at: new Date() })
    .eq('id', taskId);
}

export async function approve(taskId) {
  await supabase
    .from('task_queue')
    .update({ status: 'queued', approved_at: new Date() })
    .eq('id', taskId)
    .eq('status', 'pending_approval');
}

export async function reject(taskId, reason = null) {
  await supabase
    .from('task_queue')
    .update({ status: 'rejected', result: reason, completed_at: new Date() })
    .eq('id', taskId);
}

export async function pendingApprovals() {
  const { data } = await supabase
    .from('task_queue')
    .select('*')
    .eq('status', 'pending_approval')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function queueSnapshot() {
  const { data } = await supabase
    .from('task_queue')
    .select('status')
    .in('status', ['queued', 'claimed', 'pending_approval']);

  const counts = { queued: 0, claimed: 0, pending_approval: 0 };
  (data || []).forEach((r) => {
    counts[r.status] = (counts[r.status] || 0) + 1;
  });
  return counts;
}
