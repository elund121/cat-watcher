export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, emoji, notes } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const cat = {
    id: uuidv4(),
    name: name.trim(),
    household_id: params.id,
    emoji: emoji || "🐱",
    notes: notes?.trim() || null,
  };

  db.prepare("INSERT INTO cats (id, name, household_id, emoji, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)").run(
    cat.id, cat.name, cat.household_id, cat.emoji, cat.notes, session.user.id
  );

  return NextResponse.json({ ...cat, created_by: session.user.id }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { cat_id } = await request.json();
  db.prepare("DELETE FROM cats WHERE id = ? AND household_id = ?").run(cat_id, params.id);
  return NextResponse.json({ ok: true });
}
