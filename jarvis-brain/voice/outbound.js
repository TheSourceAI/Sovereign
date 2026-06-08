import { anthropic, supabase, MODELS } from '../config/clients.js';

/**
 * Outbound calling — the system dials prospects.
 *
 * Requires VAPI_API_KEY and a VAPI_PHONE_NUMBER_ID (your provisioned number).
 * We generate a per-call opening tailored to the prospect, then ask Vapi to
 * place the call using our assistant.
 */
const VAPI_BASE = 'https://api.vapi.ai';

async function vapiPost(path, payload) {
  const res = await fetch(`${VAPI_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VAPI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vapi ${path} failed: ${res.status} ${text}`);
  }
  return res.json();
}

/** Place a single outbound call to one prospect with a tailored opener. */
export async function callProspect(prospect, goal) {
  // Generate a natural, specific opening line
  const opener = await anthropic.messages.create({
    model: MODELS.STANDARD,
    max_tokens: 200,
    system: `Write a single warm, natural phone opening line (1-2 sentences) for an
assistant calling a custom-suit prospect on Johnny's behalf. Reference something
specific. No hard sell. End with a light question.`,
    messages: [{ role: 'user', content: `Prospect: ${JSON.stringify(prospect)}. Goal: ${goal}` }],
  });

  const firstMessage = opener.content[0].text.trim();

  const call = await vapiPost('/call', {
    assistantId: process.env.VAPI_ASSISTANT_ID,
    phoneNumberId: process.env.VAPI_PHONE_NUMBER_ID,
    customer: { number: prospect.phone },
    assistantOverrides: { firstMessage },
  });

  // Log the outbound attempt
  await supabase.from('vapi_outbound_calls').insert({
    prospect_id: prospect.id,
    prospect_phone: prospect.phone,
    goal,
    first_message: firstMessage,
    vapi_call_id: call.id,
    status: 'initiated',
    created_at: new Date(),
  });

  return call;
}

/** Batch: call the top N hot prospects who haven't been reached recently. */
export async function callHotProspects(limit = 5) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: prospects } = await supabase
    .from('suit_prospects')
    .select('*')
    .eq('tier', 'hot')
    .lt('last_contact', sevenDaysAgo)
    .limit(limit);

  const results = [];
  for (const p of prospects || []) {
    try {
      const call = await callProspect(p, 'Re-engage and offer a mobile fitting');
      results.push({ prospect: p.prospect_name, call_id: call.id });
    } catch (err) {
      results.push({ prospect: p.prospect_name, error: err.message });
    }
  }
  return results;
}
