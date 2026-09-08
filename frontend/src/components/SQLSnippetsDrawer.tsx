"use client";

import React, { useState } from "react";
import { 
  BookOpen, 
  Search, 
  Copy, 
  Check, 
  ArrowRight, 
  Sparkles, 
  Code2
} from "lucide-react";
import { SQL_SNIPPETS } from "@/lib/snippets";
import { useLanguage } from "@/lib/i18n";

interface SQLSnippetsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSQL: (sql: string, replace?: boolean) => void;
}

export function SQLSnippetsDrawer({
  isOpen,
  onClose,
  onInsertSQL,
}: SQLSnippetsDrawerProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const categories = [
    { key: "ALL", label: t.snippets.allCategories },
    { key: "window", label: "Window Functions" },
    { key: "timeseries", label: language === "id" ? "Time-Series & Tanggal" : "Time-Series & Dates" },
    { key: "aggregations", label: language === "id" ? "Agregasi & Pivot" : "Aggregations & Pivots" },
    { key: "analytics", label: language === "id" ? "Analisis Lanjutan" : "Advanced Analytics" },
    { key: "cleaning", label: language === "id" ? "Pembersihan Data" : "Data Cleaning" },
  ];

  const filteredSnippets = SQL_SNIPPETS.filter((s) => {
    const matchCat = selectedCategory === "ALL" || s.categoryKey === selectedCategory;
    const title = language === "id" ? s.title : s.title_en;
    const desc = language === "id" ? s.description : s.description_en;
    const useCase = language === "id" ? s.useCase : s.useCase_en;

    const matchQuery =
      !search ||
      title.toLowerCase().includes(search.toLowerCase()) ||
      desc.toLowerCase().includes(search.toLowerCase()) ||
      useCase.toLowerCase().includes(search.toLowerCase()) ||
      s.sql.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchQuery;
  });

  const handleCopy = (sql: string, id: string) => {
    navigator.clipboard.writeText(sql);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn flex justify-end select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-xl h-full flex flex-col shadow-2xl p-0 border-y-0 border-r-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <BookOpen size={14} className="text-amber-300" />
            <span className="font-bold">
              {t.snippets.title} ({SQL_SNIPPETS.length} {language === "id" ? "item" : "items"})
            </span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.snippets.close}
          >
            ✕
          </button>
        </div>

        {/* Sub-banner */}
        <div className="win-status-bar px-2 py-1 justify-between text-xs border-b border-[var(--win-border-dark)]">
          <span>{t.snippets.subTitle}</span>
          <span className="font-mono text-[10px]">{t.snippets.displayed(filteredSnippets.length)}</span>
        </div>

        {/* Search & Category Filter */}
        <div className="p-2 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] space-y-1.5">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-2 text-[var(--win-text-muted)]" />
            <input
              type="text"
              placeholder={t.snippets.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="win-inset w-full pl-6 pr-2 py-1 text-xs text-[var(--win-text)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px]">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key)}
                className={`win-btn text-[10px] !px-1.5 !py-0.5 whitespace-nowrap ${
                  selectedCategory === cat.key ? "win-inset font-bold text-blue-700" : ""
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Snippet List (Sunken Panel) */}
        <div className="flex-1 overflow-y-auto win-inset m-1 p-2 space-y-2 bg-[var(--win-inset-bg)]">
          {filteredSnippets.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--win-text-muted)] space-y-2">
              <Code2 size={24} className="mx-auto opacity-40" />
              <p className="font-bold">{t.snippets.noSnippets}</p>
            </div>
          ) : (
            filteredSnippets.map((snip) => {
              const currentTitle = language === "id" ? snip.title : snip.title_en;
              const currentCategory = language === "id" ? snip.category : snip.category_en;
              const currentDesc = language === "id" ? snip.description : snip.description_en;
              const currentUseCase = language === "id" ? snip.useCase : snip.useCase_en;

              return (
                <div
                  key={snip.id}
                  className="win-outset p-2.5 text-xs space-y-2 bg-[var(--win-surface)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-bold text-[var(--win-text)]">{currentTitle}</h3>
                        <span className="text-[9px] px-1 py-0.2 font-mono font-bold bg-blue-100 text-blue-800 border border-blue-400">
                          {currentCategory}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--win-text-muted)] mt-0.5 leading-relaxed">
                        {currentDesc}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(snip.sql, snip.id)}
                      title={t.snippets.copy}
                      className="win-btn !p-1 text-xs shrink-0"
                    >
                      {copiedId === snip.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    </button>
                  </div>

                  {currentUseCase && (
                    <div className="text-[10px] text-blue-800 bg-blue-50 border border-blue-300 p-1 flex items-center gap-1">
                      <Sparkles size={11} className="text-blue-600 shrink-0" />
                      <span><strong>{t.snippets.useCase}</strong> {currentUseCase}</span>
                    </div>
                  )}

                  {/* SQL Code Preview */}
                  <pre className="win-inset p-2 text-[11px] font-mono text-[var(--win-text)] bg-[var(--win-inset-bg)] max-h-36 overflow-x-auto whitespace-pre leading-relaxed select-text">
                    {snip.sql}
                  </pre>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        onInsertSQL(snip.sql, false);
                        onClose();
                      }}
                      className="win-btn text-[11px]"
                    >
                      <span>{t.snippets.insertEditor}</span>
                    </button>

                    <button
                      onClick={() => {
                        onInsertSQL(snip.sql, true);
                        onClose();
                      }}
                      className="win-btn win-btn-primary font-bold text-[11px] flex items-center gap-1"
                    >
                      <span>{t.snippets.replaceEditor}</span>
                      <ArrowRight size={11} />
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
