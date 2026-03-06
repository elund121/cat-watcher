import { Resend } from "resend";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { email } = await req.json() as { email: string };
  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const appUrl = process.env.NEXTAUTH_URL ?? "https://pussywatch.org";

  await resend.emails.send({
    from: process.env.RESEND_FROM ?? "invite@pussywatch.org",
    to: email,
    subject: "You're invited to PussyWatch",
    html: `
      <p>Hey! You've been added to <strong>PussyWatch</strong> — a cat sitting scheduler for friends.</p>
      <p><a href="${appUrl}/api/auth/signin">Sign in with Google</a> to get started.</p>
      <p style="color:#999;font-size:12px">If you weren't expecting this, you can ignore it.</p>
    `,
  });

  return NextResponse.json({ ok: true });
}
