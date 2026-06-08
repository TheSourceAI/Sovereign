import { NextRequest, NextResponse } from 'next/server';
import { handleVapiEvent } from '../../../../../voice/webhook.js';

// POST /api/vapi — Vapi posts all call events here.
// Set this URL as your assistant's server.url in the Vapi dashboard.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await handleVapiEvent(body);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[vapi webhook] error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
