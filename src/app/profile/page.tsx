"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COLORS = [
  "#7c3aed", "#db2777", "#ea580c", "#16a34a",
  "#0891b2", "#9333ea", "#b45309", "#dc2626",
];

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarFilename, setAvatarFilename] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
    if (session?.user?.color) setColor(session.user.color);
    if (session?.user?.avatar !== undefined) setAvatarFilename(session.user.avatar ?? null);
  }, [session?.user?.name, session?.user?.color, session?.user?.avatar]);

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await fetch("/api/users/me/avatar", { method: "POST", body: formData });
    if (res.ok) {
      const { avatar } = await res.json();
      setAvatarFilename(avatar);
      await update();
    }
    setUploadingAvatar(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSave() {
    if (!name.trim()) { setError("Name is required"); return; }
    setSaving(true);
    setError("");
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color }),
    });
    if (res.ok) {
      await update();
      router.push("/");
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
      setSaving(false);
    }
  }

  return (
    <div className="px-4 pt-6">
      <Link href="/" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 mb-4 -ml-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">Profile</h1>

      {/* Avatar with upload button */}
      <div className="flex justify-center mb-6">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-sm overflow-hidden"
            style={{ backgroundColor: avatarFilename ? undefined : color }}
          >
            {avatarFilename ? (
              <img src={`/api/uploads/${avatarFilename}`} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              name?.[0]?.toUpperCase() ?? "?"
            )}
          </div>
          <label className="absolute bottom-0 right-0 w-7 h-7 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center cursor-pointer shadow-md transition-colors">
            {uploadingAvatar ? (
              <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploadingAvatar}
            />
          </label>
        </div>
      </div>

      <div className="space-y-5 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800 p-5">
        <div>
          <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">Display name</label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setError(""); }}
            className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-2">Avatar color {avatarFilename && <span className="font-normal text-stone-400">(used as fallback)</span>}</label>
          <div className="flex gap-3 flex-wrap">
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-9 h-9 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-violet-500 scale-110 dark:ring-offset-stone-900" : "hover:scale-105"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50 hover:bg-violet-700 transition-colors"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
