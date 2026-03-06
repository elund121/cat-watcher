"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Cat, CatPhoto } from "@/types";

interface Props {
  cat: Cat;
  canEdit: boolean;
  onClose: () => void;
  onUpdated: (updated: Partial<Cat>) => void;
}

export default function CatProfileModal({ cat, canEdit, onClose, onUpdated }: Props) {
  const [photos, setPhotos] = useState<CatPhoto[]>([]);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(cat.cover_photo_id ?? null);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(cat.bio ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [settingCover, setSettingCover] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [dragY, setDragY] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartTime = useRef<number>(0);
  const isDragging = useRef(false);

  useEffect(() => {
    fetch(`/api/cats/${cat.id}/photos`)
      .then(r => r.ok ? r.json() : [])
      .then(setPhotos);
  }, [cat.id]);

  useEffect(() => {
    return () => { if (successTimerRef.current) clearTimeout(successTimerRef.current); };
  }, []);

  // Keyboard nav for lightbox
  const handleLightboxKey = useCallback((e: KeyboardEvent) => {
    if (lightboxIndex === null) return;
    if (e.key === "Escape") setLightboxIndex(null);
    if (e.key === "ArrowRight") setLightboxIndex(i => i !== null ? Math.min(i + 1, photos.length - 1) : null);
    if (e.key === "ArrowLeft") setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null);
  }, [lightboxIndex, photos.length]);

  useEffect(() => {
    window.addEventListener("keydown", handleLightboxKey);
    return () => window.removeEventListener("keydown", handleLightboxKey);
  }, [handleLightboxKey]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || lightboxIndex === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) setLightboxIndex(i => i !== null ? Math.min(i + 1, photos.length - 1) : null);
      else setLightboxIndex(i => i !== null ? Math.max(i - 1, 0) : null);
    }
    touchStartX.current = null;
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    let firstUploadFilename: string | null = null;
    let currentPhotoCount = photos.length;

    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.append("photo", files[i]);
      const res = await fetch(`/api/cats/${cat.id}/photos`, { method: "POST", body: formData });
      if (res.ok) {
        const { id, filename } = await res.json();
        if (currentPhotoCount === 0 && i === 0) firstUploadFilename = filename;
        currentPhotoCount++;
        setPhotos(prev => [...prev, { id, filename, uploader_name: "", created_at: new Date().toISOString() }]);
      }
      setUploadProgress({ done: i + 1, total: files.length });
    }

    if (firstUploadFilename) onUpdated({ cover_photo: firstUploadFilename });

    setUploadSuccess(true);
    setUploadProgress(null);
    setUploading(false);
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => setUploadSuccess(false), 2500);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDeletePhoto(photo: CatPhoto) {
    const res = await fetch(`/api/cats/${cat.id}/photos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: photo.id }),
    });
    if (res.ok) {
      const remaining = photos.filter(p => p.id !== photo.id);
      setPhotos(remaining);
      if (lightboxIndex !== null) {
        if (remaining.length === 0) setLightboxIndex(null);
        else setLightboxIndex(i => i !== null ? Math.min(i, remaining.length - 1) : null);
      }
      if (remaining.length === 0) {
        onUpdated({ cover_photo: undefined, cover_photo_id: undefined });
        setCoverPhotoId(null);
      } else if (coverPhotoId === photo.id) {
        await fetch(`/api/cats/${cat.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cover_photo_id: null }),
        });
        setCoverPhotoId(null);
        onUpdated({ cover_photo: remaining[0].filename, cover_photo_id: undefined });
      }
    }
  }

  async function handleSetCover(photo: CatPhoto) {
    setSettingCover(photo.id);
    const res = await fetch(`/api/cats/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cover_photo_id: photo.id }),
    });
    if (res.ok) {
      setCoverPhotoId(photo.id);
      onUpdated({ cover_photo: photo.filename, cover_photo_id: photo.id });
    }
    setSettingCover(null);
  }

  async function handleSaveBio() {
    setSavingBio(true);
    const res = await fetch(`/api/cats/${cat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio }),
    });
    if (res.ok) {
      onUpdated({ bio });
      setEditingBio(false);
    }
    setSavingBio(false);
  }

  const effectiveCoverId = coverPhotoId ?? photos[0]?.id ?? null;

  function handleSheetDragStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    isDragging.current = true;
  }

  function handleSheetDragMove(e: React.TouchEvent) {
    if (!isDragging.current || dragStartY.current === null) return;
    const delta = e.touches[0].clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }

  function handleSheetDragEnd(e: React.TouchEvent) {
    if (!isDragging.current) return;
    isDragging.current = false;
    const velocity = dragY / Math.max(1, Date.now() - dragStartTime.current); // px/ms
    if (dragY > 120 || velocity > 0.5) {
      onClose();
    } else {
      setDragY(0);
    }
    dragStartY.current = null;
  }

  return (
    <>
      {/* Lightbox */}
      {lightboxIndex !== null && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[60] bg-black flex flex-col"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
            <button
              onClick={() => setLightboxIndex(null)}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-white/70 text-sm font-medium">
              {lightboxIndex + 1} / {photos.length}
            </span>
            <div className="w-9" />
          </div>

          {/* Main image */}
          <div className="flex-1 flex items-center justify-center relative px-2 min-h-0">
            {lightboxIndex > 0 && (
              <button
                onClick={() => setLightboxIndex(i => i !== null ? i - 1 : null)}
                className="absolute left-3 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
            )}
            <img
              key={photos[lightboxIndex].id}
              src={`/uploads/${photos[lightboxIndex].filename}`}
              alt=""
              className="max-w-full max-h-full object-contain rounded-xl select-none"
              draggable={false}
            />
            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={() => setLightboxIndex(i => i !== null ? i + 1 : null)}
                className="absolute right-3 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          <div className="flex-shrink-0 pb-safe">
            <div className="flex gap-2 overflow-x-auto px-4 py-3 justify-center">
              {photos.map((p, i) => (
                <button
                  key={p.id}
                  onClick={() => setLightboxIndex(i)}
                  className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    i === lightboxIndex ? "border-white scale-110" : "border-white/30 opacity-60"
                  }`}
                >
                  <img src={`/uploads/${p.filename}`} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sheet modal */}
      <div
        className="fixed inset-0 z-50 flex items-end justify-center"
        style={{ backgroundColor: `rgba(0,0,0,${Math.max(0, 0.6 - dragY / 400)})` }}
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-stone-900 w-full max-w-md rounded-t-3xl flex flex-col"
          style={{
            height: "92dvh",
            transform: `translateY(${dragY}px)`,
            transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.32,0.72,0,1)",
          }}
          onClick={e => e.stopPropagation()}
          onTouchMove={handleSheetDragMove}
          onTouchEnd={handleSheetDragEnd}
        >
          {/* Drag handle — initiates the gesture */}
          <div
            className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleSheetDragStart}
          >
            <div className="w-10 h-1 bg-stone-300 dark:bg-stone-700 rounded-full" />
          </div>

          {/* Header — also draggable */}
          <div
            className="flex items-center justify-between px-5 py-3 border-b border-stone-100 dark:border-stone-800 flex-shrink-0 touch-none"
            onTouchStart={handleSheetDragStart}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cat.emoji}</span>
              <div>
                <div className="text-lg font-bold text-stone-800 dark:text-stone-100 leading-tight">{cat.name}</div>
                <div className="text-xs text-stone-400">{cat.household_name}</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-500 dark:text-stone-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className="p-5 space-y-6 pb-10">

              {/* Upload success toast */}
              {uploadSuccess && (
                <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl px-4 py-2.5 text-sm font-medium">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Photo uploaded!
                </div>
              )}

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                    Photos {photos.length > 0 && <span className="normal-case font-normal">({photos.length})</span>}
                  </div>
                  {canEdit && (
                    <label className={`cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium rounded-xl px-3 py-1.5 transition-colors ${
                      uploading
                        ? "bg-stone-100 dark:bg-stone-800 text-stone-400"
                        : "bg-violet-600 text-white active:bg-violet-700"
                    }`}>
                      {uploading ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          {uploadProgress && uploadProgress.total > 1
                            ? `${uploadProgress.done}/${uploadProgress.total}`
                            : "Uploading…"}
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          Add photos
                        </>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                {photos.length === 0 ? (
                  <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center justify-center py-10 gap-2">
                    <svg className="w-8 h-8 text-stone-300 dark:text-stone-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <p className="text-sm text-stone-400">{canEdit ? "No photos yet — add one above" : "No photos yet"}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((p, i) => {
                      const isCover = p.id === effectiveCoverId;
                      return (
                        <div key={p.id} className="relative aspect-square">
                          <button
                            className="block w-full h-full"
                            onClick={() => setLightboxIndex(i)}
                          >
                            <img
                              src={`/uploads/${p.filename}`}
                              alt=""
                              className={`w-full h-full object-cover rounded-2xl border-2 transition-colors ${isCover ? "border-amber-400" : "border-transparent"}`}
                            />
                          </button>

                          {/* Cover badge */}
                          {isCover && (
                            <div className="absolute bottom-2 left-2 bg-amber-400 rounded-full p-1 shadow pointer-events-none">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                              </svg>
                            </div>
                          )}

                          {canEdit && !isCover && (
                            <button
                              onClick={() => handleSetCover(p)}
                              disabled={settingCover === p.id}
                              title="Set as cover"
                              className="absolute bottom-2 left-2 bg-black/40 rounded-full p-1 shadow disabled:opacity-40"
                            >
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                              </svg>
                            </button>
                          )}

                          {canEdit && (
                            <button
                              onClick={() => handleDeletePhoto(p)}
                              className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full text-xs flex items-center justify-center active:bg-red-500 transition-colors shadow"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">Bio</div>
                  {canEdit && !editingBio && (
                    <button
                      onClick={() => setEditingBio(true)}
                      className="text-sm text-violet-600 dark:text-violet-400 font-medium px-3 py-1 rounded-xl bg-violet-50 dark:bg-violet-900/20 active:bg-violet-100"
                    >
                      {bio ? "Edit" : "Add bio"}
                    </button>
                  )}
                </div>
                {editingBio ? (
                  <div className="space-y-3">
                    <textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell us about this cat..."
                      rows={4}
                      className="w-full border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-3 text-sm bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveBio}
                        disabled={savingBio}
                        className="flex-1 bg-violet-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-50 active:bg-violet-700"
                      >
                        {savingBio ? "Saving…" : "Save"}
                      </button>
                      <button
                        onClick={() => { setEditingBio(false); setBio(cat.bio ?? ""); }}
                        className="flex-1 border border-stone-200 dark:border-stone-700 rounded-xl py-3 text-sm font-medium text-stone-600 dark:text-stone-300 active:bg-stone-50 dark:active:bg-stone-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
                    {bio || <span className="text-stone-400 italic">No bio yet</span>}
                  </p>
                )}
              </div>

              {/* Notes */}
              {cat.notes && (
                <div>
                  <div className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-3">Notes</div>
                  <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">{cat.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
