import { createClient } from '@supabase/supabase-js';

// Browser client — uses the ANON key (safe to expose). Backend agents use the
// service key; the dashboard only reads + approves through RLS-guarded policies.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Subscribe to live changes on a table. Returns an unsubscribe function.
 * Usage in a component:
 *   useEffect(() => subscribeTable('agent_status', () => refetch()), []);
 */
export function subscribeTable(
  table: string,
  onChange: (payload: any) => void
) {
  const channel = supabase
    .channel(`rt-${table}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table },
      (payload) => onChange(payload)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
