"use client";

import { useState } from "react";
import type { User } from "@/types";

interface Props {
  currentUser: User;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddHouseholdModal({ currentUser, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!name.trim()) { setError("Household name is required"); return; }

    setSubmitting(true);
    const res = await fetch("/api/households", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), founder_id: currentUser.id }),
    });

    if (res.ok) {
      onCreated();
      onClose();
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong");
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">New household</h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mb-5">You&apos;ll be added as a member automatically.</p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">Household name</label>
            <input
              autoFocus
              type="text"
              placeholder="e.g. The Johnson Place"
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
