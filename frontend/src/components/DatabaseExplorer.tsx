"use client";

import React, { useState } from "react";
import { 
  Database, 
  Table, 
  Columns, 
  Search, 
  UploadCloud, 
  Trash2, 
  Eye, 
  RefreshCw, 
  BarChart2, 
  Folder 
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface DatabaseExplorerProps {
  datasets: any[];
  workspaceName?: string;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectTable: (tableName: string) => void;
  onInsertColumn: (colName: string) => void;
  onPreviewTable: (datasetId: string, tableName: string) => void;
  onInspectTable?: (tableName: string) => void;
  onDeleteDataset: (datasetId: string) => void;
  onOpenUpload: () => void;
}

export function DatabaseExplorerComponent({
  datasets,
  workspaceName,
  isLoading,
  onRefresh,
  onSelectTable,
  onInsertColumn,
  onPreviewTable,
  onInspectTable,
  onDeleteDataset,
  onOpenUpload,
}: DatabaseExplorerProps) {
  const { t, language } = useLanguage();
  const [search, setSearch] = useState("");
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toggleTable = (tableId: string) => {
    setExpandedTables((prev) => ({
      ...prev,
      [tableId]: !prev[tableId],
    }));
  };

  const getDataTypeBadge = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("INT") || t.includes("DOUBLE") || t.includes("DECIMAL") || t.includes("FLOAT")) {
      return <span className="text-[9px] px-1 bg-emerald-100 text-emerald-800 border border-emerald-400 font-mono font-bold">NUM</span>;
    }
    if (t.includes("CHAR") || t.includes("TEXT") || t.includes("STRING")) {
      return <span className="text-[9px] px-1 bg-blue-100 text-blue-800 border border-blue-400 font-mono font-bold">TXT</span>;
    }
    if (t.includes("DATE") || t.includes("TIME")) {
      return <span className="text-[9px] px-1 bg-amber-100 text-amber-800 border border-amber-400 font-mono font-bold">DATE</span>;
    }
    if (t.includes("BOOL")) {
      return <span className="text-[9px] px-1 bg-purple-100 text-purple-800 border border-purple-400 font-mono font-bold">BOOL</span>;
    }
    return <span className="text-[9px] px-1 bg-slate-100 text-slate-700 border border-slate-400 font-mono font-bold">ANY</span>;
  };

  const filteredDatasets = datasets.filter((ds) => {
    if (!search) return true;
    const matchName = ds.name.toLowerCase().includes(search.toLowerCase());
    const matchTable = ds.tables?.some((t: any) =>
      t.table_name.toLowerCase().includes(search.toLowerCase()) ||
      t.columns?.some((c: any) => c.column_name.toLowerCase().includes(search.toLowerCase()))
    );
    return matchName || matchTable;
  });

  return (
    <aside className="win-window w-full h-full flex flex-col select-none">
      {/* Windows XP Window Titlebar */}
      <div className="win-titlebar">
        <div className="flex items-center gap-1.5 truncate">
          <Database size={13} className="text-amber-300 flex-shrink-0" />
          <span className="font-bold truncate">{t.sidebar.title}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onRefresh}
            title={t.sidebar.refresh}
            className="win-control-btn"
          >
            <RefreshCw size={10} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={onOpenUpload}
            title={t.sidebar.importCsv}
            className="win-control-btn font-bold text-xs"
          >
            +
          </button>
        </div>
      </div>

      {/* Workspace Location Sub-bar */}
      {workspaceName && (
        <div className="px-2 py-1 bg-[var(--win-surface-alt)] border-b border-[var(--win-border-dark)] flex items-center justify-between text-[11px] text-[var(--win-text-muted)] font-mono">
          <div className="flex items-center gap-1.5 truncate">
            <Folder size={12} className="text-amber-500 fill-amber-500 flex-shrink-0" />
            <span className="truncate text-[var(--win-text)] font-semibold">{workspaceName}</span>
          </div>
          <span className="text-[10px] flex-shrink-0">
            {datasets.length} csv
          </span>
        </div>
      )}

      {/* Toolbar & Search Input */}
      <div className="p-1.5 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <button
            onClick={onOpenUpload}
            className="win-btn win-btn-primary text-xs w-full font-bold py-1"
          >
            <UploadCloud size={12} />
            <span>{t.sidebar.importCsv}</span>
          </button>
        </div>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-2 text-[var(--win-text-muted)]" />
          <input
            type="text"
            placeholder={t.sidebar.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="win-inset w-full pl-6 pr-2 py-1 text-xs text-[var(--win-text)] focus:outline-none"
          />
        </div>
      </div>

      {/* Dataset & Table Tree (Sunken Panel) */}
      <div className="flex-1 overflow-y-auto win-inset m-1 p-1 space-y-1.5">
        {filteredDatasets.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-[var(--win-text-muted)] mb-2">{t.sidebar.noDatasets}</p>
            <button
              onClick={onOpenUpload}
              className="win-btn text-xs font-bold"
            >
              <UploadCloud size={12} />
              <span>{t.sidebar.importCsv}</span>
            </button>
          </div>
        ) : (
          filteredDatasets.map((ds) => (
            <div key={ds.id} className="win-outset p-1 text-xs">
              {/* Dataset Header */}
              <div className="flex items-center justify-between px-1 py-0.5 border-b border-[var(--win-border-medium)] bg-[var(--win-surface-alt)] font-bold">
                <div className="flex items-center gap-1 truncate">
                  <Folder size={12} className="text-amber-500 fill-amber-500 flex-shrink-0" />
                  <span className="truncate uppercase text-[10px] tracking-wide">{ds.name}</span>
                </div>
                {confirmDeleteId === ds.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(null);
                        onDeleteDataset(ds.id);
                      }}
                      className="win-btn win-btn-primary text-[10px] !bg-rose-600 !border-rose-400 text-white"
                    >
                      {t.sidebar.deleteConfirm}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(null);
                      }}
                      className="win-btn text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmDeleteId(ds.id);
                    }}
                    title={language === "id" ? "Hapus Dataset" : "Delete Dataset"}
                    className="win-btn text-rose-600 !p-0.5 !w-5 !h-5"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>

              {/* Tables inside Dataset */}
              <div className="space-y-1 mt-1 pl-1">
                {ds.tables?.map((table: any) => {
                  const isExpanded = expandedTables[table.id] ?? true;
                  return (
                    <div key={table.id} className="border border-[var(--win-border-medium)] bg-[var(--win-inset-bg)]">
                      {/* Table row */}
                      <div className="flex items-center justify-between p-1 hover:bg-[var(--win-surface-alt)]">
                        <button
                          onClick={() => toggleTable(table.id)}
                          className="flex items-center gap-1 text-xs font-semibold truncate flex-1 text-left"
                        >
                          <span className="text-[10px] font-mono w-3 text-center">
                            {isExpanded ? "▼" : "►"}
                          </span>
                          <Table size={12} className="text-blue-600 flex-shrink-0" />
                          <span className="truncate">{table.table_name}</span>
                        </button>

                        <div className="flex items-center gap-0.5">
                          <span className="text-[10px] text-[var(--win-text-muted)] font-mono mr-1">
                            {table.row_count?.toLocaleString()}r
                          </span>
                          <button
                            onClick={() => onPreviewTable(ds.id, table.table_name)}
                            title={t.sidebar.preview}
                            className="win-btn !p-0.5 !w-5 !h-5 text-blue-600"
                          >
                            <Eye size={11} />
                          </button>
                          {onInspectTable && (
                            <button
                              onClick={() => onInspectTable(table.table_name)}
                              title={t.sidebar.inspectStats}
                              className="win-btn !p-0.5 !w-5 !h-5 text-indigo-600"
                            >
                              <BarChart2 size={11} />
                            </button>
                          )}
                          <button
                            onClick={() => onSelectTable(table.table_name)}
                            title={t.sidebar.insertSelect}
                            className="win-btn text-[10px] font-bold !py-0.5 !px-1 text-emerald-700"
                          >
                            SQL
                          </button>
                        </div>
                      </div>

                      {/* Columns list */}
                      {isExpanded && (
                        <div className="border-t border-[var(--win-border-medium)] bg-[var(--win-surface)] p-1 space-y-0.5">
                          {table.columns?.map((col: any) => (
                            <div
                              key={col.column_name}
                              onClick={() => onInsertColumn(col.column_name)}
                              title={t.sidebar.insertCol}
                              className="flex items-center justify-between px-1.5 py-0.5 hover:bg-[var(--win-surface-alt)] cursor-pointer text-[11px]"
                            >
                              <div className="flex items-center gap-1 truncate">
                                <Columns size={10} className="text-[var(--win-text-muted)] flex-shrink-0" />
                                <span className="font-mono text-[10px] truncate">{col.column_name}</span>
                              </div>
                              {getDataTypeBadge(col.data_type || "VARCHAR")}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Retro Status strip at bottom of sidebar */}
      <div className="win-status-bar px-2 py-0.5 justify-between text-[10px]">
        <span>{filteredDatasets.length} {t.sidebar.datasetsCount}</span>
        <span>DuckDB In-Memory</span>
      </div>
    </aside>
  );
}

export const DatabaseExplorer = React.memo(DatabaseExplorerComponent);
