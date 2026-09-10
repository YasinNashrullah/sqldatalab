"use client";

import React, { useState, useMemo } from "react";
import { 
  Bookmark, 
  Search, 
  Trash2, 
  ArrowUpRight, 
  Tag 
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface SavedQueryItem {
  id: string;
  title: string;
  description?: string;
  query_text: string;
  tags?: string[];
  tags_json?: string;
  created_at: string;
}

interface SavedQueriesDrawerProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onLoadSQL: (sql: string) => void;
}

export function SavedQueriesDrawer({
  isOpen,
  workspaceId,
  onClose,
  onLoadSQL,
}: SavedQueriesDrawerProps) {
  const { t } = useLanguage();
  const [queries, setQueries] = useState<SavedQueryItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && workspaceId) {
      loadQueries();
    }
  }, [isOpen, workspaceId]);

  const loadQueries = async () => {
    if (!workspaceId) return;
    try {
      const res = await api.getSavedQueries(workspaceId);
      setQueries(res?.saved_queries || []);
    } catch {
      // Saved queries load failed silently
    }
  };

  const handleDelete = async (id: string) => {
    const prevQueries = [...queries];
    setQueries((prev) => prev.filter((q) => q.id !== id));
    try {
      await api.deleteSavedQuery(id);
    } catch {
      setQueries(prevQueries);
    }
  };

  const getTags = (q: SavedQueryItem): string[] => {
    let raw: any[] = [];
    if (Array.isArray(q.tags) && q.tags.length > 0) {
      raw = q.tags;
    } else if (q.tags_json) {
      try {
        const parsed = JSON.parse(q.tags_json);
        if (Array.isArray(parsed)) raw = parsed;
      } catch {
        raw = [];
      }
    }
    return raw
      .map((t) => String(t).trim().replace(/^#/, ""))
      .filter(Boolean);
  };

  // Collect all unique tags across all saved queries
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    queries.forEach((q) => {
      getTags(q).forEach((t) => tagsSet.add(t));
    });
    return Array.from(tagsSet).sort();
  }, [queries]);

  if (!isOpen) return null;

  const filtered = queries.filter((q) => {
    const tags = getTags(q);
    const searchLower = search.trim().toLowerCase();
    const matchesSearch =
      !searchLower ||
      q.title.toLowerCase().includes(searchLower) ||
      q.query_text.toLowerCase().includes(searchLower) ||
      tags.some((t) => t.toLowerCase().includes(searchLower.replace(/^#/, "")));

    const cleanSelectedTag = selectedTag ? selectedTag.trim().toLowerCase().replace(/^#/, "") : null;
    const matchesTag =
      !cleanSelectedTag ||
      tags.some((t) => t.toLowerCase() === cleanSelectedTag);

    return matchesSearch && matchesTag;
  });

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn flex justify-end select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-md h-full flex flex-col shadow-2xl p-0 border-y-0 border-r-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Bookmark size={14} className="text-amber-300" />
            <span className="font-bold">{t.savedQueries.title} ({queries.length})</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.savedQueries.close}
          >
            ✕
          </button>
        </div>

        {/* Search Bar & Tag Filter Pills */}
        <div className="p-2 border-b border-[var(--win-border-dark)] space-y-1.5 bg-[var(--win-surface)]">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-[var(--win-text-muted)]" />
            <input
              type="text"
              placeholder={t.savedQueries.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="win-inset w-full pl-6 pr-2 py-1 text-xs text-[var(--win-text)] focus:outline-none"
            />
          </div>

          {/* Tag Pills */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
              <button
                onClick={() => setSelectedTag(null)}
                className={`win-btn text-[10px] !px-1.5 !py-0.5 ${
                  selectedTag === null ? "win-inset font-bold" : ""
                }`}
              >
                {t.savedQueries.allTags}
              </button>
              {allTags.map((t) => {
                const isSelected = selectedTag?.toLowerCase().replace(/^#/, "") === t.toLowerCase();
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedTag(isSelected ? null : t)}
                    className={`win-btn text-[10px] !px-1.5 !py-0.5 flex items-center gap-0.5 transition cursor-pointer select-none ${
                      isSelected
                        ? "win-inset font-bold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 border border-blue-500"
                        : ""
                    }`}
                  >
                    <Tag size={9} />
                    <span>#{t}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Query List (Sunken Panel) */}
        <div className="flex-1 overflow-y-auto win-inset m-1 p-1.5 space-y-1.5 bg-[var(--win-inset-bg)]">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--win-text-muted)] space-y-1">
              <p className="font-bold">{t.savedQueries.empty}</p>
            </div>
          ) : (
            filtered.map((q) => {
              const tags = getTags(q);
              return (
                <div
                  key={q.id}
                  className="win-outset p-2 text-xs space-y-1.5 bg-[var(--win-surface)]"
                >
                  <div className="flex items-start justify-between gap-1">
                    <div>
                      <h4 className="text-xs font-bold text-[var(--win-text)]">{q.title}</h4>
                      {q.description && (
                        <p className="text-[11px] text-[var(--win-text-muted)] mt-0.5">{q.description}</p>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.map((tg, idx) => (
                            <span
                              key={idx}
                              className="px-1 py-0.2 text-[9px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-400"
                            >
                              #{tg.replace(/^#/, "")}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="win-btn !p-0.5 !w-5 !h-5 text-rose-600"
                      title={t.savedQueries.deleteConfirm}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <pre className="win-inset p-2 font-mono text-[11px] max-h-24 overflow-x-auto whitespace-pre-wrap select-text bg-[var(--win-inset-bg)] text-[var(--win-text)]">
                    {q.query_text}
                  </pre>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-[var(--win-text-muted)] font-mono">
                      {new Date(q.created_at).toLocaleDateString()}
                    </span>
                    <button
                      onClick={() => {
                        onLoadSQL(q.query_text);
                        onClose();
                      }}
                      className="win-btn text-[11px] font-bold text-blue-700"
                    >
                      <span>{t.savedQueries.loadToEditor}</span>
                      <ArrowUpRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
