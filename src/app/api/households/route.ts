export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import type { Household, Cat, User } from "@/types";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const households = db.prepare("SELECT * FROM households ORDER BY name").all() as Household[];

  for (const h of households) {
    h.cats = db.prepare("SELECT * FROM cats WHERE household_id = ?").all(h.id) as Cat[];
    h.members = db.prepare(`
      SELECT u.* FROM users u
      JOIN household_members hm ON hm.user_id = u.id
      WHERE hm.household_id = ?
      ORDER BY u.name
    `).all(h.id) as User[];
  }

  return NextResponse.json(households);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, founder_id } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const household = { id: uuidv4(), name: name.trim(), created_at: new Date().toISOString() };
  db.prepare("INSERT INTO households (id, name, created_at, created_by) VALUES (?, ?, ?, ?)").run(
    household.id, household.name, household.created_at, session.user.id
  );

  if (founder_id) {
    db.prepare("INSERT OR IGNORE INTO household_members (household_id, user_id) VALUES (?, ?)").run(
      household.id, founder_id
    );
  }

  return NextResponse.json(household, { status: 201 });
}
