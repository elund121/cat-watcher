"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const isSuperuser = session?.user?.isSuperuser ?? false;

  useEffect(() => {
    if (status === "loading") return;
    if (!isSuperuser) { router.replace("/"); return; }
  }, [status, isSuperuser, router]);

  const loadEmails = useCallback(async () => {
    const res = await fetch("/api/admin/allowlist");
    if (res.ok) {
      const data = await res.json() as { email: string }[];
      setEmails(data.map(d => d.email));
    }
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isSuperuser) loadEmails();
  }, [isSuperuser, loadEmails]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setAdding(true);
    await fetch("/api/admin/allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail.trim() }),
    });
    setNewEmail("");
    setAdding(false);
    loadEmails();
  }

  async function handleRemove(email: string) {
    if (!confirm(`Remove ${email} from allowlist?`)) return;
    await fetch("/api/admin/allowlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    loadEmails();
  }

  if (status === "loading" || !isSuperuser) return null;

  return (
    <div className="px-4 pt-6 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">Admin</h1>

      <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-4 shadow-sm">
        <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-4">Google Allowlist</h2>

        <form onSubmit={handleAdd} className="flex gap-2 mb-4">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 text-sm px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={adding || !newEmail.trim()}
            className="text-sm font-medium px-4 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {loading ? (
          <div className="text-stone-400 text-sm py-4 text-center">Loading...</div>
        ) : emails.length === 0 ? (
          <div className="text-stone-400 text-sm py-4 text-center">No emails yet</div>
        ) : (
          <ul className="space-y-1">
            {emails.map(email => (
              <li key={email} className="flex items-center justify-between gap-2 py-2 px-1 border-b border-stone-50 dark:border-stone-800 last:border-0">
                <span className="text-sm text-stone-700 dark:text-stone-300 break-all">{email}</span>
                {email !== session?.user?.email && (
                  <button
                    onClick={() => handleRemove(email)}
                    className="text-xs text-red-400 hover:text-red-600 transition-colors flex-shrink-0 px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
