export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, color } = await request.json();

  if (name !== undefined) {
    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name.trim(), session.user.id);
  }
  if (color !== undefined) {
    db.prepare("UPDATE users SET color = ? WHERE id = ?").run(color, session.user.id);
  }

  const updated = db.prepare("SELECT id, name, color FROM users WHERE id = ?").get(session.user.id);
  return NextResponse.json(updated);
}
