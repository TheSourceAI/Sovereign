import { supabase } from '../config/clients.js';

/**
 * Vapi assistant configuration.
 *
 * Vapi handles speech-to-text, the LLM turn, and text-to-speech. We point its
 * model at Claude and give it "tools" (functions) that hit our Supabase data,
 * so the voice assistant can look up prospects, check fabric, and book fittings
 * mid-conversation.
 *
 * Push this config to Vapi via their API or dashboard. The `server.url` is your
 * deployed webhook (see voice/webhook.js).
 */
export const assistantConfig = {
  name: 'Brain Voice',
  // Vapi supports Anthropic as a model provider
  model: {
    provider: 'anthropic',
    model: 'claude-sonnet-4-6',
    temperature: 0.6,
    systemPrompt: `You are the voice assistant for Johnny Berry Jr.'s businesses:
custom suits (mobile fittings), Source AI (web design + AI for local businesses),
and personal brand consulting.

Your job on a call:
- Be warm, sharp, and concise. Sound like a competent human assistant, not a bot.
- Figure out why they're calling and route the conversation.
- For suit inquiries: learn their style/occasion, mention relevant fabric, offer a mobile fitting.
- For Source AI: understand their business, surface the right service, collect contact info.
- Always use your tools to look up real data before answering specifics.
- Never quote prices you're unsure of — offer to have Johnny follow up.
- Before ending, confirm next steps out loud.

Keep responses short — this is a phone call, not an essay.`,
  },
  voice: {
    provider: '11labs',
    voiceId: 'your_chosen_voice_id',
  },
  firstMessage: "Hey, thanks for calling — this is Johnny's assistant. How can I help you today?",
  // Webhook where Vapi sends events + tool calls
  server: {
    url: process.env.VAPI_WEBHOOK_URL,
  },
  // Tools the assistant can call mid-conversation
  tools: [
    {
      type: 'function',
      function: {
        name: 'lookup_caller',
        description: 'Look up a caller by phone number to see their history and preferences.',
        parameters: {
          type: 'object',
          properties: { phone: { type: 'string', description: 'Caller phone number' } },
          required: ['phone'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'check_fabric',
        description: 'Check available fabric inventory, optionally filtered by style.',
        parameters: {
          type: 'object',
          properties: { style: { type: 'string', description: 'Style or occasion, e.g. business, wedding' } },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'book_fitting',
        description: 'Capture a request for a mobile fitting. Creates a pending appointment.',
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            location: { type: 'string' },
            preferred_times: { type: 'string', description: 'When they are available' },
          },
          required: ['name', 'phone'],
        },
      },
    },
  ],
};

/**
 * Tool handlers — invoked from the webhook when Vapi calls a function.
 * Each returns a plain object Vapi will read back to the caller.
 */
export const toolHandlers = {
  async lookup_caller({ phone }) {
    const { data } = await supabase
      .from('suit_prospects')
      .select('prospect_name, style_profile, status, last_contact')
      .eq('phone', phone)
      .maybeSingle();
    if (!data) return { found: false, message: 'No record — treat as a new lead.' };
    return { found: true, ...data };
  },

  async check_fabric({ style }) {
    let query = supabase.from('fabric_inventory').select('fabric_name, color, ideal_for_styles').gt('units_available', 0);
    const { data } = await query;
    const matches = style
      ? (data || []).filter((f) => (f.ideal_for_styles || []).some((s) => s.toLowerCase().includes(style.toLowerCase())))
      : data || [];
    return { available: matches.slice(0, 5) };
  },

  async book_fitting({ name, phone, location, preferred_times }) {
    await supabase.from('suit_appointments').insert({
      prospect_name: name,
      location: location || 'TBD',
      available_times: preferred_times ? [preferred_times] : [],
      status: 'pending_confirmation',
      created_at: new Date(),
    });
    return { booked: true, message: `Got it — fitting request logged for ${name}. Johnny will confirm the time.` };
  },
};
