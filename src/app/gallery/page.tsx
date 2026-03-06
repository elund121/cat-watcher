"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Cat } from "@/types";
import CatProfileModal from "@/components/CatProfileModal";

function GalleryContent() {
  const searchParams = useSearchParams();
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<Cat | null>(null);

  const loadCats = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const res = await fetch("/api/cats");
    if (res.ok) {
      const data: Cat[] = await res.json();
      setCats(data);
      const targetId = searchParams.get("cat");
      if (targetId) {
        const match = data.find(c => c.id === targetId);
        if (match) setSelectedCat(match);
      }
    }
    setLoading(false);
  }, [searchParams]);

  useEffect(() => { loadCats(); }, [loadCats]);

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

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-stone-800 dark:text-stone-100 mb-4">Gallery</h1>

      {cats.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <div className="text-5xl mb-3">🐱</div>
          <p>No cats yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cats.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat)}
              className="bg-white dark:bg-stone-900 border border-stone-100 dark:border-stone-800 rounded-2xl overflow-hidden text-left shadow-sm hover:shadow-md transition-shadow"
            >
              {cat.cover_photo ? (
                <img
                  src={`/uploads/${cat.cover_photo}`}
                  alt={cat.name}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-5xl">
                  {cat.emoji}
                </div>
              )}
              <div className="p-2">
                <div className="font-medium text-stone-800 dark:text-stone-100 truncate">{cat.name}</div>
                <div className="text-xs text-stone-400 truncate">{cat.household_name}</div>
                {cat.bio && <div className="text-xs text-stone-500 truncate mt-0.5">{cat.bio}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedCat && (
        <CatProfileModal
          cat={selectedCat}
          canEdit={!!selectedCat.viewer_is_member}
          onClose={() => setSelectedCat(null)}
          onUpdated={(updated) => {
            const id = selectedCat.id;
            setCats(prev => prev.map(c => c.id === id ? { ...c, ...updated } : c));
            setSelectedCat(prev => prev ? { ...prev, ...updated } : null);
          }}
        />
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryContent />
    </Suspense>
  );
}
