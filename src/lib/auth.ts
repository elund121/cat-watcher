import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { v4 as uuidv4 } from "uuid";
import db from "@/lib/db";

const COLORS = [
  "#7c3aed", "#db2777", "#ea580c", "#16a34a",
  "#0891b2", "#9333ea", "#b45309", "#dc2626",
];

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const allowed = db.prepare("SELECT email FROM allowed_emails WHERE email = ?").get(user.email);
      if (!allowed) return "/signin?error=AccessDenied";
      const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(user.email);
      if (!existing) {
        const usedColors = (db.prepare("SELECT color FROM users").all() as { color: string }[]).map(u => u.color);
        const color = COLORS.find(c => !usedColors.includes(c)) ?? COLORS[Math.floor(Math.random() * COLORS.length)];
        db.prepare("INSERT INTO users (id, name, color, email) VALUES (?, ?, ?, ?)").run(
          uuidv4(), user.name ?? user.email, color, user.email
        );
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      const email = user?.email ?? (typeof token.email === "string" ? token.email : undefined);
      if (email && (user?.email || trigger === "update")) {
        const row = db.prepare("SELECT id, name, color, is_superuser, avatar FROM users WHERE email = ?").get(email) as { id: string; name: string; color: string; is_superuser: number; avatar: string | null } | undefined;
        if (row) {
          token.dbUserId = row.id;
          token.dbUserColor = row.color;
          token.dbUserIsSuperuser = row.is_superuser === 1;
          token.dbUserAvatar = row.avatar;
          token.name = row.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.dbUserId ?? "";
        session.user.color = token.dbUserColor ?? "#7c3aed";
        session.user.isSuperuser = token.dbUserIsSuperuser ?? false;
        session.user.avatar = token.dbUserAvatar;
      }
      return session;
    },
  },
};
