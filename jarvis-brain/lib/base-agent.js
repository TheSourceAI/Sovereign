import { anthropic, supabase, modelFor } from '../config/clients.js';

/**
 * BaseAgent — the spine of the whole system.
 *
 * Every specialized agent (suit, source AI, content, data) extends this class
 * and implements three methods:
 *
 *   findWork()      -> returns an array of task objects this agent should do
 *   doWork(task)    -> executes a single task, returns a result
 *   (logWork is handled here automatically)
 *
 * The run loop ties them together: find -> do each -> log each -> learn.
 */
export class BaseAgent {
  constructor(name, { stakes = 'standard', requiresApproval = false } = {}) {
    this.name = name;
    this.stakes = stakes; // 'high' | 'standard' | 'low' -> picks model
    this.requiresApproval = requiresApproval; // gate side-effects behind human review
  }

  // ---- Override in subclasses -------------------------------------------

  /** Return tasks this agent should work on right now. */
  async findWork() {
    throw new Error(`${this.name}: findWork() not implemented`);
  }

  /** Execute one task. Return the result (any serializable value). */
  async doWork(task) {
    throw new Error(`${this.name}: doWork() not implemented`);
  }

  // ---- Provided by BaseAgent --------------------------------------------

  /** Helper: call Claude with this agent's default model tier. */
  async think(systemPrompt, userContent, { maxTokens = 1500, stakes } = {}) {
    const response = await anthropic.messages.create({
      model: modelFor(stakes || this.stakes),
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
    return response.content[0].text;
  }

  /** Helper: call Claude and parse JSON out of the response safely. */
  async thinkJSON(systemPrompt, userContent, opts = {}) {
    const raw = await this.think(
      systemPrompt + '\n\nRespond with ONLY valid JSON, no markdown fences, no preamble.',
      userContent,
      opts
    );
    const clean = raw.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch (err) {
      console.error(`[${this.name}] JSON parse failed:`, clean.slice(0, 200));
      return null;
    }
  }

  /** Mark this agent's status so the dashboard can see it live. */
  async setStatus(status, detail = null) {
    await supabase.from('agent_status').upsert(
      {
        agent_name: this.name,
        status, // 'idle' | 'finding' | 'working' | 'blocked' | 'error'
        detail,
        updated_at: new Date(),
      },
      { onConflict: 'agent_name' }
    );
  }

  /** LOG step — record what happened and extract a lesson for next time. */
  async logWork(task, result, outcome = 'completed') {
    // 1. Store the raw execution
    const { data: execution } = await supabase
      .from('task_executions')
      .insert({
        agent_name: this.name,
        task_type: task.task_type,
        task_payload: task,
        result: typeof result === 'string' ? result : JSON.stringify(result),
        outcome,
        executed_at: new Date(),
      })
      .select()
      .single();

    // 2. Extract a lesson (cheap model — this is reflection, not strategy)
    try {
      const lesson = await this.think(
        `You are the reflection module for the ${this.name} agent.
Given a task and its result, extract ONE concise, actionable lesson for doing this kind of task better next time.
If there's nothing useful to learn, respond with exactly "NONE".`,
        `Task: ${JSON.stringify(task)}\nResult: ${String(result).slice(0, 1000)}\nOutcome: ${outcome}`,
        { stakes: 'low', maxTokens: 300 }
      );

      if (lesson && lesson.trim() !== 'NONE') {
        await supabase.from('agent_learning').insert({
          agent_name: this.name,
          task_type: task.task_type,
          lesson: lesson.trim(),
          execution_id: execution?.id,
          created_at: new Date(),
        });
      }
    } catch (err) {
      console.error(`[${this.name}] logWork reflection failed:`, err.message);
    }

    return execution;
  }

  /**
   * Pull guidance for doWork. Prefers the distilled playbook (Phase 4 learning
   * loop); falls back to the most recent raw lessons if no playbook exists yet.
   */
  async recentLessons(taskType, limit = 5) {
    // 1. Distilled playbook first — this is the refined, durable guidance
    const { data: playbook } = await supabase
      .from('agent_playbook')
      .select('guidance')
      .eq('agent_name', this.name)
      .eq('task_type', taskType)
      .maybeSingle();

    if (playbook?.guidance?.length) {
      return playbook.guidance;
    }

    // 2. Fallback: raw recent lessons (used before the loop has run)
    const { data } = await supabase
      .from('agent_learning')
      .select('lesson')
      .eq('agent_name', this.name)
      .eq('task_type', taskType)
      .order('created_at', { ascending: false })
      .limit(limit);
    return (data || []).map((r) => r.lesson);
  }

  // ---- The loop ---------------------------------------------------------

  /**
   * Run one full cycle: find work, do each task, log each result.
   * Tasks flagged requiresApproval are queued for review instead of executed.
   */
  async run() {
    const cycleStart = Date.now();
    console.log(`\n[${this.name}] ▶ cycle start`);

    try {
      await this.setStatus('finding');
      const tasks = await this.findWork();
      console.log(`[${this.name}] found ${tasks.length} task(s)`);

      const results = [];

      for (const task of tasks) {
        // Approval gate: queue side-effectful work for the dashboard to release
        if (this.requiresApproval && task.side_effect) {
          await supabase.from('task_queue').insert({
            agent_name: this.name,
            task_type: task.task_type,
            payload: task,
            status: 'pending_approval',
            created_at: new Date(),
          });
          console.log(`[${this.name}] queued for approval: ${task.task_type}`);
          continue;
        }

        await this.setStatus('working', task.task_type);
        try {
          const result = await this.doWork(task);
          await this.logWork(task, result, 'completed');
          results.push({ task, result, outcome: 'completed' });
        } catch (err) {
          console.error(`[${this.name}] task failed:`, err.message);
          await this.logWork(task, err.message, 'failed');
          results.push({ task, error: err.message, outcome: 'failed' });
        }
      }

      await this.setStatus('idle');
      const elapsed = ((Date.now() - cycleStart) / 1000).toFixed(1);
      console.log(`[${this.name}] ✔ cycle done in ${elapsed}s — ${results.length} processed`);
      return results;
    } catch (err) {
      console.error(`[${this.name}] cycle error:`, err.message);
      await this.setStatus('error', err.message);
      return [];
    }
  }
}
