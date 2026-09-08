"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/i18n";
import { api, DatasetTemplate, DatasetTableInfo } from "@/lib/api";

interface DatasetGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceCount: number;
  onWorkspaceCreated: (workspaceId: string, sampleQuery?: string) => void;
}

export const DatasetGalleryModal: React.FC<DatasetGalleryModalProps> = ({
  isOpen,
  onClose,
  workspaceCount,
  onWorkspaceCreated,
}) => {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState<DatasetTemplate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);
  const [expandedTablesId, setExpandedTablesId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    api
      .listDatasetTemplates()
      .then((res) => {
        if (isMounted) {
          setTemplates(res.templates || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Gagal memuat template dataset.");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    templates.forEach((tpl) => {
      if (tpl.category) set.add(tpl.category);
    });
    return ["All", ...Array.from(set)];
  }, [templates]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchCategory =
        selectedCategory === "All" || tpl.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        (tpl.folder_path && tpl.folder_path.toLowerCase().includes(q)) ||
        (tpl.tables || []).some(
          (tbl: DatasetTableInfo) =>
            tbl.table_name.toLowerCase().includes(q) ||
            tbl.filename.toLowerCase().includes(q) ||
            tbl.columns.some((c: string) => c.toLowerCase().includes(q))
        );
      return matchCategory && matchSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleUseTemplate = async (template: DatasetTemplate) => {
    if (workspaceCount >= 3) {
      alert(t.datasetGallery.quotaWarning);
      return;
    }

    setUsingTemplateId(template.id);
    try {
      const result = await api.useDatasetTemplate(template.id);
      onWorkspaceCreated(result.workspace_id, result.sample_query);
      onClose();
    } catch (err: any) {
      alert(err.message || "Gagal membuat workspace dari template.");
    } finally {
      setUsingTemplateId(null);
    }
  };

  const handleDownload = (templateId: string) => {
    const url = api.getTemplateDownloadUrl(templateId);
    window.open(url, "_blank");
  };

  const handleDownloadSingleTable = (templateId: string, filename: string) => {
    const url = api.getTemplateDownloadUrl(templateId, filename);
    window.open(url, "_blank");
  };

  const handleCopyQuery = (id: string, query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  if (!isOpen) return null;

  const isQuotaFull = workspaceCount >= 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn select-none"
      onClick={onClose}
    >
      <div
        className="win-window w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden animate-scaleUp bg-[var(--win-surface)] text-[var(--win-text)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Titlebar */}
        <div className="win-titlebar flex items-center justify-between px-3 py-1.5 text-white select-none">
          <div className="flex items-center gap-2 font-bold text-sm tracking-wide">
            <span className="text-base">📁</span>
            <span>{t.datasetGallery.title}</span>
            <span className="text-xs bg-blue-900/60 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-blue-400/40 dark:border-slate-600 text-blue-100 dark:text-slate-300 font-mono">
              {templates.length} Paket Dataset
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClose}
              className="win-control-btn win-close"
              title={t.datasetGallery.close}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-[var(--win-surface)] p-3 border-b border-[var(--win-border-dark)] flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-[var(--win-text-muted)] font-medium">
                {t.datasetGallery.subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Quota indicator */}
              <div
                className={`text-xs px-2.5 py-1 rounded border font-semibold flex items-center gap-1.5 ${
                  isQuotaFull
                    ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800"
                    : "bg-[var(--win-surface-alt)] text-[var(--win-text)] border-[var(--win-border-medium)]"
                }`}
              >
                <span>{isQuotaFull ? "⚠️" : "💼"}</span>
                <span>Workspace: {workspaceCount} / 3</span>
                {isQuotaFull && <span className="font-bold">({t.datasetGallery.quotaFull})</span>}
              </div>
            </div>
          </div>

          {/* Search & Categories */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder={t.datasetGallery.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full win-inset px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] placeholder-[var(--win-text-muted)] border border-[var(--win-border-dark)] rounded outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1.5 text-xs text-[var(--win-text-muted)] hover:text-[var(--win-text)]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-thin">
              {categories.map((cat) => {
                const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-xs rounded-full border transition whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? "bg-[#0055ea] dark:bg-blue-600 text-white border-blue-700 dark:border-blue-500 font-bold shadow-sm"
                        : "bg-[var(--win-surface-alt)] text-[var(--win-text)] border-[var(--win-border-medium)] hover:bg-[var(--win-surface)]"
                    }`}
                  >
                    {cat === "All" ? t.datasetGallery.filterAll : cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quota full warning banner */}
        {isQuotaFull && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-300 dark:border-amber-800 px-3 py-1.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <span>ℹ️</span>
            <span>{t.datasetGallery.quotaWarning}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 bg-[var(--win-inset-bg)] text-[var(--win-text)]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-[var(--win-text-muted)] py-16">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">{t.common.loading}</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded text-xs text-center font-semibold">
              <p className="font-bold mb-1">Error</p>
              <p>{error}</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-[var(--win-text-muted)] text-xs">
              <span className="text-3xl block mb-2">🔍</span>
              <p className="font-medium">Tidak ada template dataset yang sesuai dengan pencarian Anda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTemplates.map((tpl) => {
                const isProcessing = usingTemplateId === tpl.id;
                const isCopied = copiedQueryId === tpl.id;
                const isExpanded = expandedTablesId === tpl.id;

                return (
                  <div
                    key={tpl.id}
                    className="win-window bg-[var(--win-surface)] p-3.5 flex flex-col justify-between text-[var(--win-text)] shadow-xs"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">📁</span>
                          <div>
                            <h3 className="font-bold text-sm text-[var(--win-text)]">
                              {tpl.name}
                            </h3>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono bg-[var(--win-surface-alt)] px-1.5 py-0.2 rounded border border-[var(--win-border-medium)]">
                              sample_data/dataset/{tpl.folder_path}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 shrink-0">
                          {tpl.category}
                        </span>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-[var(--win-text-muted)] mb-2.5 line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>

                      {/* Metrics Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-[var(--win-surface-alt)] text-blue-700 dark:text-blue-300 border border-[var(--win-border-medium)] rounded font-bold">
                          🗂️ {t.datasetGallery.tablesBadge(tpl.total_tables)}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] font-mono bg-[var(--win-surface-alt)] text-emerald-700 dark:text-emerald-300 border border-[var(--win-border-medium)] rounded font-bold">
                          📊 {t.datasetGallery.rowsBadge(tpl.total_rows)}
                        </span>
                      </div>

                      {/* Included Tables Section */}
                      <div className="mb-3 bg-[var(--win-surface-alt)] p-2 rounded border border-[var(--win-border-medium)]">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-[var(--win-text-muted)] uppercase tracking-wider">
                            {t.datasetGallery.includedTables}
                          </span>
                          <button
                            onClick={() => setExpandedTablesId(isExpanded ? null : tpl.id)}
                            className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                          >
                            {isExpanded ? "Sembunyikan Kolom ▲" : "Lihat Kolom ▼"}
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {tpl.tables.map((tbl: DatasetTableInfo) => (
                            <div
                              key={tbl.table_name}
                              className="bg-[var(--win-surface)] p-1.5 rounded border border-[var(--win-border-medium)] text-xs text-[var(--win-text)]"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                    📊 {tbl.table_name}
                                  </span>
                                  <span className="text-[10px] text-[var(--win-text-muted)] font-mono">
                                    ({tbl.row_count} baris, {tbl.column_count} kol)
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleDownloadSingleTable(tpl.id, tbl.filename)}
                                  className="text-[10px] text-[var(--win-text-muted)] hover:text-blue-600 dark:hover:text-blue-400 font-mono hover:underline"
                                  title={`Unduh ${tbl.filename}`}
                                >
                                  📥 {tbl.filename}
                                </button>
                              </div>

                              {/* Expanded columns list */}
                              {isExpanded && (
                                <div className="mt-1 pt-1 border-t border-[var(--win-border-medium)] flex flex-wrap gap-1">
                                  {tbl.columns.map((c: string) => (
                                    <span
                                      key={c}
                                      className="text-[9px] font-mono px-1 py-0.2 bg-[var(--win-inset-bg)] text-[var(--win-text-muted)] rounded border border-[var(--win-border-medium)]"
                                    >
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Sample Query snippet */}
                      <div className="mb-3 win-inset bg-[var(--win-surface-alt)] p-2 rounded text-[11px] font-mono relative border border-[var(--win-border-dark)]">
                        <div className="flex items-center justify-between mb-1 text-[10px] text-[var(--win-text-muted)]">
                          <span className="font-bold">⚡ {t.datasetGallery.sampleQuery}</span>
                          <button
                            onClick={() => handleCopyQuery(tpl.id, tpl.sample_query)}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] font-semibold"
                          >
                            {isCopied ? "✓ Disalin" : "Salin SQL"}
                          </button>
                        </div>
                        <code className="text-emerald-700 dark:text-emerald-400 font-semibold block line-clamp-2 selection:bg-emerald-200 dark:selection:bg-emerald-900">
                          {tpl.sample_query}
                        </code>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--win-border-medium)]">
                      <button
                        onClick={() => handleDownload(tpl.id)}
                        className="win-btn flex-1 py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 font-medium"
                        title={tpl.total_tables > 1 ? t.datasetGallery.downloadZip : t.datasetGallery.downloadCsv}
                      >
                        <span>📥</span>
                        <span>{tpl.total_tables > 1 ? t.datasetGallery.downloadZip : t.datasetGallery.downloadCsv}</span>
                      </button>

                      <button
                        onClick={() => handleUseTemplate(tpl)}
                        disabled={isQuotaFull || isProcessing}
                        className={`win-btn flex-1 py-1.5 px-2 text-xs flex items-center justify-center gap-1.5 font-bold transition ${
                          isQuotaFull
                            ? "opacity-50 cursor-not-allowed"
                            : "bg-[#0055ea] dark:bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500"
                        }`}
                        title={
                          isQuotaFull
                            ? t.datasetGallery.quotaFull
                            : t.datasetGallery.useInWorkspace
                        }
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>{t.datasetGallery.usingTemplate}</span>
                          </>
                        ) : (
                          <>
                            <span>⚡</span>
                            <span>{t.datasetGallery.useInWorkspace}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer / Status bar */}
        <div className="win-status-bar bg-[var(--win-surface)] px-3 py-1.5 border-t border-[var(--win-border-dark)] flex items-center justify-between text-xs text-[var(--win-text-muted)] select-none">
          <div className="flex items-center gap-2">
            <span>💾 {templates.length} Paket Dataset Relasional</span>
            <span>•</span>
            <span>DuckDB In-Memory Multi-Table Engine</span>
          </div>
          <button
            onClick={onClose}
            className="win-btn px-4 py-1 text-xs font-semibold"
          >
            {t.datasetGallery.close}
          </button>
        </div>
      </div>
    </div>
  );
};
