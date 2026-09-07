"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  Network, 
  RefreshCw, 
  Search, 
  Table, 
  Key, 
  Link2, 
  ExternalLink,
  Columns,
  AlertCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface SchemaDiagramModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  onSelectTable: (tableName: string) => void;
}

export function SchemaDiagramModal({
  isOpen,
  onClose,
  workspaceId,
  onSelectTable,
}: SchemaDiagramModalProps) {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const loadGraph = useCallback(async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await api.getSchemaGraph(workspaceId);
      setGraphData(res);
    } catch (err: any) {
      console.error("Failed to load schema graph:", err);
      setErrorMsg(language === "id" ? "Gagal memuat relasi skema database." : "Failed to load database schema relationships.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, language]);

  useEffect(() => {
    if (isOpen) {
      loadGraph();
    }
  }, [isOpen, loadGraph]);

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return graphData.nodes;
    const term = searchTerm.toLowerCase();
    return graphData.nodes.filter(
      (node) =>
        node.table_name.toLowerCase().includes(term) ||
        node.columns?.some((c: any) => c.name.toLowerCase().includes(term))
    );
  }, [graphData.nodes, searchTerm]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl p-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Network size={14} className="text-amber-300" />
            <span className="font-bold">{t.erd.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.erd.close}
          >
            ✕
          </button>
        </div>

        {/* Toolbar & Filter Strip */}
        <div className="p-2 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <div className="win-inset flex items-center gap-1.5 px-2 py-1 bg-[var(--win-inset-bg)] w-full">
              <Search size={12} className="text-[var(--win-text-muted)] shrink-0" />
              <input
                type="text"
                placeholder={t.erd.filterPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-transparent text-xs text-[var(--win-text)] focus:outline-none placeholder-[var(--win-text-muted)]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="win-status-panel text-xs font-mono">
              <span>{t.erd.stats(graphData.nodes.length, graphData.edges.length)}</span>
            </div>
            <button
              onClick={loadGraph}
              title={t.erd.refresh}
              className="win-btn text-xs py-0.5"
            >
              <RefreshCw size={12} className={loading ? "animate-spin text-blue-700" : ""} />
              <span>{t.erd.refresh}</span>
            </button>
          </div>
        </div>

        {/* Diagram Area (Sunken) */}
        <div className="flex-1 overflow-auto m-2 p-3 win-inset bg-[var(--win-inset-bg)] space-y-4">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--win-text-muted)] space-y-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">{t.erd.mapping}</p>
            </div>
          ) : errorMsg ? (
            <div className="p-3 win-inset bg-rose-50 border border-rose-400 text-rose-900 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          ) : graphData.nodes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[var(--win-text-muted)] space-y-1">
              <Table size={32} className="mb-2 opacity-50" />
              <p className="text-xs font-bold text-[var(--win-text)]">{t.erd.noTables}</p>
              <p className="text-[11px]">{t.erd.noTablesSub}</p>
            </div>
          ) : (
            <>
              {/* Tables Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredNodes.map((node) => (
                  <div
                    key={node.id}
                    className="win-window shadow-sm overflow-hidden flex flex-col"
                  >
                    {/* Table Card Titlebar */}
                    <div className="win-titlebar flex items-center justify-between text-xs py-1 px-2">
                      <div className="flex items-center gap-1.5 truncate">
                        <Table size={12} className="text-amber-300 shrink-0" />
                        <span className="truncate">{node.table_name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono opacity-90">
                          {node.row_count?.toLocaleString()} {t.common.rows}
                        </span>
                        <button
                          onClick={() => {
                            onSelectTable(node.table_name);
                            onClose();
                          }}
                          title={t.erd.queryTable}
                          className="win-control-btn text-[10px]"
                        >
                          <ExternalLink size={9} />
                        </button>
                      </div>
                    </div>

                    {/* Columns List */}
                    <div className="p-1.5 space-y-0.5 max-h-52 overflow-y-auto font-mono text-[11px] bg-[var(--win-inset-bg)]">
                      {node.columns?.map((col: any) => (
                        <div
                          key={col.name}
                          className="flex items-center justify-between px-1.5 py-0.5 hover:bg-blue-50 transition text-[var(--win-text)]"
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            {col.is_pk_hint ? (
                              <Key size={11} className="text-amber-600 shrink-0" />
                            ) : col.is_fk_hint ? (
                              <Link2 size={11} className="text-blue-700 shrink-0" />
                            ) : (
                              <Columns size={11} className="text-[var(--win-text-muted)] shrink-0" />
                            )}
                            <span className={`truncate ${col.is_pk_hint ? "font-bold text-amber-800" : ""}`}>
                              {col.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            {col.is_pk_hint && (
                              <span className="px-1 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-400">
                                PK
                              </span>
                            )}
                            {col.is_fk_hint && (
                              <span className="px-1 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-900 border border-blue-400">
                                FK
                              </span>
                            )}
                            <span className="text-[10px] text-[var(--win-text-muted)]">{col.type}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Inferred Relationships Summary */}
              {graphData.edges.length > 0 && (
                <div className="p-2.5 win-outset bg-[var(--win-surface)] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                    <Link2 size={13} />
                    <span>{t.erd.detectedRelations}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {graphData.edges.map((edge) => (
                      <div
                        key={edge.id}
                        className="win-inset p-1.5 text-[11px] font-mono flex items-center justify-between bg-[var(--win-inset-bg)] text-[var(--win-text)]"
                      >
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-blue-700 font-bold">{edge.from_table}</span>
                          <span className="text-[var(--win-text-muted)]">.{edge.from_column}</span>
                          <span className="text-emerald-700 mx-1">➔</span>
                          <span className="text-emerald-700 font-bold">{edge.to_table}</span>
                          <span className="text-[var(--win-text-muted)]">.{edge.to_column}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="win-btn text-xs px-4 py-1 font-bold"
          >
            {t.erd.close}
          </button>
        </div>
      </div>
    </div>
  );
}
