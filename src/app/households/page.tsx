"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import AddHouseholdModal from "@/components/AddHouseholdModal";
import UserAvatar from "@/components/UserAvatar";
import type { User, Household } from "@/types";

export default function HouseholdsPage() {
  const { data: session } = useSession();
  const currentUser: User | null = session?.user
    ? { id: session.user.id, name: session.user.name ?? "", color: session.user.color }
    : null;
  const [households, setHouseholds] = useState<Household[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadHouseholds = useCallback(async () => {
    const res = await fetch("/api/households");
    const data = await res.json();
    await new Promise(r => setTimeout(r, 700));
    setHouseholds(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadHouseholds(); }, [loadHouseholds]);

  return (
    <>
      {showAddModal && currentUser && (
        <AddHouseholdModal
          currentUser={currentUser}
          onClose={() => setShowAddModal(false)}
          onCreated={loadHouseholds}
        />
      )}

      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Households</h1>
          {currentUser && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 px-3 py-2 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
            >
              + New
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <img src="/cat-loading.png" alt="Loading" className="w-24 h-24 animate-bounce object-contain" />
            <div className="flex gap-1.5">
              {[0, 150, 300].map(delay => (
                <div
                  key={delay}
                  className="w-2 h-2 bg-violet-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        ) : households.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🏠</div>
            <p className="text-stone-500 dark:text-stone-400 font-medium">No households yet</p>
            {currentUser ? (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 text-violet-600 dark:text-violet-400 font-medium text-sm"
              >
                Create the first one
              </button>
            ) : (
              <p className="text-stone-400 text-sm mt-2">Select your name on the home page to get started</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {households.map(h => {
              const isMember = h.members?.some(m => m.id === currentUser?.id);
              return (
                <Link key={h.id} href={`/households/${h.id}`} className="block">
                  <div className="bg-white dark:bg-stone-900 rounded-2xl shadow-sm border border-stone-100 dark:border-stone-800 p-4 hover:border-violet-200 dark:hover:border-violet-700 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-stone-900 dark:text-stone-100">{h.name}</h3>
                          {isMember && (
                            <span className="text-xs bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-medium">
                              You&apos;re here
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-stone-400 dark:text-stone-500 mt-0.5">
                          {h.members?.length ?? 0} member{(h.members?.length ?? 0) !== 1 ? "s" : ""}
                          {h.cats && h.cats.length > 0 && ` · ${h.cats.length} cat${h.cats.length !== 1 ? "s" : ""}`}
                        </div>
                      </div>
                      <div className="text-2xl">
                        {h.cats && h.cats.length > 0
                          ? h.cats.slice(0, 3).map(c => c.emoji).join("")
                          : "🏠"}
                      </div>
                    </div>

                    {h.cats && h.cats.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {h.cats.map(c => (
                          <span key={c.id} className="text-xs bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-1 rounded-lg">
                            {c.emoji} {c.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {h.members && h.members.length > 0 && (
                      <div className="flex items-center gap-1 mt-3">
                        {h.members.slice(0, 5).map(m => (
                          <span key={m.id} title={m.name} className="-ml-1 first:ml-0 border-2 border-white dark:border-stone-900 rounded-full">
                            <UserAvatar name={m.name} color={m.color} avatar={m.avatar} className="w-7 h-7 text-xs" />
                          </span>
                        ))}
                        {(h.members.length > 5) && (
                          <span className="text-xs text-stone-400 ml-1">+{h.members.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
