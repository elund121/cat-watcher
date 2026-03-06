export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Not an image" }, { status: 400 });

  // Delete old avatar file if it exists
  const existing = db.prepare("SELECT avatar FROM users WHERE id = ?").get(session.user.id) as { avatar: string | null } | undefined;
  if (existing?.avatar) {
    const oldPath = path.join(process.cwd(), "public", "uploads", existing.avatar);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `avatar-${uuidv4()}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));

  db.prepare("UPDATE users SET avatar = ? WHERE id = ?").run(filename, session.user.id);

  return NextResponse.json({ avatar: filename });
}
