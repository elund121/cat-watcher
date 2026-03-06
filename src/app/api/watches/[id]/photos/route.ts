export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photos = db.prepare(`
    SELECT sp.id, sp.filename, sp.created_at, u.name as uploader_name, u.color as uploader_color
    FROM sit_photos sp
    JOIN users u ON u.id = sp.uploader_id
    WHERE sp.watch_request_id = ?
    ORDER BY sp.created_at ASC
  `).all(params.id);

  return NextResponse.json(photos);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Not an image" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${uuidv4()}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));

  db.prepare(`INSERT INTO sit_photos (id, watch_request_id, uploader_id, filename, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(uuidv4(), params.id, session.user.id, filename, new Date().toISOString());

  return NextResponse.json({ filename });
}
