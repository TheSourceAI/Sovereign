import AgentStatusPanel from '../components/AgentStatusPanel';
import TaskQueuePanel from '../components/TaskQueuePanel';
import ApprovalsPanel from '../components/ApprovalsPanel';
import CommandInput from '../components/CommandInput';
import PulseStrip from '../components/PulseStrip';

export default function Dashboard() {
  return (
    <main className="min-h-screen px-6 py-8 lg:px-12 lg:py-10 max-w-[1400px] mx-auto">
      {/* Header */}
      <header className="mb-10 flex items-end justify-between border-b border-ink-border pb-6">
        <div>
          <h1 className="font-display text-4xl lg:text-5xl text-gold-bright tracking-tight">
            BRAIN
          </h1>
          <p className="text-white/40 font-mono text-xs uppercase tracking-[0.3em] mt-2">
            Autonomous Business OS · Johnny Berry Jr.
          </p>
        </div>
        <div className="text-right">
          <span className="status-dot live" style={{ color: '#4ade80' }} />
          <span className="ml-2 text-xs font-mono text-status-ok uppercase tracking-wider">
            Online
          </span>
        </div>
      </header>

      {/* Pulse */}
      <section className="mb-8">
        <PulseStrip />
      </section>

      {/* Command */}
      <section className="mb-8">
        <CommandInput />
      </section>

      {/* Agent status */}
      <section className="mb-8">
        <h2 className="font-display text-sm uppercase tracking-[0.2em] text-white/50 mb-4">
          Agents
        </h2>
        <AgentStatusPanel />
      </section>

      {/* Queue + Approvals */}
      <section className="grid lg:grid-cols-2 gap-6">
        <TaskQueuePanel />
        <ApprovalsPanel />
      </section>

      <footer className="mt-12 pt-6 border-t border-ink-border text-center">
        <p className="text-white/20 font-mono text-[10px] uppercase tracking-widest">
          Powered by Claude · Supabase · Vapi
        </p>
      </footer>
    </main>
  );
}
