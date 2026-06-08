import { BaseAgent } from '../lib/base-agent.js';
import { supabase } from '../config/clients.js';

/**
 * ContentAgent — Instagram/TikTok for the Johnny Berry Jr. personal brand.
 * Stakes: standard (Sonnet) for generation; bumps to high for strategy.
 */
export class ContentAgent extends BaseAgent {
  constructor() {
    super('content', { stakes: 'standard', requiresApproval: false });
  }

  async findWork() {
    const tasks = [];

    // 1. Keep a buffer of ready-to-shoot scripts. If fewer than 5, generate more.
    const { count } = await supabase
      .from('reel_scripts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ready_for_shoot');

    if ((count || 0) < 5) {
      tasks.push({
        task_type: 'replenish_scripts',
        side_effect: false,
        needed: 5 - (count || 0),
      });
    }

    // 2. Weekly: analyze the engagement→follower conversion gap (Mondays)
    if (new Date().getDay() === 1) {
      tasks.push({ task_type: 'analyze_conversion_gap', side_effect: false });
    }

    return tasks;
  }

  async doWork(task) {
    const lessons = await this.recentLessons(task.task_type);
    const lessonContext = lessons.length ? `\n\nWhat's worked before:\n- ${lessons.join('\n- ')}` : '';

    if (task.task_type === 'replenish_scripts') {
      const ideas = await this.thinkJSON(
        `Generate ${task.needed} talking-head Reel scripts for Johnny Berry Jr.
Themes: business systems, scaling, fitness, entrepreneurship, personal brand.
Each: hook in first 3 seconds, value, soft CTA. ~70 words for 30s.
Return array: [{ topic, angle, script }].${lessonContext}`,
        `Generate ${task.needed} fresh, non-repetitive scripts.`
      );

      const rows = (ideas || []).map((i) => ({
        topic: i.topic,
        angle: i.angle,
        duration: 30,
        script: i.script,
        status: 'ready_for_shoot',
        created_at: new Date(),
      }));
      if (rows.length) await supabase.from('reel_scripts').insert(rows);
      return { scripts_added: rows.length };
    }

    if (task.task_type === 'analyze_conversion_gap') {
      const { data: metrics } = await supabase
        .from('content_performance')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(30);

      const analysis = await this.thinkJSON(
        `Engagement is strong but follower growth lags. Diagnose why.
Return: { root_causes:[], recommendations:[], experiments:[] }.`,
        `Last 30 posts: ${JSON.stringify(metrics)}`,
        { stakes: 'high', maxTokens: 1500 } // strategy -> bump to Opus
      );

      await supabase.from('conversion_gap_analysis').insert({
        analysis,
        analyzed_at: new Date(),
      });
      return analysis;
    }

    return { note: 'unknown task type', task };
  }
}
