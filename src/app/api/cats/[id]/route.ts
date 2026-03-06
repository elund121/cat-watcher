export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cat = db.prepare(`
    SELECT c.*, h.name as household_name, u.name as creator_name
    FROM cats c
    JOIN households h ON h.id = c.household_id
    LEFT JOIN users u ON u.id = c.created_by
    WHERE c.id = ?
  `).get(params.id);

  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = db.prepare(`
    SELECT cp.id, cp.filename, cp.created_at, u.name as uploader_name, u.color as uploader_color
    FROM cat_photos cp
    JOIN users u ON u.id = cp.uploader_id
    WHERE cp.cat_id = ?
    ORDER BY cp.created_at ASC
  `).all(params.id);

  return NextResponse.json({ ...cat, photos });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cat = db.prepare("SELECT household_id FROM cats WHERE id = ?").get(params.id) as { household_id: string } | undefined;
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isMember = db.prepare("SELECT 1 FROM household_members WHERE household_id = ? AND user_id = ?").get(cat.household_id, session.user.id);
  if (!isMember && !session.user.isSuperuser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  if ("bio" in body) {
    db.prepare("UPDATE cats SET bio = ? WHERE id = ?").run(body.bio ?? null, params.id);
  }
  if ("cover_photo_id" in body) {
    db.prepare("UPDATE cats SET cover_photo_id = ? WHERE id = ?").run(body.cover_photo_id ?? null, params.id);
  }

  return NextResponse.json({ ok: true });
}
