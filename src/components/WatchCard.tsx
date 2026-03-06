"use client";

import { useState, useEffect } from "react";
import type { WatchRequest, User, SitPhoto } from "@/types";
import UserAvatar from "@/components/UserAvatar";

interface Props {
  watch: WatchRequest;
  currentUser: User | null;
  isSuperuser?: boolean;
  onClaim: (watchId: string, date: string, slot: "morning" | "evening" | "both") => void;
  onUnclaim: (watchId: string, date: string, slot: "morning" | "evening" | "both") => void;
  onEdit: (watch: WatchRequest) => void;
  onDelete: (watchId: string) => void;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start + "T12:00:00");
  const e = new Date(end + "T12:00:00");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString("en-US", { ...opts, weekday: "short" });
  }
  const sStr = s.toLocaleDateString("en-US", opts);
  const eStr = e.toLocaleDateString("en-US", { ...opts, year: s.getFullYear() !== e.getFullYear() ? "numeric" : undefined });
  return `${sStr} – ${eStr}`;
}

function dayCount(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const diff = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return diff === 1 ? "1 day" : `${diff} days`;
}

function isPast(end: string) {
  return new Date(end + "T23:59:59") < new Date();
}

function nextDay(d: string): string {
  const dt = new Date(d + "T12:00:00");
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().split("T")[0].replace(/-/g, "");
}

function buildCalendarUrl(watch: WatchRequest, currentUser: User | null): string | null {
  const mySlots = watch.slots?.filter(s => s.watcher_id === currentUser?.id) ?? [];
  if (mySlots.length === 0) return null;

  const sortedDates = Array.from(new Set(mySlots.map(s => s.date))).sort();
  const firstDay = sortedDates[0].replace(/-/g, "");
  const lastDayExclusive = nextDay(sortedDates[sortedDates.length - 1]);

  const title = `Cat sitting — ${watch.household_name}`;
  const catNames = watch.cats?.map(c => `${c.emoji} ${c.name}`).join(", ") ?? "";
  const slotLines = mySlots
    .sort((a, b) => a.date.localeCompare(b.date) || a.slot.localeCompare(b.slot))
    .map(s => {
      const d = new Date(s.date + "T12:00:00");
      const label = d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      const slotLabel = s.slot === "morning" ? "Morning 🌅" : "Evening 🌙";
      return `• ${label} – ${slotLabel}`;
    });
  const description = [catNames, "", ...slotLines].join("\n").trim();

  const gcalDates = `${firstDay}/${lastDayExclusive}`;
  const params = new URLSearchParams({ action: "TEMPLATE", text: title, dates: gcalDates, details: description });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function getDays(start: string, end: string): string[] {
  const days: string[] = [];
  const cur = new Date(start + "T12:00:00");
  const endD = new Date(end + "T12:00:00");
  while (cur <= endD) { days.push(cur.toISOString().split("T")[0]); cur.setDate(cur.getDate() + 1); }
  return days;
}

function Avatar({ name, color, avatar }: { name: string; color?: string; avatar?: string | null }) {
  return <UserAvatar name={name} color={color} avatar={avatar} className="w-5 h-5 text-xs" />;
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

export default function WatchCard({ watch, currentUser, isSuperuser, onClaim, onUnclaim, onEdit, onDelete }: Props) {
  const past = isPast(watch.end_date);
  const isRequester = currentUser?.id === watch.requester_id;
  const canEdit = !past && !!(isRequester || isSuperuser);

  const days = getDays(watch.start_date, watch.end_date);
  const totalSlots = days.length * 2;
  const filledSlots = watch.slots?.length ?? 0;
  const fullyCovered = filledSlots === totalSlots;
  const partiallyCovered = filledSlots > 0 && !fullyCovered;

  const statusLabel = past ? "Past"
    : fullyCovered ? "Covered ✓"
    : partiallyCovered ? `Half covered (${filledSlots}/${totalSlots})`
    : "Needs cover";

  const statusClass = past
    ? "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400"
    : fullyCovered
    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
    : partiallyCovered
    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
    : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";

  const borderClass = past
    ? "border-stone-100 dark:border-stone-800"
    : fullyCovered
    ? "border-green-100 dark:border-green-900/50"
    : partiallyCovered
    ? "border-amber-100 dark:border-amber-900/50"
    : "border-orange-100 dark:border-orange-900/50";

  const today = new Date().toISOString().split("T")[0];
  const calendarUrl = buildCalendarUrl(watch, currentUser);

  const mySlots = watch.slots?.filter(s => s.watcher_id === currentUser?.id) ?? [];
  const hasMySlot = mySlots.length > 0;
  const isActive = watch.start_date <= today && today <= watch.end_date;
  const canUpload = isActive && hasMySlot && !isRequester;

  const [photos, setPhotos] = useState<SitPhoto[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isActive) return;
    fetch(`/api/watches/${watch.id}/photos`)
      .then(r => r.json())
      .then(setPhotos)
      .catch(() => {});
  }, [watch.id, isActive]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("photo", file);
    const res = await fetch(`/api/watches/${watch.id}/photos`, { method: "POST", body: fd });
    if (res.ok) {
      const { filename } = await res.json();
      setPhotos(prev => [...prev, { id: filename, filename, uploader_name: currentUser?.name ?? "", uploader_color: currentUser?.color, created_at: new Date().toISOString() }]);
    }
    setUploading(false);
    e.target.value = "";
  }

  function stop(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className={`bg-white dark:bg-stone-900 rounded-2xl shadow-sm border p-4 ${past ? "opacity-60" : ""} ${borderClass} ${canEdit ? "cursor-pointer active:scale-[0.99] transition-transform" : ""}`}
      onClick={canEdit ? () => onEdit(watch) : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-stone-900 dark:text-stone-100">{watch.household_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
          <div className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {formatDateRange(watch.start_date, watch.end_date)} · {dayCount(watch.start_date, watch.end_date)}
          </div>
        </div>

        {watch.cats && watch.cats.length > 0 && (
          <div className="flex gap-0.5 text-xl flex-shrink-0">
            {watch.cats.slice(0, 3).map(c => (
              <span key={c.id} title={c.name}>{c.emoji}</span>
            ))}
            {watch.cats.length > 3 && <span className="text-sm text-stone-400">{watch.cats.length - 3}+</span>}
          </div>
        )}
      </div>

      {watch.cats && watch.cats.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {watch.cats.map(c => (
            <span key={c.id} className="text-xs bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-1 rounded-lg">
              {c.emoji} {c.name}
            </span>
          ))}
        </div>
      )}

      {watch.notes && (
        <p className="text-sm text-stone-500 dark:text-stone-400 mb-3 italic">&ldquo;{watch.notes}&rdquo;</p>
      )}

      {/* Per-day slot cards */}
      <div className="pt-2 border-t border-stone-100 dark:border-stone-800 mb-2 space-y-2">
        {days.map(day => {
          const morningSlot = watch.slots?.find(s => s.date === day && s.slot === "morning");
          const eveningSlot = watch.slots?.find(s => s.date === day && s.slot === "evening");
          const iAmMorning = morningSlot?.watcher_id === currentUser?.id;
          const iAmEvening = eveningSlot?.watcher_id === currentUser?.id;
          const bothOpen = !morningSlot && !eveningSlot;
          const isDayPast = day < today;
          const canAct = !isDayPast && !past && !!currentUser && !isRequester;

          const slots = [
            { key: "morning" as const, icon: "🌅", label: "Morning", slot: morningSlot, isMe: iAmMorning },
            { key: "evening" as const, icon: "🌙", label: "Evening", slot: eveningSlot, isMe: iAmEvening },
          ];

          return (
            <div
              key={day}
              className={`rounded-xl border border-stone-100 dark:border-stone-800 overflow-hidden ${isDayPast ? "opacity-50" : ""}`}
              onClick={stop}
            >
              {/* Day header */}
              <div className="flex items-center justify-between px-3 py-2 bg-stone-50 dark:bg-stone-800/60">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                  {formatDayLabel(day)}
                </span>
                {canAct && bothOpen && (
                  <button
                    onClick={e => { stop(e); onClaim(watch.id, day, "both"); }}
                    className="text-xs px-2.5 py-1 bg-violet-600 text-white rounded-lg font-medium hover:bg-violet-700 transition-colors"
                  >
                    Take both
                  </button>
                )}
              </div>

              {/* Slot rows */}
              {slots.map(({ key, icon, label, slot, isMe }) => (
                <div key={key} className="flex items-center gap-3 px-3 py-2.5 border-t border-stone-100 dark:border-stone-800 first:border-t-0">
                  <span className="text-base w-5 flex-shrink-0 text-center">{icon}</span>
                  <span className="text-xs text-stone-400 dark:text-stone-500 w-14 flex-shrink-0">{label}</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {slot ? (
                      <>
                        <Avatar name={slot.watcher_name ?? "?"} color={slot.watcher_color} avatar={slot.watcher_avatar} />
                        <span className={`text-xs font-medium truncate ${isMe ? "text-violet-600 dark:text-violet-400" : "text-stone-600 dark:text-stone-300"}`}>
                          {isMe ? "You" : slot.watcher_name}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-stone-300 dark:text-stone-600 italic">open</span>
                    )}
                  </div>
                  {canAct && (
                    isMe ? (
                      <button
                        onClick={e => { stop(e); onUnclaim(watch.id, day, key); }}
                        className="text-xs text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 transition-colors px-2 py-1.5 -mr-1 flex-shrink-0"
                      >
                        Drop
                      </button>
                    ) : !slot ? (
                      <button
                        onClick={e => { stop(e); onClaim(watch.id, day, key); }}
                        className="text-xs px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors font-medium flex-shrink-0"
                      >
                        Claim
                      </button>
                    ) : null
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Photos */}
      {(canUpload || photos.length > 0) && (
        <div className="pt-2 border-t border-stone-100 dark:border-stone-800 mb-2" onClick={stop}>
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-1">
              {photos.map(p => (
                <a key={p.id} href={`/api/uploads/${p.filename}`} target="_blank" rel="noopener noreferrer">
                  <img
                    src={`/api/uploads/${p.filename}`}
                    alt="Sit photo"
                    className="h-24 w-24 object-cover rounded-xl flex-shrink-0 border border-stone-100 dark:border-stone-800"
                  />
                </a>
              ))}
            </div>
          )}
          {canUpload && (
            <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              {uploading ? "Uploading…" : "Add photo"}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
            </label>
          )}
        </div>
      )}

      {/* Footer: requester + actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
          <Avatar name={watch.requester_name ?? "?"} color={watch.requester_color} avatar={watch.requester_avatar} />
          <span>by {watch.requester_name}</span>
        </div>
        <div className="flex items-center gap-2">
          {calendarUrl && (
            <a
              href={calendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stop}
              className="text-xs text-stone-400 dark:text-stone-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Add to Calendar
            </a>
          )}
          {canEdit && (
            <button
              onClick={e => { stop(e); onDelete(watch.id); }}
              className="text-sm px-3 py-1.5 text-red-400 hover:text-red-600 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
