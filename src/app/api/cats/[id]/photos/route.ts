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
    SELECT cp.id, cp.filename, cp.created_at, u.name as uploader_name, u.color as uploader_color
    FROM cat_photos cp
    JOIN users u ON u.id = cp.uploader_id
    WHERE cp.cat_id = ?
    ORDER BY cp.created_at ASC
  `).all(params.id);

  return NextResponse.json(photos);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cat = db.prepare("SELECT household_id FROM cats WHERE id = ?").get(params.id) as { household_id: string } | undefined;
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isMemberPost = db.prepare("SELECT 1 FROM household_members WHERE household_id = ? AND user_id = ?").get(cat.household_id, session.user.id);
  if (!isMemberPost && !session.user.isSuperuser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("photo") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Not an image" }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${uuidv4()}.${ext}`;

  const uploadsDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()));

  const id = uuidv4();
  db.prepare("INSERT INTO cat_photos (id, cat_id, uploader_id, filename, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, params.id, session.user.id, filename, new Date().toISOString());

  return NextResponse.json({ id, filename });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cat = db.prepare("SELECT household_id FROM cats WHERE id = ?").get(params.id) as { household_id: string } | undefined;
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const isMemberDelete = db.prepare("SELECT 1 FROM household_members WHERE household_id = ? AND user_id = ?").get(cat.household_id, session.user.id);
  if (!isMemberDelete && !session.user.isSuperuser) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { photo_id } = await request.json();
  const photo = db.prepare("SELECT filename FROM cat_photos WHERE id = ? AND cat_id = ?").get(photo_id, params.id) as { filename: string } | undefined;
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const filePath = path.join(process.cwd(), "data", "uploads", photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare("DELETE FROM cat_photos WHERE id = ?").run(photo_id);

  return NextResponse.json({ ok: true });
}
