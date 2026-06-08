import { anthropic, supabase, MODELS } from '../config/clients.js';
import { SuitAgent } from '../agents/suit-agent.js';
import { SourceAIAgent } from '../agents/source-ai-agent.js';
import { ContentAgent } from '../agents/content-agent.js';
import { DataAgent } from '../agents/data-agent.js';
import { enqueue } from '../lib/task-queue.js';

// Registry — add new agents here as you build connectors
export const registry = {
  suit_business: new SuitAgent(),
  source_ai: new SourceAIAgent(),
  content: new ContentAgent(),
  data: new DataAgent(),
};

/**
 * Run every agent's Find -> Do -> Log cycle once.
 * Call this on a schedule (cron / setInterval / serverless cron).
 */
export async function runAllAgents() {
  console.log('\n═══ BRAIN CYCLE ═══', new Date().toISOString());
  const results = {};
  for (const [name, agent] of Object.entries(registry)) {
    results[name] = await agent.run();
  }
  console.log('═══ CYCLE COMPLETE ═══\n');
  return results;
}

/** Run a single named agent's cycle. */
export async function runAgent(name) {
  const agent = registry[name];
  if (!agent) throw new Error(`No agent named ${name}`);
  return agent.run();
}

/**
 * Route a free-form request (from dashboard input or a Vapi voice call)
 * to the right agent and enqueue it as a task.
 */
export async function routeRequest(request, source = 'manual') {
  const routing = await routeWithClaude(request);

  await supabase.from('agent_executions').insert({
    request,
    routing,
    source,
    timestamp: new Date(),
  });

  // Enqueue for the chosen agent to pick up on its next cycle
  await enqueue(routing.agent, routing.task_type || 'adhoc', {
    task_type: routing.task_type || 'adhoc',
    request,
    source,
    side_effect: routing.side_effect ?? false,
  }, { priority: source === 'voice' ? 8 : 5, needsApproval: routing.side_effect ?? false });

  return routing;
}

async function routeWithClaude(request) {
  const response = await anthropic.messages.create({
    model: MODELS.FAST, // routing is cheap/fast
    max_tokens: 300,
    system: `Route a request to one agent. Agents:
- suit_business: custom suit sales, prospect outreach, fittings
- source_ai: web design, landing pages, client acquisition
- content: Instagram/TikTok scripts, captions, strategy
- data: analytics, reports, cross-business insights

Respond ONLY with JSON: { "agent": "...", "task_type": "...", "side_effect": true|false, "summary": "..." }
side_effect is true if the task would send a message, post publicly, or contact someone.`,
    messages: [{ role: 'user', content: request }],
  });

  const clean = response.content[0].text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}
