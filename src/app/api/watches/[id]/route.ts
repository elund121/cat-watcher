export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();

  if ("morning_watcher_id" in body) {
    db.prepare("UPDATE watch_requests SET morning_watcher_id = ? WHERE id = ?")
      .run(body.morning_watcher_id ?? null, params.id);
  }
  if ("evening_watcher_id" in body) {
    db.prepare("UPDATE watch_requests SET evening_watcher_id = ? WHERE id = ?")
      .run(body.evening_watcher_id ?? null, params.id);
  }

  if ("start_date" in body || "end_date" in body || "notes" in body) {
    const watch = db.prepare("SELECT requester_id FROM watch_requests WHERE id = ?").get(params.id) as { requester_id: string } | undefined;
    if (!watch) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (watch.requester_id !== session.user.id && !session.user.isSuperuser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    db.prepare("UPDATE watch_requests SET start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date), notes = ? WHERE id = ?")
      .run(body.start_date ?? null, body.end_date ?? null, body.notes ?? null, params.id);
  }

  const updated = db.prepare(`
    SELECT wr.*, h.name AS household_name,
      r.name AS requester_name, r.color AS requester_color, r.avatar AS requester_avatar,
      mw.name AS morning_watcher_name, mw.color AS morning_watcher_color, mw.avatar AS morning_watcher_avatar,
      ew.name AS evening_watcher_name, ew.color AS evening_watcher_color, ew.avatar AS evening_watcher_avatar
    FROM watch_requests wr
    JOIN households h ON h.id = wr.household_id
    JOIN users r ON r.id = wr.requester_id
    LEFT JOIN users mw ON mw.id = wr.morning_watcher_id
    LEFT JOIN users ew ON ew.id = wr.evening_watcher_id
    WHERE wr.id = ?
  `).get(params.id);

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const watch = db.prepare("SELECT requester_id FROM watch_requests WHERE id = ?").get(params.id) as { requester_id: string } | undefined;
  if (!watch) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (watch.requester_id !== session.user.id && !session.user.isSuperuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  db.prepare("DELETE FROM watch_requests WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
