"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  Search, 
  Play, 
  Trophy, 
  History, 
  Bookmark, 
  User, 
  Layers, 
  BookOpen, 
  Network, 
  UploadCloud, 
  AlignLeft, 
  CaseUpper, 
  Activity, 
  Sparkles, 
  Trash2, 
  Table, 
  Download, 
  Copy, 
  ArrowRight,
  Info
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export interface CommandItem {
  id: string;
  category: "Navigation" | "Workspaces" | "Query Actions" | "Tables" | "Export";
  title: string;
  subtitle?: string;
  shortcut?: string;
  icon: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: any[];
  currentWorkspace: any;
  tables: { tableName: string; rowCount?: number }[];
  onSelectWorkspace: (ws: any) => void;
  onOpenUpload: () => void;
  onOpenChallenges: () => void;
  onOpenSavedQueries: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onOpenWorkspaceModal: () => void;
  onOpenSnippets: () => void;
  onOpenDiagram: () => void;
  onExecuteSQL: () => void;
  onFormatSQL: () => void;
  onUppercaseSQL: () => void;
  onExplainPlan: () => void;
  onExplainAI: () => void;
  onClearSQL: () => void;
  onSelectTable: (tableName: string) => void;
  onCopyCSV: () => void;
  onCopyMarkdown: () => void;
  onDownloadCSV: () => void;
  onDownloadJSON: () => void;
  onOpenAdvancedExport?: () => void;
  onOpenAbout?: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  workspaces,
  currentWorkspace,
  tables,
  onSelectWorkspace,
  onOpenUpload,
  onOpenChallenges,
  onOpenSavedQueries,
  onOpenHistory,
  onOpenProfile,
  onOpenWorkspaceModal,
  onOpenSnippets,
  onOpenDiagram,
  onOpenAbout,
  onExecuteSQL,
  onFormatSQL,
  onUppercaseSQL,
  onExplainPlan,
  onExplainAI,
  onClearSQL,
  onSelectTable,
  onCopyCSV,
  onCopyMarkdown,
  onDownloadCSV,
  onDownloadJSON,
  onOpenAdvancedExport,
}: CommandPaletteProps) {
  const { language, t } = useLanguage();
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command items list
  const commands: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [
      // SQL Actions
      {
        id: "act_run",
        category: "Query Actions",
        title: t.commandPalette.actRunTitle,
        subtitle: t.commandPalette.actRunSub,
        shortcut: "Ctrl+Enter",
        icon: <Play size={14} className="text-emerald-400" />,
        action: onExecuteSQL,
      },
      {
        id: "act_format",
        category: "Query Actions",
        title: t.commandPalette.actFormatTitle,
        subtitle: t.commandPalette.actFormatSub,
        icon: <AlignLeft size={14} className="text-cyan-400" />,
        action: onFormatSQL,
      },
      {
        id: "act_upper",
        category: "Query Actions",
        title: t.commandPalette.actUpperTitle,
        subtitle: t.commandPalette.actUpperSub,
        icon: <CaseUpper size={14} className="text-indigo-400" />,
        action: onUppercaseSQL,
      },
      {
        id: "act_explain_plan",
        category: "Query Actions",
        title: t.commandPalette.actExplainTitle,
        subtitle: t.commandPalette.actExplainSub,
        icon: <Activity size={14} className="text-amber-400" />,
        action: onExplainPlan,
      },
      {
        id: "act_ai_explain",
        category: "Query Actions",
        title: t.commandPalette.actAiExplainTitle,
        subtitle: t.commandPalette.actAiExplainSub,
        icon: <Sparkles size={14} className="text-cyan-400" />,
        action: onExplainAI,
      },
      {
        id: "act_clear",
        category: "Query Actions",
        title: t.commandPalette.actClearTitle,
        subtitle: t.commandPalette.actClearSub,
        icon: <Trash2 size={14} className="text-rose-400" />,
        action: onClearSQL,
      },

      // Navigation
      {
        id: "nav_about",
        category: "Navigation",
        title: t.commandPalette.navAboutTitle,
        subtitle: t.commandPalette.navAboutSub,
        icon: <Info size={14} className="text-amber-400" />,
        action: onOpenAbout || (() => {}),
      },
      {
        id: "nav_snippets",
        category: "Navigation",
        title: t.commandPalette.navSnippetsTitle,
        subtitle: t.commandPalette.navSnippetsSub,
        icon: <BookOpen size={14} className="text-indigo-400" />,
        action: onOpenSnippets,
      },
      {
        id: "nav_diagram",
        category: "Navigation",
        title: t.commandPalette.navErdTitle,
        subtitle: t.commandPalette.navErdSub,
        icon: <Network size={14} className="text-cyan-400" />,
        action: onOpenDiagram,
      },
      {
        id: "nav_challenges",
        category: "Navigation",
        title: t.commandPalette.navChallengesTitle,
        subtitle: t.commandPalette.navChallengesSub,
        icon: <Trophy size={14} className="text-amber-400" />,
        action: onOpenChallenges,
      },
      {
        id: "nav_history",
        category: "Navigation",
        title: t.commandPalette.navHistoryTitle,
        subtitle: t.commandPalette.navHistorySub,
        icon: <History size={14} className="text-cyan-400" />,
        action: onOpenHistory,
      },
      {
        id: "nav_saved",
        category: "Navigation",
        title: t.commandPalette.navSavedTitle,
        subtitle: t.commandPalette.navSavedSub,
        icon: <Bookmark size={14} className="text-indigo-400" />,
        action: onOpenSavedQueries,
      },
      {
        id: "nav_profile",
        category: "Navigation",
        title: t.commandPalette.navProfileTitle,
        subtitle: t.commandPalette.navProfileSub,
        icon: <User size={14} className="text-purple-400" />,
        action: onOpenProfile,
      },
      {
        id: "nav_manage_ws",
        category: "Navigation",
        title: t.commandPalette.navWorkspacesTitle,
        subtitle: t.commandPalette.navWorkspacesSub,
        icon: <Layers size={14} className="text-cyan-400" />,
        action: onOpenWorkspaceModal,
      },
      {
        id: "nav_upload",
        category: "Navigation",
        title: t.commandPalette.navUploadTitle,
        subtitle: t.commandPalette.navUploadSub,
        icon: <UploadCloud size={14} className="text-emerald-400" />,
        action: onOpenUpload,
      },

      // Export Actions
      {
        id: "exp_csv",
        category: "Export",
        title: t.commandPalette.expCsvTitle,
        subtitle: t.commandPalette.expCsvSub,
        icon: <Download size={14} className="text-emerald-400" />,
        action: onDownloadCSV,
      },
      {
        id: "exp_json",
        category: "Export",
        title: t.commandPalette.expJsonTitle,
        subtitle: t.commandPalette.expJsonSub,
        icon: <Download size={14} className="text-cyan-400" />,
        action: onDownloadJSON,
      },
      {
        id: "exp_copy_csv",
        category: "Export",
        title: t.commandPalette.expCopyCsvTitle,
        subtitle: t.commandPalette.expCopyCsvSub,
        icon: <Copy size={14} className="text-slate-300" />,
        action: onCopyCSV,
      },
      {
        id: "exp_copy_md",
        category: "Export",
        title: t.commandPalette.expCopyMdTitle,
        subtitle: t.commandPalette.expCopyMdSub,
        icon: <Copy size={14} className="text-indigo-400" />,
        action: onCopyMarkdown,
      },
      ...(onOpenAdvancedExport ? [{
        id: "exp_advanced",
        category: "Export" as const,
        title: t.commandPalette.expCustomTitle,
        subtitle: t.commandPalette.expCustomSub,
        icon: <Download size={14} className="text-indigo-400" />,
        action: onOpenAdvancedExport,
      }] : []),
    ];

    // Workspaces Quick Jump
    workspaces.forEach((ws) => {
      const isCurrent = ws.id === currentWorkspace?.id;
      items.push({
        id: `ws_${ws.id}`,
        category: "Workspaces",
        title: language === "id" ? `Pindah ke: ${ws.name}` : `Switch to: ${ws.name}`,
        subtitle: isCurrent 
          ? (language === "id" ? "Workspace saat ini (Aktif)" : "Current active workspace") 
          : ws.description || (language === "id" ? "Workspace terisolasi" : "Isolated workspace"),
        icon: <Layers size={14} className={isCurrent ? "text-cyan-400" : "text-slate-400"} />,
        action: () => onSelectWorkspace(ws),
      });
    });

    // Tables Quick Jump
    tables.forEach((tbl) => {
      items.push({
        id: `tbl_${tbl.tableName}`,
        category: "Tables",
        title: language === "id" ? `Kueri Tabel: ${tbl.tableName}` : `Query Table: ${tbl.tableName}`,
        subtitle: `SELECT * FROM "${tbl.tableName}" LIMIT 50;`,
        icon: <Table size={14} className="text-cyan-400" />,
        action: () => onSelectTable(tbl.tableName),
      });
    });

    return items;
  }, [
    workspaces,
    currentWorkspace,
    tables,
    t,
    language,
    onExecuteSQL,
    onFormatSQL,
    onUppercaseSQL,
    onExplainPlan,
    onExplainAI,
    onClearSQL,
    onOpenAbout,
    onOpenSnippets,
    onOpenDiagram,
    onOpenChallenges,
    onOpenHistory,
    onOpenSavedQueries,
    onOpenProfile,
    onOpenWorkspaceModal,
    onOpenUpload,
    onDownloadCSV,
    onDownloadJSON,
    onCopyCSV,
    onCopyMarkdown,
    onOpenAdvancedExport,
    onSelectWorkspace,
    onSelectTable,
  ]);

  // Filter commands by search
  const filtered = useMemo(() => {
    if (!search.trim()) return commands;
    const query = search.toLowerCase();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        (c.subtitle && c.subtitle.toLowerCase().includes(query)) ||
        c.category.toLowerCase().includes(query)
    );
  }, [commands, search]);

  // Reset selected index on search change
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        onClose();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case "Query Actions": return t.commandPalette.categoryQuery;
      case "Navigation": return t.commandPalette.categoryNav;
      case "Workspaces": return t.commandPalette.categoryWorkspaces;
      case "Tables": return t.commandPalette.categoryTables;
      case "Export": return t.commandPalette.categoryExport;
      default: return cat;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 bg-black/50 backdrop-blur-xs p-3 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-xl flex flex-col shadow-2xl p-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Search size={14} className="text-amber-300" />
            <span className="font-bold">{t.commandPalette.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.commandPalette.close}
          >
            ✕
          </button>
        </div>

        {/* Search Header */}
        <div className="p-2 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)]">
          <div className="win-inset flex items-center gap-2 px-2.5 py-1.5 bg-[var(--win-inset-bg)]">
            <Search size={14} className="text-[var(--win-text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t.commandPalette.placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-xs text-[var(--win-text)] placeholder-[var(--win-text-muted)] focus:outline-none"
            />
            <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[var(--win-surface)] text-[var(--win-text-muted)] border border-[var(--win-border-dark)]">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 sm:max-h-96 overflow-y-auto m-2 p-1.5 space-y-0.5 win-inset bg-[var(--win-inset-bg)]"
        >
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--win-text-muted)]">
              {t.commandPalette.noResults}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-2.5 py-1.5 text-xs cursor-pointer ${
                    isSelected
                      ? "bg-[#0055ea] text-white font-bold"
                      : "text-[var(--win-text)] hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate">{item.title}</span>
                        <span className={`text-[9px] px-1 py-0.2 font-mono border ${
                          isSelected 
                            ? "bg-blue-700 text-white border-blue-400" 
                            : "bg-[var(--win-surface)] text-[var(--win-text-muted)] border-[var(--win-border-medium)]"
                        }`}>
                          {getCategoryBadge(item.category)}
                        </span>
                      </div>
                      {item.subtitle && (
                        <p className={`text-[10px] truncate ${isSelected ? "text-blue-100" : "text-[var(--win-text-muted)]"}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {item.shortcut && (
                      <kbd className={`hidden sm:inline-block px-1 py-0.5 text-[9px] font-mono border ${
                        isSelected 
                          ? "bg-blue-800 text-white border-blue-400" 
                          : "bg-[var(--win-surface)] text-[var(--win-text-muted)] border-[var(--win-border-dark)]"
                      }`}>
                        {item.shortcut}
                      </kbd>
                    )}
                    {isSelected && <ArrowRight size={12} className="text-white" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info (Status Bar) */}
        <div className="win-status-bar px-2 py-1 justify-between text-[11px] border-t border-[var(--win-border-dark)]">
          <div className="flex items-center gap-2">
            <span>{language === "id" ? "Navigasi" : "Navigate"}: <strong className="font-mono">↑ ↓</strong></span>
            <span>•</span>
            <span>{language === "id" ? "Pilih" : "Select"}: <strong className="font-mono">Enter</strong></span>
          </div>
          <span className="font-mono">
            {filtered.length} {language === "id" ? "Perintah Tersedia" : "Commands Available"}
          </span>
        </div>
      </div>
    </div>
  );
}
