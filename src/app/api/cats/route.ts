export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cats = db.prepare(`
    SELECT c.*, h.name as household_name, u.name as creator_name,
      COALESCE(
        (SELECT filename FROM cat_photos WHERE id = c.cover_photo_id),
        (SELECT filename FROM cat_photos WHERE cat_id = c.id ORDER BY created_at ASC LIMIT 1)
      ) as cover_photo,
      EXISTS(SELECT 1 FROM household_members WHERE household_id = c.household_id AND user_id = ?) as viewer_is_member
    FROM cats c
    JOIN households h ON h.id = c.household_id
    LEFT JOIN users u ON u.id = c.created_by
    ORDER BY c.name ASC
  `).all(session.user.id);

  return NextResponse.json(cats);
}
