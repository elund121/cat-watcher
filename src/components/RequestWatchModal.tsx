"use client";

import { useState } from "react";
import type { Household, User, WatchRequest } from "@/types";

interface Props {
  households: Household[];
  currentUser: User;
  defaultHouseholdId?: string;
  editWatch?: WatchRequest;
  onClose: () => void;
  onCreated: () => void;
}

export default function RequestWatchModal({ households, currentUser, defaultHouseholdId, editWatch, onClose, onCreated }: Props) {
  const isEditing = !!editWatch;
  const myHouseholds = households.filter(h =>
    h.members?.some(m => m.id === currentUser.id)
  );

  const [householdId, setHouseholdId] = useState(editWatch?.household_id ?? defaultHouseholdId ?? myHouseholds[0]?.id ?? "");
  const [startDate, setStartDate] = useState(editWatch?.start_date ?? "");
  const [endDate, setEndDate] = useState(editWatch?.end_date ?? "");
  const [notes, setNotes] = useState(editWatch?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  async function handleSubmit() {
    if (!householdId || !startDate || !endDate) {
      setError("Please fill in all required fields");
      return;
    }
    if (endDate < startDate) {
      setError("End date must be after start date");
      return;
    }

    setSubmitting(true);
    setError("");

    let res: Response;
    if (isEditing) {
      res = await fetch(`/api/watches/${editWatch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_date: startDate,
          end_date: endDate,
          notes: notes.trim() || null,
        }),
      });
    } else {
      res = await fetch("/api/watches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household_id: householdId,
          requester_id: currentUser.id,
          start_date: startDate,
          end_date: endDate,
          notes: notes.trim() || undefined,
        }),
      });
    }

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
      <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="p-6 pb-4">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-1">
            {isEditing ? "Edit request" : "Request a cat sitter"}
          </h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm">
            {isEditing ? "Update the dates or notes for this request." : "Let your friends know you need help!"}
          </p>
        </div>

        <div className="px-6 space-y-4">
          {myHouseholds.length === 0 && !isEditing ? (
            <p className="text-stone-500 dark:text-stone-400 text-sm">You need to join a household first.</p>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">Household</label>
                <select
                  value={householdId}
                  onChange={e => setHouseholdId(e.target.value)}
                  disabled={isEditing}
                  className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isEditing ? (
                    <option value={editWatch.household_id}>{editWatch.household_name}</option>
                  ) : (
                    myHouseholds.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.cats?.map(c => c.emoji).join("")}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">From</label>
                  <input
                    type="date"
                    value={startDate}
                    min={today}
                    onChange={e => {
                      setStartDate(e.target.value);
                      if (endDate && e.target.value > endDate) setEndDate(e.target.value);
                    }}
                    className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">To</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || today}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1.5">
                  Notes <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Feeding instructions, special needs..."
                  rows={2}
                  className="w-full border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 text-stone-900 dark:text-stone-100 bg-white dark:bg-stone-800 placeholder:text-stone-400 dark:placeholder:text-stone-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                />
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="p-6 pt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 font-medium"
          >
            Cancel
          </button>
          {(isEditing || myHouseholds.length > 0) && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-violet-600 text-white font-semibold disabled:opacity-50"
            >
              {submitting ? "Saving..." : isEditing ? "Save changes" : "Post request"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
