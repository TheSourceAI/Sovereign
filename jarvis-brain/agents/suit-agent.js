import { BaseAgent } from '../lib/base-agent.js';
import { supabase } from '../config/clients.js';
import { enqueue } from '../lib/task-queue.js';

/**
 * SuitAgent — custom suit sales.
 * Stakes: high (prospect psychology, negotiation timing) -> Opus by default.
 */
export class SuitAgent extends BaseAgent {
  constructor() {
    super('suit_business', { stakes: 'high', requiresApproval: true });
  }

  // FIND: what suit work needs doing right now?
  async findWork() {
    const tasks = [];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Prospects gone quiet -> re-engagement
    const { data: stale } = await supabase
      .from('suit_prospects')
      .select('*')
      .eq('status', 'qualified')
      .lt('last_contact', sevenDaysAgo);

    for (const prospect of stale || []) {
      tasks.push({
        task_type: 'reengage_prospect',
        side_effect: true, // sending a message -> needs approval
        prospect,
      });
    }

    // 2. New fabric arrivals -> notify prospects whose style matches
    const { data: newFabric } = await supabase
      .from('fabric_inventory')
      .select('*')
      .gt('arrival_date', sevenDaysAgo)
      .gt('units_available', 0);

    if (newFabric && newFabric.length > 0) {
      tasks.push({
        task_type: 'fabric_announcement',
        side_effect: true,
        fabrics: newFabric,
      });
    }

    return tasks;
  }

  // DO: execute a single suit task
  async doWork(task) {
    const lessons = await this.recentLessons(task.task_type);
    const lessonContext = lessons.length
      ? `\n\nLessons from past ${task.task_type} work:\n- ${lessons.join('\n- ')}`
      : '';

    if (task.task_type === 'reengage_prospect') {
      const p = task.prospect;
      const message = await this.think(
        `You write warm, low-pressure re-engagement texts for a custom suit business.
Anchor to a concrete hook (style they liked, a referral, an occasion). 2-3 sentences.
Move toward a phone call, not a hard sell. No contracts mentioned.${lessonContext}`,
        `Prospect: ${JSON.stringify(p)}. Last contact: ${p.last_contact}.`
      );

      // Store the draft for the approval queue (BaseAgent already gated send)
      await supabase.from('suit_outreach_drafts').insert({
        prospects: [p.id],
        draft_messages: message,
        status: 'pending_review',
        created_at: new Date(),
      });
      return { prospect_id: p.id, message };
    }

    if (task.task_type === 'fabric_announcement') {
      const announcement = await this.think(
        `Write a short, exciting text announcing new fabric arrivals to suit clients.
Make it feel exclusive but warm. Mention the fabrics by name. End with a soft invite to see them.${lessonContext}`,
        `New fabrics: ${JSON.stringify(task.fabrics.map((f) => f.fabric_name))}`
      );
      return { announcement, fabric_count: task.fabrics.length };
    }

    return { note: 'unknown task type', task };
  }
}
