export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import type { Cat, User, Household } from "@/types";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const household = db.prepare("SELECT * FROM households WHERE id = ?").get(params.id) as Household | undefined;
  if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

  household.cats = db.prepare("SELECT * FROM cats WHERE household_id = ?").all(params.id) as Cat[];
  household.members = db.prepare(`
    SELECT u.* FROM users u
    JOIN household_members hm ON hm.user_id = u.id
    WHERE hm.household_id = ?
    ORDER BY u.name
  `).all(params.id) as User[];

  return NextResponse.json(household);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const hh = db.prepare("SELECT created_by FROM households WHERE id = ?").get(params.id) as { created_by: string | null } | undefined;
  if (!hh) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (hh.created_by !== session.user.id && !session.user.isSuperuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  db.prepare("DELETE FROM households WHERE id = ?").run(params.id);
  return NextResponse.json({ ok: true });
}
