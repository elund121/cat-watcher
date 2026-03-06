"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import WatchCard from "@/components/WatchCard";
import RequestWatchModal from "@/components/RequestWatchModal";
import type { User, WatchRequest, Household } from "@/types";

type Filter = "upcoming" | "open" | "covered" | "past";

export default function SchedulePage() {
  const { data: session } = useSession();
  const currentUser: User | null = session?.user
    ? { id: session.user.id, name: session.user.name ?? "", color: session.user.color }
    : null;
  const isAdmin = session?.user?.isSuperuser ?? false;
  const [watches, setWatches] = useState<WatchRequest[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [editingWatch, setEditingWatch] = useState<WatchRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [wRes, hRes] = await Promise.all([
      fetch("/api/watches"),
      fetch("/api/households"),
    ]);
    const [w, h] = await Promise.all([wRes.json(), hRes.json()]);
    setWatches(w);
    setHouseholds(h);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleClaim(watchId: string, date: string, slot: "morning" | "evening" | "both") {
    if (!currentUser) return;
    await fetch(`/api/watches/${watchId}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slot }),
    });
    loadData();
  }

  async function handleUnclaim(watchId: string, date: string, slot: "morning" | "evening" | "both") {
    await fetch(`/api/watches/${watchId}/slots`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slot }),
    });
    loadData();
  }

  async function handleDelete(watchId: string) {
    if (!confirm("Cancel this watch request?")) return;
    await fetch(`/api/watches/${watchId}`, { method: "DELETE" });
    loadData();
  }

  function getDays(start: string, end: string): string[] {
    const days: string[] = [];
    const cur = new Date(start + "T12:00:00");
    const endD = new Date(end + "T12:00:00");
    while (cur <= endD) { days.push(cur.toISOString().split("T")[0]); cur.setDate(cur.getDate() + 1); }
    return days;
  }

  const today = new Date().toISOString().split("T")[0];

  const filtered = watches.filter(w => {
    const past = w.end_date < today;
    if (filter === "upcoming") return !past;
    if (filter === "open") return !past && (w.slots?.length ?? 0) < getDays(w.start_date, w.end_date).length * 2;
    if (filter === "covered") return !past && w.slots?.length === getDays(w.start_date, w.end_date).length * 2;
    if (filter === "past") return past;
    return true;
  });

  const tabs: { key: Filter; label: string }[] = [
    { key: "upcoming", label: "Upcoming" },
    { key: "open", label: "Open" },
    { key: "covered", label: "Covered" },
    { key: "past", label: "Past" },
  ];

  return (
    <>
      {(showRequestModal || editingWatch) && currentUser && (
        <RequestWatchModal
          households={households}
          currentUser={currentUser}
          editWatch={editingWatch ?? undefined}
          onClose={() => { setShowRequestModal(false); setEditingWatch(null); }}
          onCreated={loadData}
        />
      )}

      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Schedule</h1>
          {currentUser && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="text-sm font-medium text-white bg-violet-600 px-3 py-2 rounded-xl hover:bg-violet-700 transition-colors"
            >
              + Request
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex bg-stone-100 dark:bg-stone-900 rounded-xl p-1 mb-5 gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex-1 text-sm font-medium py-1.5 rounded-lg transition-colors ${
                filter === t.key
                  ? "bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 shadow-sm"
                  : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-16 gap-4">
            <img src="/cat-loading.png" alt="Loading" className="w-24 h-24 animate-bounce object-contain" />
            <div className="flex gap-1.5">
              {[0, 150, 300].map(delay => (
                <div key={delay} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📅</div>
            <p className="text-stone-500 dark:text-stone-400 font-medium">
              {filter === "upcoming" ? "No upcoming watches" :
               filter === "open" ? "No open requests — all covered!" :
               filter === "covered" ? "None covered yet" :
               "No past watches"}
            </p>
            {filter === "upcoming" && currentUser && (
              <button
                onClick={() => setShowRequestModal(true)}
                className="mt-4 text-violet-600 font-medium text-sm"
              >
                Request a sitter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(w => (
              <WatchCard
                key={w.id}
                watch={w}
                currentUser={currentUser}
                isSuperuser={isAdmin}
                onClaim={handleClaim}
                onUnclaim={handleUnclaim}
                onEdit={setEditingWatch}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      {currentUser && (
        <button
          onClick={() => setShowRequestModal(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-violet-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-violet-700 active:scale-95 transition-all z-30"
          title="Request a cat sitter"
        >
          +
        </button>
      )}
    </>
  );
}
