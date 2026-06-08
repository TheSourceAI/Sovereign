import { runAllAgents } from './lib/orchestrator.js';
import { runLearningLoop } from './lib/learning-loop.js';

/**
 * The heartbeat. Runs the whole brain on a loop.
 *
 * In production, prefer a real scheduler:
 *   - A cron job calling `node scheduler.js --once`
 *   - Supabase scheduled Edge Functions
 *   - A platform cron (Vercel Cron, Railway, Render)
 *
 * For local/dev, this setInterval loop is fine.
 */

const CYCLE_MINUTES = Number(process.env.CYCLE_MINUTES || 30);
const runOnce = process.argv.includes('--once');
const learnNow = process.argv.includes('--learn');

async function cycle() {
  try {
    await runAllAgents();
    // Run the learning loop once a week (Sundays), after the cycle
    if (new Date().getDay() === 0) {
      await runLearningLoop();
    }
  } catch (err) {
    console.error('Brain cycle crashed:', err);
  }
}

if (learnNow) {
  await runLearningLoop();
  process.exit(0);
} else if (runOnce) {
  await cycle();
  process.exit(0);
} else {
  console.log(`🧠 Brain online. Cycling every ${CYCLE_MINUTES} min.`);
  await cycle(); // run immediately on boot
  setInterval(cycle, CYCLE_MINUTES * 60 * 1000);
}
