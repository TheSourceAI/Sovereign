import { NextRequest, NextResponse } from 'next/server';
import { routeRequest } from '../../../../lib/orchestrator.js';

// POST /api/route  { request: string, source?: string }
// Routes a free-form command to the right agent and enqueues it.
export async function POST(req: NextRequest) {
  try {
    const { request, source } = await req.json();
    if (!request || typeof request !== 'string') {
      return NextResponse.json({ error: 'request is required' }, { status: 400 });
    }
    const routing = await routeRequest(request, source || 'dashboard');
    return NextResponse.json(routing);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
