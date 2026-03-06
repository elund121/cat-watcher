export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { WatchRequest, WatchSlot, Cat } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const watches = db.prepare(`
    SELECT
      wr.*,
      h.name AS household_name,
      r.name AS requester_name, r.color AS requester_color, r.avatar AS requester_avatar
    FROM watch_requests wr
    JOIN households h ON h.id = wr.household_id
    JOIN users r ON r.id = wr.requester_id
    ORDER BY wr.start_date ASC
  `).all() as WatchRequest[];

  for (const req of watches) {
    req.cats = db.prepare("SELECT * FROM cats WHERE household_id = ?").all(req.household_id) as Cat[];
    req.slots = db.prepare(`
      SELECT ws.*, u.name as watcher_name, u.color as watcher_color, u.avatar as watcher_avatar
      FROM watch_slots ws
      JOIN users u ON u.id = ws.watcher_id
      WHERE ws.watch_request_id = ?
      ORDER BY ws.date ASC, ws.slot ASC
    `).all(req.id) as WatchSlot[];
  }

  return NextResponse.json(watches);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { household_id, requester_id, start_date, end_date, notes } = await request.json();

  if (!household_id || !requester_id || !start_date || !end_date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const watch = {
    id: uuidv4(),
    household_id,
    requester_id,
    start_date,
    end_date,
    notes: notes?.trim() || null,
    watcher_id: null,
    created_at: new Date().toISOString(),
  };

  db.prepare(`
    INSERT INTO watch_requests (id, household_id, requester_id, start_date, end_date, notes, watcher_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(watch.id, watch.household_id, watch.requester_id, watch.start_date, watch.end_date, watch.notes, watch.watcher_id, watch.created_at);

  return NextResponse.json(watch, { status: 201 });
}
