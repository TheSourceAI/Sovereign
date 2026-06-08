import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// SHARED CLIENTS - Single source of truth for API connections
// ============================================================================

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Service-role key for backend agents (full DB access).
// Use the anon key only in the browser/dashboard.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { persistSession: false },
  }
);

// ============================================================================
// MODEL TIERS - Match model to task stakes (your cost/quality strategy)
// ============================================================================

export const MODELS = {
  // High-stakes reasoning: business decisions, strategy, prospect psychology
  REASONING: 'claude-opus-4-6',
  // Standard work: outreach generation, content, analysis
  STANDARD: 'claude-sonnet-4-6',
  // Cheap/fast: routing, formatting, classification, high-volume
  FAST: 'claude-haiku-4-5-20251001',
};

// Pick a model based on the task type an agent is performing
export function modelFor(taskStakes = 'standard') {
  switch (taskStakes) {
    case 'high':
      return MODELS.REASONING;
    case 'low':
      return MODELS.FAST;
    default:
      return MODELS.STANDARD;
  }
}
