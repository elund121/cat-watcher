"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import WatchCard from "@/components/WatchCard";
import RequestWatchModal from "@/components/RequestWatchModal";
import UserMenu from "@/components/UserMenu";
import type { User, WatchRequest, Household } from "@/types";

export default function HomePage() {
  const { data: session } = useSession();
  const currentUser: User | null = session?.user
    ? { id: session.user.id, name: session.user.name ?? "", color: session.user.color, avatar: session.user.avatar }
    : null;
  const isAdmin = session?.user?.isSuperuser ?? false;
  const [watches, setWatches] = useState<WatchRequest[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [editingWatch, setEditingWatch] = useState<WatchRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [watchRes, householdRes] = await Promise.all([
      fetch("/api/watches"),
      fetch("/api/households"),
    ]);
    const [watchData, householdData] = await Promise.all([
      watchRes.json(),
      householdRes.json(),
    ]);
    setWatches(watchData);
    setHouseholds(householdData);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
  const upcoming = watches.filter(w => w.end_date >= today);

  // Each card appears in exactly one section, in priority order:
  // 1. Watches you've claimed slots on
  // 2. Your open requests (you're the requester, not yet fully covered)
  // 3. Everything else that needs coverage
  const myWatches = upcoming.filter(w => w.slots?.some(s => s.watcher_id === currentUser?.id));
  const myWatchIds = new Set(myWatches.map(w => w.id));
  const myRequests = upcoming.filter(w =>
    !myWatchIds.has(w.id) &&
    w.requester_id === currentUser?.id &&
    (w.slots?.length ?? 0) < getDays(w.start_date, w.end_date).length * 2
  );
  const myRequestIds = new Set(myRequests.map(w => w.id));
  const openRequests = upcoming.filter(w =>
    !myWatchIds.has(w.id) &&
    !myRequestIds.has(w.id) &&
    (w.slots?.length ?? 0) < getDays(w.start_date, w.end_date).length * 2
  );

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

      <div className="px-4 pt-6 pb-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {currentUser ? `Hey, ${currentUser.name.split(" ")[0]}! 👋` : "PussyWatch 🐱"}
            </h1>
            <p className="text-stone-400 dark:text-stone-500 text-sm mt-0.5">Cat sitting scheduler</p>
          </div>
          {currentUser && (
            <UserMenu name={currentUser.name} color={currentUser.color} avatar={currentUser.avatar} isSuperuser={isAdmin} />
          )}
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
        ) : (
          <div className="space-y-6">
            {/* Open requests — needs a sitter */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400 inline-block"></span>
                  Needs a sitter
                  {openRequests.length > 0 && (
                    <span className="ml-1 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">
                      {openRequests.length}
                    </span>
                  )}
                </h2>
              </div>

              {openRequests.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800">
                  All covered! No open requests.
                </div>
              ) : (
                <div className="space-y-3">
                  {openRequests.map(w => (
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
            </section>

            {/* My upcoming watches */}
            {myWatches.length > 0 && (
              <section>
                <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 inline-block"></span>
                  Your upcoming sits
                </h2>
                <div className="space-y-3">
                  {myWatches.map(w => (
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
              </section>
            )}

            {/* My pending requests */}
            {myRequests.length > 0 && (
              <section>
                <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-400 inline-block"></span>
                  Your open requests
                </h2>
                <div className="space-y-3">
                  {myRequests.map(w => (
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
              </section>
            )}
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
