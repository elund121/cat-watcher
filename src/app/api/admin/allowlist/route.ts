export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(db.prepare("SELECT email FROM allowed_emails ORDER BY email ASC").all());
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email } = await request.json();
  if (!email?.trim()) return NextResponse.json({ error: "Email required" }, { status: 400 });
  db.prepare("INSERT OR IGNORE INTO allowed_emails (email) VALUES (?)").run(email.trim().toLowerCase());
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { email } = await request.json();
  db.prepare("DELETE FROM allowed_emails WHERE email = ?").run(email);
  return NextResponse.json({ ok: true });
}
