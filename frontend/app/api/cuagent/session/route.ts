export const runtime = "nodejs";
import type { NextRequest } from "next/server";

type Session = {
  id: string;
  previous_response_id?: string;
  last_call_id?: string;
};

const store = new Map<string, Session>();

export async function POST(req: NextRequest) {
  const { id, reset }: { id?: string; reset?: boolean } = await req.json();
  if (reset && id) {
    store.delete(id);
    return Response.json({ ok: true });
  }
  const sid = id ?? Math.random().toString(36).slice(2);
  if (!store.has(sid)) store.set(sid, { id: sid });
  return Response.json(store.get(sid));
}

