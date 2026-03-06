"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import UserAvatar from "@/components/UserAvatar";

interface Props {
  name: string;
  color: string;
  avatar?: string | null;
  isSuperuser?: boolean;
}

const themeOptions: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "System", icon: "💻" },
];

export default function UserMenu({ name, color, avatar, isSuperuser }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)} className="shadow-sm rounded-full">
        <UserAvatar name={name} color={color} avatar={avatar} className="w-10 h-10 text-sm" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-48 bg-white dark:bg-stone-900 rounded-2xl shadow-lg border border-stone-100 dark:border-stone-800 py-1 z-50">
          {isSuperuser && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Admin
            </Link>
          )}
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Profile
          </Link>

          <div className="px-4 py-2.5 border-t border-stone-100 dark:border-stone-800">
            <p className="text-xs font-medium text-stone-400 dark:text-stone-500 mb-2">Appearance</p>
            <div className="flex gap-1">
              {themeOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    theme === opt.value
                      ? "bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300"
                      : "text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
                  }`}
                >
                  <span className="text-base leading-none">{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
