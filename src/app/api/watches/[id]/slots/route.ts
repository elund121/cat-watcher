export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { date, slot } = await request.json();
  const slots = slot === "both" ? ["morning", "evening"] : [slot];
  for (const s of slots) {
    db.prepare(`INSERT OR REPLACE INTO watch_slots (id, watch_request_id, date, slot, watcher_id)
      VALUES (?, ?, ?, ?, ?)`)
      .run(uuidv4(), params.id, date, s, session.user.id);
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { date, slot } = await request.json();
  const slots = slot === "both" ? ["morning", "evening"] : [slot];
  for (const s of slots) {
    if (session.user.isSuperuser) {
      db.prepare("DELETE FROM watch_slots WHERE watch_request_id = ? AND date = ? AND slot = ?")
        .run(params.id, date, s);
    } else {
      db.prepare("DELETE FROM watch_slots WHERE watch_request_id = ? AND date = ? AND slot = ? AND watcher_id = ?")
        .run(params.id, date, s, session.user.id);
    }
  }
  return NextResponse.json({ ok: true });
}
