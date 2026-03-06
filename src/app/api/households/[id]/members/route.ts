export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user_id } = await request.json();
  if (!user_id) return NextResponse.json({ error: "user_id required" }, { status: 400 });

  db.prepare("INSERT OR IGNORE INTO household_members (household_id, user_id) VALUES (?, ?)").run(
    params.id, user_id
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { user_id } = await request.json();
  db.prepare("DELETE FROM household_members WHERE household_id = ? AND user_id = ?").run(
    params.id, user_id
  );
  return NextResponse.json({ ok: true });
}
