import { supabase } from '../config/clients.js';
import { toolHandlers } from './assistant-config.js';
import { routeRequest } from '../lib/orchestrator.js';

/**
 * Core webhook logic, framework-agnostic.
 * Wire it to Express, a Next.js route handler, or any HTTP server.
 *
 * Vapi sends several message types. We handle:
 *   - tool-calls          -> run our Supabase-backed handlers, return results
 *   - end-of-call-report  -> store transcript, route any follow-up into the queue
 */
export async function handleVapiEvent(body) {
  const message = body?.message;
  if (!message) return { ok: true };

  switch (message.type) {
    case 'tool-calls':
      return handleToolCalls(message);

    case 'end-of-call-report':
      return handleEndOfCall(message);

    case 'status-update':
      // optional: track call status live
      return { ok: true };

    default:
      return { ok: true };
  }
}

async function handleToolCalls(message) {
  const results = [];
  for (const call of message.toolCalls || message.toolCallList || []) {
    const name = call.function?.name || call.name;
    const args = call.function?.arguments || call.arguments || {};
    const parsed = typeof args === 'string' ? JSON.parse(args) : args;

    const handler = toolHandlers[name];
    if (!handler) {
      results.push({ toolCallId: call.id, result: JSON.stringify({ error: `unknown tool ${name}` }) });
      continue;
    }
    try {
      const out = await handler(parsed);
      results.push({ toolCallId: call.id, result: JSON.stringify(out) });
    } catch (err) {
      results.push({ toolCallId: call.id, result: JSON.stringify({ error: err.message }) });
    }
  }
  // Vapi expects { results: [{ toolCallId, result }] }
  return { results };
}

async function handleEndOfCall(message) {
  const call = message.call || {};
  const phone = call.customer?.number || message.phoneNumber || 'unknown';
  const transcript = message.transcript || message.artifact?.transcript || '';
  const summary = message.summary || message.analysis?.summary || '';

  // 1. Store the conversation
  await supabase.from('vapi_conversations').insert({
    caller_phone: phone,
    transcript,
    summary,
    call_duration: call.durationSeconds || null,
    ended_reason: message.endedReason || null,
    timestamp: new Date(),
  });

  // 2. Decide if this call needs follow-up work, and route it
  //    (the summary is enough signal; routeRequest picks the agent)
  if (summary) {
    try {
      await routeRequest(
        `Voice call from ${phone}. Summary: ${summary}. Determine and queue any needed follow-up.`,
        'voice'
      );
    } catch (err) {
      console.error('[vapi] routing follow-up failed:', err.message);
    }
  }

  return { ok: true };
}
