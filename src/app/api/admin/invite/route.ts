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
    subject: "You're invited to PussyWatch 🐱",
    html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:20px;border:1px solid #e7e5e4;overflow:hidden">

        <!-- Header -->
        <tr>
          <td style="background:#7c3aed;padding:32px 40px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">🐱</div>
            <div style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px">PussyWatch</div>
            <div style="color:#ddd6fe;font-size:13px;margin-top:4px">cat sitting, coordinated</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="margin:0 0 16px;font-size:16px;color:#1c1917;font-weight:600">Hey there! 👋</p>
            <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6">
              You've been invited to <strong style="color:#1c1917">PussyWatch</strong> — a private cat sitting scheduler for friends. Coordinate who's feeding the cats while everyone's away.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0">
              <tr><td align="center">
                <a href="${appUrl}/api/auth/signin"
                   style="display:inline-block;background:#7c3aed;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:12px">
                  Sign in with Google →
                </a>
              </td></tr>
            </table>

            <p style="margin:0;font-size:14px;color:#78716c;line-height:1.6">
              Once you're in, you can join households, claim cat sitting slots, and upload photos of the cats you're watching.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #f5f5f4;text-align:center">
            <p style="margin:0;font-size:12px;color:#a8a29e">
              If you weren't expecting this invite, you can safely ignore it.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  return NextResponse.json({ ok: true });
}
