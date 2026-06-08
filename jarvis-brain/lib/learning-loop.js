import { anthropic, supabase, MODELS } from '../config/clients.js';

/**
 * The Learning Loop (Phase 4).
 *
 * Each task execution already drops a raw "lesson" into agent_learning.
 * Raw lessons are noisy. This loop runs periodically (weekly is plenty),
 * clusters the recent lessons per agent + task_type, and distills them into
 * a small set of refined, durable guidance lines stored in agent_playbook.
 *
 * Agents read their playbook in doWork() to steadily get better at the work
 * that actually happens — without anyone editing prompts by hand.
 */

export async function distillPlaybook(agentName) {
  // Pull recent raw lessons grouped loosely by task_type
  const { data: lessons } = await supabase
    .from('agent_learning')
    .select('task_type, lesson, created_at')
    .eq('agent_name', agentName)
    .order('created_at', { ascending: false })
    .limit(80);

  if (!lessons || lessons.length === 0) {
    return { agent: agentName, updated: 0, note: 'no lessons yet' };
  }

  // Group by task_type
  const byType = {};
  for (const l of lessons) {
    (byType[l.task_type] ||= []).push(l.lesson);
  }

  let updated = 0;

  for (const [taskType, items] of Object.entries(byType)) {
    // Distill many raw lessons into 3-6 durable guidance lines (high stakes -> Opus)
    const response = await anthropic.messages.create({
      model: MODELS.REASONING,
      max_tokens: 800,
      system: `You maintain the playbook for the "${agentName}" agent, task type "${taskType}".
Given a list of raw lessons (some redundant, some contradictory, some one-off),
distill them into 3-6 durable, specific, non-obvious guidance lines that would
measurably improve future work. Drop noise. Resolve contradictions toward what
works most consistently. Return ONLY a JSON array of strings.`,
      messages: [{ role: 'user', content: `Raw lessons:\n- ${items.join('\n- ')}` }],
    });

    const clean = response.content[0].text.replace(/```json|```/g, '').trim();
    let guidance;
    try {
      guidance = JSON.parse(clean);
    } catch {
      continue;
    }

    // Upsert the playbook entry for this agent+task_type
    await supabase.from('agent_playbook').upsert(
      {
        agent_name: agentName,
        task_type: taskType,
        guidance,
        lesson_count: items.length,
        updated_at: new Date(),
      },
      { onConflict: 'agent_name,task_type' }
    );
    updated += 1;
  }

  return { agent: agentName, updated };
}

/** Distill playbooks for every agent. Run on a weekly schedule. */
export async function runLearningLoop(agentNames = ['suit_business', 'source_ai', 'content', 'data']) {
  console.log('\n📚 Learning loop running...');
  const results = [];
  for (const name of agentNames) {
    results.push(await distillPlaybook(name));
  }
  console.log('📚 Learning loop complete:', results);
  return results;
}

/** Helper agents can call to load their distilled guidance for a task type. */
export async function loadPlaybook(agentName, taskType) {
  const { data } = await supabase
    .from('agent_playbook')
    .select('guidance')
    .eq('agent_name', agentName)
    .eq('task_type', taskType)
    .maybeSingle();
  return data?.guidance || [];
}
