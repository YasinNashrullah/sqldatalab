"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { DatabaseExplorer } from "@/components/DatabaseExplorer";
import { SQLEditor, uppercaseSQLKeywords } from "@/components/SQLEditor";
import { ResultTable } from "@/components/ResultTable";
import { ChartViewer } from "@/components/ChartViewer";
import { UploadModal } from "@/components/UploadModal";
import { ChallengeDrawer } from "@/components/ChallengeDrawer";
import { SavedQueriesDrawer } from "@/components/SavedQueriesDrawer";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { AIModal } from "@/components/AIModal";
import { AuthModal } from "@/components/AuthModal";
import { ProfileModal } from "@/components/ProfileModal";
import { WorkspaceModal } from "@/components/WorkspaceModal";
import { QueryExplainModal } from "@/components/QueryExplainModal";
import { TableStatsModal } from "@/components/TableStatsModal";
import { CommandPalette } from "@/components/CommandPalette";
import { SQLSnippetsDrawer } from "@/components/SQLSnippetsDrawer";
import { SchemaDiagramModal } from "@/components/SchemaDiagramModal";
import { QueryDiffModal, QueryRunInfo } from "@/components/QueryDiffModal";
import { ExportCustomizerModal } from "@/components/ExportCustomizerModal";
import { AboutModal } from "@/components/AboutModal";
import { formatSQL } from "@/lib/sqlFormatter";
import { api } from "@/lib/api";
import { Table, BarChart3, Loader2, Folder, Plus, Layers } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function Home() {
  const { language, toggleLanguage, t } = useLanguage();

  // Auth state
  const [user, setUser] = useState<any | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Workspace & Datasets
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<any | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isDatasetsLoading, setIsDatasetsLoading] = useState(false);

  // Editor & Query execution
  const [sqlQuery, setSqlQuery] = useState<string>("SELECT * FROM customers LIMIT 10;");
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<any>({
    columns: [],
    rows: [],
    executionTimeMs: 0,
    rowCount: 0,
    error: null,
  });

  // Extract schema metadata for editor autocomplete
  const tablesMeta = useMemo(() => {
    return datasets.flatMap((ds) =>
      (ds.tables || []).map((t: any) => ({
        tableName: t.table_name,
        columns: (t.columns || []).map((c: any) => ({
          name: c.column_name,
          type: c.data_type || "VARCHAR",
        })),
      }))
    );
  }, [datasets]);

  // UI state
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modals & Drawers
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showChallengeDrawer, setShowChallengeDrawer] = useState(false);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showExplainModal, setShowExplainModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showSnippetsDrawer, setShowSnippetsDrawer] = useState(false);
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [inspectTableName, setInspectTableName] = useState<string | null>(null);
  const [saveTitlePrompt, setSaveTitlePrompt] = useState(false);
  const [saveTitle, setSaveTitle] = useState("");
  const [saveTags, setSaveTags] = useState("");

  // Run Comparator & Advanced Export states
  const [previousRun, setPreviousRun] = useState<QueryRunInfo | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffRunA, setDiffRunA] = useState<QueryRunInfo | null>(null);
  const [diffRunB, setDiffRunB] = useState<QueryRunInfo | null>(null);
  const [showAdvancedExportModal, setShowAdvancedExportModal] = useState(false);

  // Retro Theme & Clock State
  const [themeMode, setThemeMode] = useState<"winxp" | "dark">("winxp");
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("sqltrain_theme_mode") as "winxp" | "dark";
      if (savedTheme) {
        setThemeMode(savedTheme);
      }
    }
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "winxp" ? "dark" : "winxp";
      if (typeof window !== "undefined") {
        localStorage.setItem("sqltrain_theme_mode", next);
      }
      return next;
    });
  };

  // Check auth on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Global Ctrl+K / Cmd+K listener for Command Palette
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const handleInsertSnippet = (snippetSql: string, replace?: boolean) => {
    if (replace) {
      setSqlQuery(snippetSql);
    } else {
      setSqlQuery((prev) => (prev.trim() ? `${prev}\n\n${snippetSql}` : snippetSql));
    }
  };

  const handleCopyResultsCSV = () => {
    if (!queryResult.columns || queryResult.columns.length === 0) {
      alert(language === "id" ? "Tidak ada hasil kueri untuk disalin." : "No query results to copy.");
      return;
    }
    const headerLine = queryResult.columns.map((c: any) => c.name).join(",");
    const rowLines = queryResult.rows.map((r: any[]) => r.map((v: any) => (v === null ? "" : `"${v}"`)).join(","));
    const csvContent = [headerLine, ...rowLines].join("\n");
    navigator.clipboard.writeText(csvContent);
    alert(language === "id" ? "Hasil kueri disalin ke clipboard sebagai CSV!" : "Query results copied to clipboard as CSV!");
  };

  const handleCopyResultsMarkdown = () => {
    if (!queryResult.columns || queryResult.columns.length === 0) {
      alert(language === "id" ? "Tidak ada hasil kueri untuk disalin." : "No query results to copy.");
      return;
    }
    const headerLine = `| ${queryResult.columns.map((c: any) => c.name).join(" | ")} |`;
    const separatorLine = `| ${queryResult.columns.map(() => "---").join(" | ")} |`;
    const rowLines = queryResult.rows.map(
      (r: any[]) => `| ${r.map((v: any) => (v === null ? "NULL" : String(v).replace(/\|/g, "\\|"))).join(" | ")} |`
    );
    const mdContent = [headerLine, separatorLine, ...rowLines].join("\n");
    navigator.clipboard.writeText(mdContent);
    alert(language === "id" ? "Hasil kueri disalin ke clipboard sebagai Markdown table!" : "Query results copied to clipboard as Markdown table!");
  };

  const checkSession = async () => {
    setIsAuthLoading(true);
    try {
      const data = await api.getMe();
      setUser(data.user);
      setWorkspaces(data.workspaces || []);
      if (data.workspaces && data.workspaces.length > 0) {
        setCurrentWorkspace(data.workspaces[0]);
        loadDatasets(data.workspaces[0].id);
      }
    } catch {
      setUser(null);
      setShowAuthModal(true);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAuthSuccess = (authUser: any, defaultWsId: string) => {
    setUser(authUser);
    setShowAuthModal(false);
    loadWorkspaces(defaultWsId);
  };

  const loadWorkspaces = async (preferWsId?: string) => {
    try {
      const res = await api.listWorkspaces();
      setWorkspaces(res.workspaces || []);
      if (res.workspaces.length > 0) {
        const target = preferWsId
          ? res.workspaces.find((w) => w.id === preferWsId) || res.workspaces[0]
          : res.workspaces[0];
        setCurrentWorkspace(target);
        loadDatasets(target.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDatasets = async (wsId: string) => {
    setIsDatasetsLoading(true);
    try {
      const res = await api.listDatasets(wsId);
      setDatasets(res.datasets || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDatasetsLoading(false);
    }
  };

  const handleSelectWorkspace = (ws: any) => {
    setCurrentWorkspace(ws);
    setQueryResult({
      columns: [],
      rows: [],
      executionTimeMs: 0,
      rowCount: 0,
      error: null,
    });
    loadDatasets(ws.id);
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    }
    setUser(null);
    setCurrentWorkspace(null);
    setShowAuthModal(true);
  };

  // SQL Execution
  const handleExecuteSQL = async () => {
    if (!currentWorkspace || !sqlQuery.trim() || isExecuting) return;
    setIsExecuting(true);
    setQueryResult((prev: any) => ({ ...prev, error: null }));

    // Save current run into previousRun if there was a previous execution
    if (queryResult.rows.length > 0 || queryResult.executionTimeMs > 0) {
      setPreviousRun({
        query_text: sqlQuery,
        duration_ms: queryResult.executionTimeMs,
        row_count: queryResult.rowCount,
        status: queryResult.error ? "ERROR" : "SUCCESS",
        executed_at: new Date().toISOString(),
        label: language === "id" ? "Run Sebelumnya" : "Previous Run",
      });
    }

    try {
      const res = await api.executeSQL({
        workspace_id: currentWorkspace.id,
        query: sqlQuery,
        limit: 1000,
      });

      setQueryResult({
        columns: res.columns || [],
        rows: res.rows || [],
        executionTimeMs: res.execution_time_ms || 0,
        rowCount: res.row_count || 0,
        error: null,
      });
    } catch (err: any) {
      setQueryResult({
        columns: [],
        rows: [],
        executionTimeMs: err.details?.execution_time_ms || 0,
        rowCount: 0,
        error: err.message || "Query execution failed.",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCompareWithPrevious = () => {
    if (!previousRun) return;
    setDiffRunA(previousRun);
    setDiffRunB({
      query_text: sqlQuery,
      duration_ms: queryResult.executionTimeMs,
      row_count: queryResult.rowCount,
      status: queryResult.error ? "ERROR" : "SUCCESS",
      executed_at: new Date().toISOString(),
      label: language === "id" ? "Run Terkini" : "Current Run",
    });
    setShowDiffModal(true);
  };

  const handleCompareHistoryQueries = (runA: any, runB: any) => {
    setDiffRunA({
      query_text: runA.query_text,
      duration_ms: runA.duration_ms,
      row_count: runA.row_count,
      status: runA.status,
      executed_at: runA.executed_at,
      label: `Run (${runA.duration_ms}ms)`,
    });
    setDiffRunB({
      query_text: runB.query_text,
      duration_ms: runB.duration_ms,
      row_count: runB.row_count,
      status: runB.status,
      executed_at: runB.executed_at,
      label: `Run (${runB.duration_ms}ms)`,
    });
    setShowDiffModal(true);
  };

  const handleFormatSQL = async () => {
    if (!sqlQuery.trim()) return;
    try {
      const preset = (typeof window !== "undefined" ? localStorage.getItem("sqltrain_format_preset") : null) as any || "modern";
      const formatted = formatSQL(sqlQuery, preset);
      setSqlQuery(formatted);
    } catch {
      try {
        const res = await api.formatSQL(sqlQuery);
        setSqlQuery(res.formatted_query);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSaveQuery = async () => {
    if (!saveTitle.trim() || !currentWorkspace) return;
    try {
      const tagList = saveTags
        .split(",")
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);

      await api.createSavedQuery({
        workspace_id: currentWorkspace.id,
        title: saveTitle,
        query_text: sqlQuery,
        tags_json: JSON.stringify(tagList),
      });
      setSaveTitlePrompt(false);
      setSaveTitle("");
      setSaveTags("");
      alert(language === "id" ? "Query berhasil disimpan ke perpustakaan dengan tag!" : "Query successfully saved to library with tags!");
    } catch (e: any) {
      alert(language === "id" ? `Gagal menyimpan: ${e.message}` : `Failed to save: ${e.message}`);
    }
  };

  const handleExportCSV = () => {
    if (queryResult.columns.length === 0) return;
    api.exportCSV({
      filename: "query_results",
      columns: queryResult.columns.map((c: any) => c.name),
      rows: queryResult.rows,
    });
  };

  const handleExportJSON = () => {
    if (queryResult.columns.length === 0) return;
    api.exportJSON({
      filename: "query_results",
      columns: queryResult.columns.map((c: any) => c.name),
      rows: queryResult.rows,
    });
  };

  const handleDeleteDataset = async (datasetId: string) => {
    // Optimistic UI update: remove immediately for 0ms perceived latency
    const prevDatasets = [...datasets];
    setDatasets((prev) => prev.filter((ds) => ds.id !== datasetId));

    try {
      await api.deleteDataset(datasetId);
      if (currentWorkspace) {
        await loadDatasets(currentWorkspace.id);
      }
    } catch (e: any) {
      // Rollback state if deletion failed
      setDatasets(prevDatasets);
      alert(language === "id" ? `Gagal menghapus dataset: ${e.message || "Kesalahan tidak diketahui"}` : `Failed to delete dataset: ${e.message || "Unknown error"}`);
    }
  };

  const handlePreviewTable = async (datasetId: string, tableName: string) => {
    try {
      const res = await api.getDatasetPreview(datasetId);
      setQueryResult({
        columns: res.columns || [],
        rows: res.rows || [],
        executionTimeMs: res.execution_time_ms || 0,
        rowCount: res.row_count || 0,
        error: null,
      });
      setSqlQuery(`SELECT * FROM "${tableName}" LIMIT 50;`);
    } catch (e: any) {
      alert(language === "id" ? `Gagal memuat pratinjau: ${e.message}` : `Failed to load preview: ${e.message}`);
    }
  };

  // Build schema context for AI assistant
  const schemaContext = useMemo(() => {
    const tables: any[] = [];
    datasets.forEach((ds) => {
      ds.tables?.forEach((t: any) => {
        tables.push({
          table_name: t.table_name,
          columns: t.columns?.map((c: any) => ({ name: c.column_name, type: c.data_type })) || [],
        });
      });
    });
    return { tables };
  }, [datasets]);

  if (isAuthLoading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 size={32} className="animate-spin text-cyan-400" />
        <span className="text-xs font-mono">Initializing SQL Data Lab...</span>
      </div>
    );
  }

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden select-none ${
        themeMode === "winxp" ? "theme-winxp" : "theme-dark"
      }`}
      style={{ backgroundColor: "var(--win-desktop)" }}
    >
      {/* Windows Top Menu & Title Bar */}
      <Navbar
        user={user}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        themeMode={themeMode}
        onToggleTheme={handleToggleTheme}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenChallenges={() => setShowChallengeDrawer(true)}
        onOpenSavedQueries={() => setShowSavedDrawer(true)}
        onOpenHistory={() => setShowHistoryDrawer(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenWorkspaceModal={() => setShowWorkspaceModal(true)}
        onOpenCommandPalette={() => setShowCommandPalette(true)}
        onOpenSnippets={() => setShowSnippetsDrawer(true)}
        onOpenDiagram={() => setShowDiagramModal(true)}
        onOpenAbout={() => setShowAboutModal(true)}
        onLogout={handleLogout}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      {/* Dedicated Workspace Switcher Strip (Outside Navbar, Above Main Workspace Area) */}
      <div className="win-window border-x-0 border-t-0 bg-[var(--win-surface)] px-3 py-1 flex items-center justify-between z-10 select-none flex-wrap gap-1 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--win-text-muted)] mr-1">
            <Layers size={13} className="text-blue-700" />
            <span>Workspace:</span>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {workspaces.map((ws) => {
              const isActive = ws.id === currentWorkspace?.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => handleSelectWorkspace(ws)}
                  className={`win-tab-item text-xs py-1 px-3 flex items-center gap-1.5 cursor-pointer transition-none ${
                    isActive
                      ? "active font-bold text-blue-700"
                      : "hover:text-blue-700 text-[var(--win-text)]"
                  }`}
                  title={language === "id" ? `Klik untuk langsung berganti ke workspace "${ws.name}"` : `Click to switch to workspace "${ws.name}"`}
                >
                  <Folder
                    size={12}
                    className={isActive ? "text-amber-500 fill-amber-500" : "text-[var(--win-text-muted)]"}
                  />
                  <span className="max-w-[160px] truncate">{ws.name}</span>
                  {isActive && (
                    <span className="px-1 text-[9px] bg-emerald-600 text-white font-bold rounded-xs">
                      {language === "id" ? "Aktif" : "Active"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => setShowWorkspaceModal(true)}
            className="win-btn text-xs py-0.5 px-2 font-bold flex items-center gap-1 text-blue-700 ml-1"
            title={language === "id" ? "Kelola & Tambah Workspace" : "Manage & Add Workspaces"}
          >
            <Plus size={11} />
            <span>{language === "id" ? "Kelola Workspace" : "Manage Workspaces"} ({workspaces.length}/3)</span>
          </button>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-[var(--win-text-muted)] font-mono">
          <span className="text-emerald-700 font-bold">● DuckDB In-Memory</span>
          <span>•</span>
          <span>{datasets.length} Datasets ({tablesMeta.length} {language === "id" ? "Tabel" : "Tables"})</span>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative p-1 gap-1">
        {/* Left: Schema Explorer Sidebar (Windowed) */}
        <div
          className={`fixed md:relative inset-y-0 left-0 z-20 w-72 md:w-80 h-full transform transition-transform duration-200 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <DatabaseExplorer
            datasets={datasets}
            workspaceName={currentWorkspace?.name}
            isLoading={isDatasetsLoading}
            onRefresh={() => currentWorkspace && loadDatasets(currentWorkspace.id)}
            onSelectTable={(tbl) => setSqlQuery(`SELECT * FROM "${tbl}" LIMIT 50;`)}
            onInsertColumn={(col) => setSqlQuery((prev) => `${prev} ${col}`)}
            onPreviewTable={handlePreviewTable}
            onInspectTable={(tbl) => setInspectTableName(tbl)}
            onDeleteDataset={handleDeleteDataset}
            onOpenUpload={() => setShowUploadModal(true)}
          />
        </div>

        {/* Mobile backdrop for sidebar */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 z-10 bg-black/60 backdrop-blur-sm"
          />
        )}

        {/* Right: SQL Editor + Result Panel */}
        <main className="flex-1 flex flex-col h-full overflow-hidden gap-1">
          {/* Query Editor Window */}
          <SQLEditor
            value={sqlQuery}
            onChange={setSqlQuery}
            onExecute={handleExecuteSQL}
            onFormat={handleFormatSQL}
            onSave={() => setSaveTitlePrompt(true)}
            onClear={() => setSqlQuery("")}
            onExplainAI={() => setShowAIModal(true)}
            onExplainPlan={() => setShowExplainModal(true)}
            onOpenSnippets={() => setShowSnippetsDrawer(true)}
            isExecuting={isExecuting}
            tables={tablesMeta}
            themeMode={themeMode}
          />

          {/* Results Window Frame */}
          <div className="flex-1 flex flex-col overflow-hidden win-window">
            {/* Window Titlebar */}
            <div className="win-titlebar">
              <div className="flex items-center gap-1.5">
                <Table size={13} className="text-amber-300" />
                <span className="font-bold">{language === "id" ? "Kisi Data & Analitik" : "Data Grid & Analytics"}</span>
              </div>
              <div className="flex items-center gap-1">
                <button className="win-control-btn" title={language === "id" ? "Minimalkan" : "Minimize"}>_</button>
                <button className="win-control-btn" title={language === "id" ? "Maksimalkan" : "Maximize"}>□</button>
                <button className="win-control-btn win-close" title={language === "id" ? "Tutup" : "Close"}>✕</button>
              </div>
            </div>

            {/* Classic OS Tabs Bar */}
            <div className="px-2 pt-1 flex items-end border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] justify-between">
              <div className="flex items-end">
                <button
                  onClick={() => setActiveTab("table")}
                  className={`win-tab-item flex items-center gap-1.5 ${
                    activeTab === "table" ? "active" : ""
                  }`}
                >
                  <Table size={12} />
                  <span>{language === "id" ? "Tabel Hasil" : "Result Table"}</span>
                </button>

                <button
                  onClick={() => setActiveTab("chart")}
                  className={`win-tab-item flex items-center gap-1.5 ${
                    activeTab === "chart" ? "active" : ""
                  }`}
                >
                  <BarChart3 size={12} />
                  <span>{language === "id" ? "Visualisasi" : "Visualization"}</span>
                </button>
              </div>

              {/* Mobile quick actions */}
              <div className="flex items-center gap-1 sm:hidden pb-1">
                <button
                  onClick={() => setShowChallengeDrawer(true)}
                  className="win-btn text-[10px] font-bold text-amber-700"
                >
                  {language === "id" ? "Tantangan" : "Challenges"}
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 flex overflow-hidden">
              {activeTab === "table" ? (
                <ResultTable
                  columns={queryResult.columns}
                  rows={queryResult.rows}
                  executionTimeMs={queryResult.executionTimeMs}
                  rowCount={queryResult.rowCount}
                  error={queryResult.error}
                  onExportCSV={handleExportCSV}
                  onExportJSON={handleExportJSON}
                  onExplainErrorWithAI={() => setShowAIModal(true)}
                  onOpenAdvancedExport={() => setShowAdvancedExportModal(true)}
                  onComparePrevious={handleCompareWithPrevious}
                  hasPreviousRun={Boolean(previousRun)}
                />
              ) : (
                <ChartViewer columns={queryResult.columns} rows={queryResult.rows} />
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Classic Windows XP / 95 Bottom Taskbar */}
      <footer className="win-window border-x-0 border-b-0 h-8 flex items-center justify-between px-1.5 z-30 select-none text-xs flex-shrink-0">
        {/* Start Button & Active Tasks */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCommandPalette(true)}
            className="win-start-btn flex items-center gap-1 text-[11px] py-0.5"
            title={language === "id" ? "Start Menu / Palet Perintah (Ctrl+K)" : "Start Menu / Command Palette (Ctrl+K)"}
          >
            <span className="text-amber-300 font-bold text-xs">⊞</span>
            <span>start</span>
          </button>

          {/* Taskbar Window Buttons */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`win-btn text-[11px] py-0.5 max-w-[130px] truncate ${isSidebarOpen ? "win-inset font-bold" : ""}`}
            title={language === "id" ? "Buka/Tutup Schema Explorer" : "Toggle Schema Explorer"}
          >
            <span>📁 {language === "id" ? "Skema" : "Schema"}</span>
          </button>

          <button
            className="win-btn win-inset font-bold text-[11px] py-0.5 max-w-[150px] truncate hidden sm:inline-flex"
          >
            <span>📝 {language === "id" ? "Editor SQL" : "SQL Editor"}</span>
          </button>

          <button
            className={`win-btn text-[11px] py-0.5 max-w-[150px] truncate hidden sm:inline-flex ${activeTab === "table" ? "win-inset font-bold" : ""}`}
            onClick={() => setActiveTab("table")}
          >
            <span>📊 {t.results.resultsTitle}</span>
          </button>
        </div>

        {/* System Tray */}
        <div className="flex items-center gap-1">
          <div className="win-status-panel text-[11px] text-emerald-700 bg-emerald-50 hidden md:flex">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            <span>{t.footer.inMemoryConnected}</span>
          </div>

          <div className="win-status-panel font-mono text-[11px] hidden sm:flex">
            <span>🦆 {t.footer.duckdbEngine}</span>
          </div>

          {queryResult.rowCount > 0 && (
            <div className="win-status-panel font-mono text-[11px] hidden lg:flex">
              <span>{queryResult.rowCount.toLocaleString()} {t.common.rows}</span>
            </div>
          )}

          {/* Language Switch Button */}
          <button
            onClick={toggleLanguage}
            className="win-btn text-[11px] py-0.5 px-2 font-bold flex items-center gap-1"
            title={t.footer.switchLanguage}
          >
            <span>{language === "id" ? "🇮🇩 ID" : "🇬🇧 EN"}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={handleToggleTheme}
            className="win-btn text-[11px] py-0.5 font-bold"
            title={language === "id" ? "Ganti Tema (Light / Dark Mode)" : "Switch Theme (Light / Dark Mode)"}
          >
            <span>{themeMode === "winxp" ? t.footer.themeLight : t.footer.themeDark}</span>
          </button>

          {/* System Clock */}
          <div className="win-status-panel font-mono text-[11px] font-bold px-2 py-0.5">
            <span>🕒 {currentTime || "12:00:00"}</span>
          </div>
        </div>
      </footer>

      {/* Save Query Prompt Modal with Tags */}
      {saveTitlePrompt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none">
          <div className="win-window w-full max-w-sm p-0 shadow-2xl bg-[var(--win-surface)] text-[var(--win-text)]">
            <div className="win-titlebar">
              <span>{t.savePrompt.title}</span>
              <button
                onClick={() => setSaveTitlePrompt(false)}
                className="win-control-btn win-close"
              >
                ✕
              </button>
            </div>
            <div className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold">{t.savePrompt.queryTitleLabel}</label>
                <input
                  type="text"
                  placeholder={t.savePrompt.queryTitlePlaceholder}
                  value={saveTitle}
                  onChange={(e) => setSaveTitle(e.target.value)}
                  className="win-inset w-full p-1.5 text-xs text-[var(--win-text)] focus:outline-none"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold">{t.savePrompt.tagsLabel}</label>
                <input
                  type="text"
                  placeholder={t.savePrompt.tagsPlaceholder}
                  value={saveTags}
                  onChange={(e) => setSaveTags(e.target.value)}
                  className="win-inset w-full p-1.5 text-xs text-[var(--win-text)] font-mono focus:outline-none"
                />
                <div className="flex gap-1 pt-1 overflow-x-auto text-[10px]">
                  {["#reporting", "#kpi", "#analytics", "#etl"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSaveTags((prev) => prev ? `${prev}, ${tag}` : tag)}
                      className="win-btn text-[10px] !px-1.5 !py-0.5"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[var(--win-border-dark)]">
                <button
                  onClick={() => setSaveTitlePrompt(false)}
                  className="win-btn text-xs !px-3 !py-1"
                >
                  {t.savePrompt.cancelBtn}
                </button>
                <button
                  onClick={handleSaveQuery}
                  disabled={!saveTitle.trim()}
                  className="win-btn win-btn-primary font-bold text-xs !px-4 !py-1"
                >
                  {t.savePrompt.saveBtn}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <UploadModal
        isOpen={showUploadModal}
        workspaceId={currentWorkspace?.id || ""}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          if (currentWorkspace) loadDatasets(currentWorkspace.id);
        }}
      />

      <ChallengeDrawer
        isOpen={showChallengeDrawer}
        workspaceId={currentWorkspace?.id || ""}
        onClose={() => setShowChallengeDrawer(false)}
        onLoadSQL={(sql) => {
          setSqlQuery(sql);
          setShowChallengeDrawer(false);
        }}
        currentSQL={sqlQuery}
      />

      <SavedQueriesDrawer
        isOpen={showSavedDrawer}
        workspaceId={currentWorkspace?.id || ""}
        onClose={() => setShowSavedDrawer(false)}
        onLoadSQL={(sql) => setSqlQuery(sql)}
      />

      <HistoryDrawer
        isOpen={showHistoryDrawer}
        workspaceId={currentWorkspace?.id || ""}
        onClose={() => setShowHistoryDrawer(false)}
        onLoadSQL={(sql) => setSqlQuery(sql)}
        onCompareQueries={handleCompareHistoryQueries}
      />

      <AIModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        query={sqlQuery}
        errorMessage={queryResult.error}
        schemaContext={schemaContext}
        onApplySQL={(sql) => setSqlQuery(sql)}
      />

      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentUser={user}
        onProfileUpdated={(updated) => setUser(updated)}
      />

      <WorkspaceModal
        isOpen={showWorkspaceModal}
        onClose={() => setShowWorkspaceModal(false)}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={(ws) => {
          handleSelectWorkspace(ws);
          setShowWorkspaceModal(false);
        }}
        onWorkspacesChanged={(wsList, newActiveWs) => {
          setWorkspaces(wsList);
          if (newActiveWs) {
            handleSelectWorkspace(newActiveWs);
          } else if (!wsList.some((w) => w.id === currentWorkspace?.id) && wsList.length > 0) {
            handleSelectWorkspace(wsList[0]);
          }
        }}
      />

      <QueryExplainModal
        isOpen={showExplainModal}
        onClose={() => setShowExplainModal(false)}
        workspaceId={currentWorkspace?.id || ""}
        query={sqlQuery}
      />

      <TableStatsModal
        isOpen={Boolean(inspectTableName)}
        onClose={() => setInspectTableName(null)}
        workspaceId={currentWorkspace?.id || ""}
        tableName={inspectTableName || ""}
        onInsertSQL={(sql) => setSqlQuery(sql)}
      />

      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        tables={tablesMeta}
        onSelectWorkspace={handleSelectWorkspace}
        onOpenUpload={() => setShowUploadModal(true)}
        onOpenChallenges={() => setShowChallengeDrawer(true)}
        onOpenSavedQueries={() => setShowSavedDrawer(true)}
        onOpenHistory={() => setShowHistoryDrawer(true)}
        onOpenProfile={() => setShowProfileModal(true)}
        onOpenWorkspaceModal={() => setShowWorkspaceModal(true)}
        onOpenSnippets={() => setShowSnippetsDrawer(true)}
        onOpenDiagram={() => setShowDiagramModal(true)}
        onExecuteSQL={handleExecuteSQL}
        onFormatSQL={handleFormatSQL}
        onUppercaseSQL={() => setSqlQuery((prev) => uppercaseSQLKeywords(prev))}
        onExplainPlan={() => setShowExplainModal(true)}
        onExplainAI={() => setShowAIModal(true)}
        onClearSQL={() => setSqlQuery("")}
        onSelectTable={(tbl) => setSqlQuery(`SELECT * FROM "${tbl}" LIMIT 50;`)}
        onCopyCSV={handleCopyResultsCSV}
        onCopyMarkdown={handleCopyResultsMarkdown}
        onDownloadCSV={handleExportCSV}
        onDownloadJSON={handleExportJSON}
        onOpenAdvancedExport={() => setShowAdvancedExportModal(true)}
        onOpenAbout={() => setShowAboutModal(true)}
      />

      <SQLSnippetsDrawer
        isOpen={showSnippetsDrawer}
        onClose={() => setShowSnippetsDrawer(false)}
        onInsertSQL={handleInsertSnippet}
      />

      <SchemaDiagramModal
        isOpen={showDiagramModal}
        onClose={() => setShowDiagramModal(false)}
        workspaceId={currentWorkspace?.id || ""}
        onSelectTable={(tbl) => setSqlQuery(`SELECT * FROM "${tbl}" LIMIT 50;`)}
      />

      <QueryDiffModal
        isOpen={showDiffModal}
        onClose={() => setShowDiffModal(false)}
        runA={diffRunA}
        runB={diffRunB}
        onLoadSQL={(sql) => setSqlQuery(sql)}
      />

      <ExportCustomizerModal
        isOpen={showAdvancedExportModal}
        onClose={() => setShowAdvancedExportModal(false)}
        columns={queryResult.columns.map((c: any) => c.name)}
        rows={queryResult.rows}
        defaultFilename="query_results"
      />

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {showAuthModal && <AuthModal onSuccess={handleAuthSuccess} />}
    </div>
  );
}
