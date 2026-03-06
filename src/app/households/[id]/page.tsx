"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import RequestWatchModal from "@/components/RequestWatchModal";
import UserAvatar from "@/components/UserAvatar";
import type { User, Household, Cat } from "@/types";

const CAT_EMOJIS = ["🐱", "🐈", "🐈‍⬛", "😸", "😻", "🙀"];

export default function HouseholdPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: session } = useSession();
  const currentUser: User | null = session?.user
    ? { id: session.user.id, name: session.user.name ?? "", color: session.user.color }
    : null;
  const [household, setHousehold] = useState<Household | null>(null);
  const [allHouseholds, setAllHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCat, setShowAddCat] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("🐱");
  const [catNotes, setCatNotes] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [catError, setCatError] = useState("");

  const loadData = useCallback(async () => {
    const [hRes, allRes] = await Promise.all([
      fetch(`/api/households/${id}`),
      fetch("/api/households"),
    ]);
    if (!hRes.ok) { router.push("/households"); return; }
    const [h, all] = await Promise.all([hRes.json(), allRes.json()]);
    setHousehold(h);
    setAllHouseholds(all);
    await new Promise(r => setTimeout(r, 700));
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const isMember = household?.members?.some(m => m.id === currentUser?.id);
  const isAdmin = session?.user?.isSuperuser ?? false;

  async function handleJoin() {
    if (!currentUser) return;
    await fetch(`/api/households/${id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUser.id }),
    });
    loadData();
  }

  async function handleLeave() {
    if (!currentUser || !confirm("Leave this household?")) return;
    await fetch(`/api/households/${id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: currentUser.id }),
    });
    loadData();
  }

  async function handleAddCat() {
    if (!catName.trim()) { setCatError("Cat name is required"); return; }
    setAddingCat(true);
    const res = await fetch(`/api/households/${id}/cats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim(), emoji: catEmoji, notes: catNotes }),
    });
    if (res.ok) {
      setCatName(""); setCatEmoji("🐱"); setCatNotes("");
      setShowAddCat(false);
      loadData();
    } else {
      const data = await res.json();
      setCatError(data.error ?? "Something went wrong");
    }
    setAddingCat(false);
  }

  async function handleDeleteHousehold() {
    if (!confirm("Delete this household? This will also remove all cats and watch requests.")) return;
    const res = await fetch(`/api/households/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/households");
  }

  async function handleRemoveCat(cat: Cat) {
    if (!confirm(`Remove ${cat.name}?`)) return;
    await fetch(`/api/households/${id}/cats`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cat_id: cat.id }),
    });
    loadData();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center py-16 gap-4">
        <img src="/cat-loading.png" alt="Loading" className="w-24 h-24 animate-bounce object-contain" />
        <div className="flex gap-1.5">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!household) return null;

  return (
    <>
      {showRequestModal && currentUser && (
        <RequestWatchModal
          households={allHouseholds}
          currentUser={currentUser}
          defaultHouseholdId={id}
          onClose={() => setShowRequestModal(false)}
          onCreated={() => {}}
        />
      )}

      <div className="px-4 pt-6">
        {/* Back */}
        <Link href="/households" className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 mb-4 -ml-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Households
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{household.name}</h1>
            <p className="text-stone-400 dark:text-stone-500 text-sm mt-0.5">
              {household.members?.length ?? 0} member{(household.members?.length ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
          {currentUser && (
            isMember ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRequestModal(true)}
                  className="text-sm font-medium text-white bg-violet-600 px-3 py-2 rounded-xl hover:bg-violet-700 transition-colors"
                >
                  Request sitter
                </button>
                <button
                  onClick={handleLeave}
                  className="text-sm font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 px-3 py-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Leave
                </button>
                {(currentUser.id === household.created_by || isAdmin) && (
                  <button
                    onClick={handleDeleteHousehold}
                    className="text-sm font-medium text-red-400 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleJoin}
                className="text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-3 py-2 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
              >
                Join
              </button>
            )
          )}
        </div>

        {/* Members */}
        <section className="mb-6">
          <h2 className="font-semibold text-stone-700 dark:text-stone-300 mb-3">Members</h2>
          {household.members && household.members.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {household.members.map(m => (
                <div key={m.id} className="flex items-center gap-2 bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-xl px-3 py-2">
                  <UserAvatar name={m.name} color={m.color} avatar={m.avatar} className="w-7 h-7 text-xs" />
                  <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{m.name}</span>
                  {m.id === currentUser?.id && (
                    <span className="text-xs text-violet-400">(you)</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-stone-400 text-sm">No members yet.</p>
          )}
        </section>

        {/* Cats */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-stone-700 dark:text-stone-300">Cats</h2>
            {isMember && !showAddCat && (
              <button
                onClick={() => setShowAddCat(true)}
                className="text-sm text-violet-600 dark:text-violet-400 font-medium"
              >
                + Add cat
              </button>
            )}
          </div>

          {showAddCat && (
            <div className="bg-white dark:bg-stone-900 border border-violet-100 dark:border-violet-900/50 rounded-2xl p-4 mb-3 space-y-3">
              <div>
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">Cat&apos;s name</label>
                <input
                  autoFocus
                  type="text"
                  placeholder="e.g. Whiskers"
                  value={catName}
                  onChange={e => { setCatName(e.target.value); setCatError(""); }}
                  className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">Pick an emoji</label>
                <div className="flex gap-2">
                  {CAT_EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setCatEmoji(e)}
                      className={`text-2xl w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                        catEmoji === e
                          ? "bg-violet-100 dark:bg-violet-900/50 ring-2 ring-violet-400"
                          : "bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">
                  Notes <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Wet food twice daily, indoor only"
                  value={catNotes}
                  onChange={e => setCatNotes(e.target.value)}
                  className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              {catError && <p className="text-red-500 text-sm">{catError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddCat(false); setCatName(""); setCatEmoji("🐱"); setCatNotes(""); setCatError(""); }}
                  className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCat}
                  disabled={addingCat}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {addingCat ? "Adding..." : "Add"}
                </button>
              </div>
            </div>
          )}

          {household.cats && household.cats.length > 0 ? (
            <div className="space-y-2">
              {household.cats.map(cat => (
                <div key={cat.id} className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl p-4 flex items-center justify-between">
                  <Link href={`/gallery?cat=${cat.id}`} className="flex items-center gap-3 hover:opacity-70 transition-opacity">
                    <span className="text-3xl">{cat.emoji}</span>
                    <div>
                      <div className="font-medium text-stone-800 dark:text-stone-200">{cat.name}</div>
                      {cat.notes && <div className="text-sm text-stone-400">{cat.notes}</div>}
                    </div>
                  </Link>
                  {isMember && (
                    <button
                      onClick={() => handleRemoveCat(cat)}
                      className="text-stone-300 dark:text-stone-600 hover:text-red-400 transition-colors p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white dark:bg-stone-900 rounded-2xl border border-stone-100 dark:border-stone-800">
              <div className="text-3xl mb-2">🐱</div>
              <p className="text-stone-400 text-sm">No cats yet</p>
              {isMember && (
                <button onClick={() => setShowAddCat(true)} className="mt-2 text-violet-600 dark:text-violet-400 text-sm font-medium">
                  Add your first cat
                </button>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
