# BRAIN — Autonomous Business Operating System

Your Jarvis. A self-running system that finds work, does it, logs what it learns, and gets better over time — across custom suits, Source AI, and content. Voice-enabled, dashboard-controlled, learning-driven.

```
   VAPI VOICE  ─┐
   DASHBOARD   ─┼──►  ORCHESTRATOR  ──►  AGENTS (find → do → log)  ──►  SUPABASE
   SCHEDULER   ─┘                              ▲                            │
                                               └──── LEARNING LOOP ◄────────┘
```

---

## The Four Phases (all built)

### Phase 1 — Agent Foundation (Find → Do → Log)
Every agent extends `BaseAgent` and implements two methods:
- `findWork()` — scans Supabase for what needs doing, returns tasks
- `doWork(task)` — executes one task using Claude + your data

`BaseAgent` handles the rest: status tracking, the approval gate for anything
that sends a message, logging each execution, and extracting a lesson from it.

Files: `lib/base-agent.js`, `lib/task-queue.js`, `lib/orchestrator.js`,
`agents/*.js`, `scheduler.js`, `config/schema-phase1.sql`

### Phase 2 — Dashboard (Next.js + Tailwind)
A dark/gold cinematic command center with live Supabase subscriptions:
- Pulse strip (24h activity)
- Command input (route a free-form request to the right agent)
- Agent status grid (live)
- Task queue (live)
- Approvals panel (release or reject side-effectful actions)

Files: `dashboard/` (App Router), `dashboard-preview.html` (open this now to see it)

### Phase 3 — Voice Layer (Vapi)
- Inbound: callers reach an assistant that looks up their history, checks fabric,
  and books fittings mid-call via Supabase-backed tools
- Outbound: agents call hot prospects with tailored openers
- Every call is transcribed, stored, and routed back into the task queue

Files: `voice/assistant-config.js`, `voice/webhook.js`, `voice/outbound.js`,
`dashboard/app/api/vapi/route.ts`, `config/schema-phase3.sql`

### Phase 4 — Learning Loop
Raw lessons from every execution get distilled weekly into a compact `agent_playbook`.
Agents read their playbook in `doWork()`, so the system improves at the work that
actually happens — no manual prompt editing.

Files: `lib/learning-loop.js`, `config/schema-phase4.sql`

---

## Setup

### 1. Database
In your Supabase SQL editor, run in order:
1. The original `schema.sql` (base tables)
2. `config/schema-phase1.sql`
3. `config/schema-phase3.sql`
4. `config/schema-phase4.sql`

### 2. Backend (agents)
```bash
cd jarvis-brain
npm install
cp .env.template .env   # fill in ANTHROPIC_API_KEY + SUPABASE_* (service key)
npm run cycle           # run one cycle to test
npm start               # run continuously (every CYCLE_MINUTES)
npm run learn           # force the learning loop now
```

### 3. Dashboard
```bash
cd jarvis-brain/dashboard
npx create-next-app@latest . --ts --tailwind --app   # if starting fresh, then drop these files in
npm install @supabase/supabase-js
# add NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
npm run dev
```
The dashboard's `/api/route` and `/api/vapi` routes import the backend `lib/` and
`voice/` modules — keep the dashboard inside the project so the relative imports resolve,
or publish the backend as a small internal package.

### 4. Voice
1. Create a Vapi account, provision a phone number
2. Push `voice/assistant-config.js` to Vapi (set `server.url` to your deployed `/api/vapi`)
3. Add `VAPI_*` keys to `.env`
4. Inbound works immediately; trigger outbound with `callHotProspects()`

---

## Model Strategy (cost vs quality)
Set per agent in `config/clients.js`:
- High stakes (suit, Source AI, strategy, learning distillation) → Opus
- Standard (content generation, reports) → Sonnet
- Cheap/fast (routing, reflection) → Haiku

Each agent can bump a single task up a tier (e.g. content strategy uses Opus
while content generation stays on Sonnet).

---

## How the Approval Gate Works
Anything with `side_effect: true` (sending a text, posting, calling) is NOT executed
automatically. It lands in the Approvals panel as `pending_approval`. You approve → it
moves to `queued` → an agent executes it on the next cycle. Analysis and drafting run
freely; only outbound actions wait for you.

---

## Adding a New Connector (the pattern that scales)
1. `agents/new-agent.js`:
   ```js
   import { BaseAgent } from '../lib/base-agent.js';
   export class NewAgent extends BaseAgent {
     constructor() { super('new_agent', { stakes: 'standard' }); }
     async findWork() { /* scan, return tasks */ }
     async doWork(task) { /* execute one */ }
   }
   ```
2. Register it in `lib/orchestrator.js` `registry`
3. Add any tables + `ALTER PUBLICATION supabase_realtime ADD TABLE ...` for live dashboard
4. Add its label to the dashboard's `AGENT_LABELS`

That's it — status, logging, learning, approvals, and dashboard wiring come for free.

---

## File Map
```
jarvis-brain/
├── config/
│   ├── clients.js            shared Claude + Supabase clients, model tiers
│   ├── schema-phase1.sql     queue, status, executions, learning
│   ├── schema-phase3.sql     vapi tables
│   └── schema-phase4.sql     playbook
├── lib/
│   ├── base-agent.js         the Find→Do→Log spine
│   ├── task-queue.js         shared work queue
│   ├── orchestrator.js       registry + request routing
│   └── learning-loop.js      lesson distillation
├── agents/
│   ├── suit-agent.js
│   ├── source-ai-agent.js
│   ├── content-agent.js
│   └── data-agent.js
├── voice/
│   ├── assistant-config.js   vapi assistant + tool handlers
│   ├── webhook.js            inbound events + routing
│   └── outbound.js           agents call prospects
├── dashboard/                Next.js + Tailwind command center
│   ├── app/ (layout, page, api/route, api/vapi)
│   ├── components/ (5 live panels)
│   ├── lib/supabase.ts
│   └── tailwind.config.js
├── dashboard-preview.html    open in a browser to see the UI now
├── scheduler.js              the heartbeat
└── .env.template
```
