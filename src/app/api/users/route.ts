export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

const COLORS = [
  "#7c3aed", "#db2777", "#ea580c", "#16a34a",
  "#0891b2", "#9333ea", "#b45309", "#dc2626",
];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const users = db.prepare("SELECT * FROM users ORDER BY name").all();
  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const existing = db.prepare("SELECT * FROM users WHERE LOWER(name) = LOWER(?)").get(name.trim());
  if (existing) {
    return NextResponse.json({ error: "Name already taken" }, { status: 409 });
  }

  const usedColors = (db.prepare("SELECT color FROM users").all() as { color: string }[]).map(u => u.color);
  const color = COLORS.find(c => !usedColors.includes(c)) ?? COLORS[Math.floor(Math.random() * COLORS.length)];

  const user = { id: uuidv4(), name: name.trim(), color };
  db.prepare("INSERT INTO users (id, name, color) VALUES (?, ?, ?)").run(user.id, user.name, user.color);
  return NextResponse.json(user, { status: 201 });
}
