import { BaseAgent } from '../lib/base-agent.js';
import { supabase } from '../config/clients.js';

/**
 * DataAgent — cross-vertical analytics and reporting.
 * Stakes: standard, bumps to high for strategic synthesis.
 */
export class DataAgent extends BaseAgent {
  constructor() {
    super('data', { stakes: 'standard', requiresApproval: false });
  }

  async findWork() {
    const tasks = [];
    const now = new Date();

    // Daily heartbeat report (every run, but cheap)
    tasks.push({ task_type: 'daily_pulse', side_effect: false });

    // Weekly deep report on Sundays
    if (now.getDay() === 0) {
      tasks.push({ task_type: 'weekly_report', side_effect: false });
    }

    return tasks;
  }

  async doWork(task) {
    if (task.task_type === 'daily_pulse') {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [executions, drafts, scripts] = await Promise.all([
        supabase.from('task_executions').select('agent_name,outcome').gte('executed_at', since),
        supabase.from('suit_outreach_drafts').select('id').gte('created_at', since),
        supabase.from('reel_scripts').select('id').gte('created_at', since),
      ]);

      const pulse = {
        executions_24h: executions.data?.length || 0,
        suit_drafts_24h: drafts.data?.length || 0,
        scripts_24h: scripts.data?.length || 0,
        failures_24h: (executions.data || []).filter((e) => e.outcome === 'failed').length,
        generated_at: new Date(),
      };

      await supabase.from('daily_pulse').insert(pulse);
      return pulse;
    }

    if (task.task_type === 'weekly_report') {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const [execs, suit, content, sourceai] = await Promise.all([
        supabase.from('task_executions').select('*').gte('executed_at', since),
        supabase.from('suit_appointments').select('*').gte('created_at', since),
        supabase.from('content_performance').select('*').gte('posted_at', since),
        supabase.from('source_ai_clients').select('*').gte('qualified_at', since),
      ]);

      const report = await this.think(
        `Write a concise weekly business report across three verticals
(Source AI, custom suits, content). Lead with an executive summary,
then key numbers per vertical, then the single highest-leverage action for next week.`,
        `Data:\nExecutions: ${execs.data?.length}\nSuit appts: ${JSON.stringify(suit.data)}\nContent: ${JSON.stringify(content.data)}\nNew qualified Source AI: ${JSON.stringify(sourceai.data)}`,
        { stakes: 'high', maxTokens: 2000 }
      );

      await supabase.from('business_reports').insert({
        date_range: '7days',
        narrative_report: report,
        generated_at: new Date(),
      });
      return { report_length: report.length };
    }

    return { note: 'unknown task type', task };
  }
}
