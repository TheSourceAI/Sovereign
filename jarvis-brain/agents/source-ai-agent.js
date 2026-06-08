import { BaseAgent } from '../lib/base-agent.js';
import { supabase } from '../config/clients.js';

/**
 * SourceAIAgent — web design + AI services.
 * Stakes: high (client fit, scoping, design judgment) -> Opus.
 */
export class SourceAIAgent extends BaseAgent {
  constructor() {
    super('source_ai', { stakes: 'high', requiresApproval: true });
  }

  async findWork() {
    const tasks = [];

    // 1. Unqualified prospects waiting to be scored
    const { data: newProspects } = await supabase
      .from('source_ai_clients')
      .select('*')
      .eq('status', 'prospect')
      .is('qualified_at', null);

    if (newProspects && newProspects.length > 0) {
      tasks.push({
        task_type: 'qualify_prospects',
        side_effect: false, // analysis only, safe to run
        prospects: newProspects,
      });
    }

    // 2. Hot prospects with no outreach drafted yet
    const { data: hot } = await supabase
      .from('source_ai_clients')
      .select('*')
      .eq('status', 'prospect')
      .eq('tier', 'hot')
      .is('outreach_drafted', null);

    for (const prospect of hot || []) {
      tasks.push({
        task_type: 'draft_outreach',
        side_effect: true,
        prospect,
      });
    }

    return tasks;
  }

  async doWork(task) {
    const lessons = await this.recentLessons(task.task_type);
    const lessonContext = lessons.length
      ? `\n\nPast lessons:\n- ${lessons.join('\n- ')}`
      : '';

    if (task.task_type === 'qualify_prospects') {
      const scored = await this.thinkJSON(
        `Score web-design/AI-service prospects 1-10 on: readiness, budget likelihood, urgency, fit.
Return an array: [{ id, scores:{readiness,budget,urgency,fit}, tier:"hot|warm|cold", reason }].${lessonContext}`,
        `Prospects: ${JSON.stringify(task.prospects)}`
      );

      // Persist scores
      for (const s of scored || []) {
        await supabase
          .from('source_ai_clients')
          .update({ tier: s.tier, scores: s.scores, qualified_at: new Date() })
          .eq('id', s.id);
      }
      return { qualified: scored?.length || 0 };
    }

    if (task.task_type === 'draft_outreach') {
      const p = task.prospect;
      const message = await this.think(
        `Write personalized cold outreach for Source AI (custom sites, AI chatbots, automation
for local small businesses; signature dark/gold cinematic aesthetic).
Reference their specific business. Soft CTA. Under 100 words.${lessonContext}`,
        `Prospect: ${JSON.stringify(p)}`
      );

      await supabase
        .from('source_ai_clients')
        .update({ outreach_drafted: message })
        .eq('id', p.id);
      return { prospect_id: p.id, message };
    }

    return { note: 'unknown task type', task };
  }
}
