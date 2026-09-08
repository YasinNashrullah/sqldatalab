"use client";

import React, { useState } from "react";
import { 
  Database, 
  Trophy, 
  UploadCloud, 
  LogOut, 
  Layers,
  Search,
  BookOpen,
  Network,
  Info
} from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface NavbarProps {
  user: any;
  workspaces?: any[];
  currentWorkspace?: any;
  onSelectWorkspace?: (ws: any) => void;
  onOpenUpload: () => void;
  onOpenChallenges: () => void;
  onOpenSavedQueries: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onOpenWorkspaceModal: () => void;
  onOpenCommandPalette: () => void;
  onOpenSnippets: () => void;
  onOpenDiagram: () => void;
  onOpenAbout: () => void;
  onOpenDatasetGallery: () => void;
  onLogout: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
}

function NavbarComponent({
  user,
  onOpenUpload,
  onOpenChallenges,
  onOpenSavedQueries,
  onOpenHistory,
  onOpenProfile,
  onOpenWorkspaceModal,
  onOpenCommandPalette,
  onOpenSnippets,
  onOpenDiagram,
  onOpenAbout,
  onOpenDatasetGallery,
  onLogout,
  onToggleSidebar,
  isSidebarOpen,
}: NavbarProps) {
  const { t, language } = useLanguage();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  return (
    <header className="win-window border-x-0 border-t-0 sticky top-0 z-30 flex flex-col select-none">
      {/* Top Application Title Bar */}
      <div className="win-titlebar flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-amber-300 drop-shadow" />
          <span className="tracking-wide">SQLDataLab v1.0</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleSidebar}
            className="md:hidden win-control-btn"
            title={language === "id" ? "Buka/Tutup Sidebar" : "Toggle Sidebar"}
          >
            {isSidebarOpen ? "✕" : "☰"}
          </button>
          <button className="win-control-btn" title={language === "id" ? "Minimalkan" : "Minimize"}>_</button>
          <button className="win-control-btn" title={language === "id" ? "Maksimalkan" : "Maximize"}>□</button>
          <button className="win-control-btn win-close" title={language === "id" ? "Tutup" : "Close"}>✕</button>
        </div>
      </div>

      {/* Menu Bar & Action Strip */}
      <div className="px-2 py-1 flex items-center justify-between gap-2 overflow-visible relative border-b border-[var(--win-border-dark)]">
        {/* Left: Start Button & Classic Menus */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Classic WinXP Start Button */}
          <button
            onClick={onOpenCommandPalette}
            className="win-start-btn flex items-center gap-1 text-xs"
            title={language === "id" ? "Start Menu / Palet Perintah (Ctrl+K)" : "Start Menu / Command Palette (Ctrl+K)"}
          >
            <span className="text-amber-300 font-bold text-sm">⊞</span>
            <span>start</span>
          </button>

          {/* Classic Menu Dropdowns */}
          <div className="hidden sm:flex items-center gap-0.5 text-xs">
            <button
              onClick={() => setActiveMenu(activeMenu === "file" ? null : "file")}
              className={`px-2 py-1 rounded-sm hover:bg-[var(--win-surface-alt)] font-medium ${
                activeMenu === "file" ? "win-inset" : ""
              }`}
            >
              {t.navbar.menuFile}
            </button>
            <button
              onClick={() => setActiveMenu(activeMenu === "query" ? null : "query")}
              className={`px-2 py-1 rounded-sm hover:bg-[var(--win-surface-alt)] font-medium ${
                activeMenu === "query" ? "win-inset" : ""
              }`}
            >
              {t.navbar.menuQuery}
            </button>
            <button
              onClick={() => setActiveMenu(activeMenu === "view" ? null : "view")}
              className={`px-2 py-1 rounded-sm hover:bg-[var(--win-surface-alt)] font-medium ${
                activeMenu === "view" ? "win-inset" : ""
              }`}
            >
              {t.navbar.menuView}
            </button>
            <button
              onClick={() => setActiveMenu(activeMenu === "help" ? null : "help")}
              className={`px-2 py-1 rounded-sm hover:bg-[var(--win-surface-alt)] font-medium ${
                activeMenu === "help" ? "win-inset" : ""
              }`}
            >
              {t.navbar.menuHelp}
            </button>
          </div>

          {/* File Menu Dropdown */}
          {activeMenu === "file" && (
            <div
              className="absolute left-16 top-16 win-outset p-1 z-50 min-w-44 space-y-0.5 text-xs shadow-xl"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenUpload();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <UploadCloud size={13} />
                <span>{t.navbar.menuUploadCsv}</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenDatasetGallery();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <span>📁</span>
                <span>{t.navbar.menuDatasetGallery}</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenWorkspaceModal();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <Layers size={13} />
                <span>{t.navbar.menuWorkspaces}</span>
              </button>
              <div className="border-t border-[var(--win-border-dark)] my-1" />
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onLogout();
                }}
                className="w-full text-left px-3 py-1 hover:bg-rose-600 hover:text-white flex items-center gap-2 text-rose-600"
              >
                <LogOut size={13} />
                <span>{t.navbar.menuLogout}</span>
              </button>
            </div>
          )}

          {/* Query Menu Dropdown */}
          {activeMenu === "query" && (
            <div
              className="absolute left-28 top-16 win-outset p-1 z-50 min-w-44 space-y-0.5 text-xs shadow-xl"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenSnippets();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <BookOpen size={13} />
                <span>{t.navbar.menuSnippets}</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenHistory();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <span>{t.navbar.menuHistory}</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenSavedQueries();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <span>{t.navbar.menuSavedQueries}</span>
              </button>
            </div>
          )}

          {/* View Menu Dropdown */}
          {activeMenu === "view" && (
            <div
              className="absolute left-40 top-16 win-outset p-1 z-50 min-w-44 space-y-0.5 text-xs shadow-xl"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenDiagram();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <Network size={13} />
                <span>{t.navbar.menuErd}</span>
              </button>
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenChallenges();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <Trophy size={13} />
                <span>{t.navbar.menuChallenges}</span>
              </button>
            </div>
          )}

          {/* Help Menu */}
          {activeMenu === "help" && (
            <div
              className="absolute left-52 top-16 win-outset p-1 z-50 min-w-48 space-y-0.5 text-xs shadow-xl"
              onMouseLeave={() => setActiveMenu(null)}
            >
              <button
                onClick={() => {
                  setActiveMenu(null);
                  onOpenAbout();
                }}
                className="w-full text-left px-3 py-1 hover:bg-[#0055ea] hover:text-white flex items-center gap-2"
              >
                <Info size={13} />
                <span>{t.navbar.menuAbout}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Action Push Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onOpenCommandPalette}
            title={t.navbar.commandPalette + " (Ctrl+K)"}
            className="win-btn text-xs py-0.5 hidden md:inline-flex"
          >
            <Search size={12} />
            <span>{t.common.search}</span>
            <kbd className="text-[9px] px-1 bg-[var(--win-inset-bg)] border border-[var(--win-border-dark)]">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={onOpenSnippets}
            title={t.snippets.title}
            className="win-btn text-xs py-0.5 hidden lg:inline-flex"
          >
            <BookOpen size={12} />
            <span>{t.navbar.snippetsBtn}</span>
          </button>

          <button
            onClick={onOpenDiagram}
            title={t.erd.title}
            className="win-btn text-xs py-0.5 hidden xl:inline-flex"
          >
            <Network size={12} />
            <span>{t.navbar.erdBtn}</span>
          </button>

          <button
            onClick={onOpenUpload}
            title={t.sidebar.importCsv}
            className="win-btn text-xs py-0.5 font-bold"
          >
            <UploadCloud size={13} className="text-blue-700" />
            <span className="hidden sm:inline">{t.sidebar.uploadCSV}</span>
          </button>

          <button
            onClick={onOpenDatasetGallery}
            title={t.datasetGallery.title}
            className="win-btn text-xs py-0.5 font-bold text-blue-800 dark:text-blue-300"
          >
            <span>📁</span>
            <span className="hidden sm:inline">{t.navbar.datasetGalleryBtn}</span>
          </button>

          <button
            onClick={onOpenChallenges}
            title={t.challenges.title}
            className="win-btn text-xs py-0.5"
          >
            <Trophy size={13} className="text-amber-600" />
            <span className="hidden sm:inline">{t.navbar.challenges}</span>
          </button>

          <button
            onClick={onOpenHistory}
            title={t.history.title}
            className="win-btn text-xs py-0.5 hidden md:inline-flex"
          >
            <span>{t.navbar.history}</span>
          </button>

          <button
            onClick={onOpenSavedQueries}
            title={t.savedQueries.title}
            className="win-btn text-xs py-0.5 hidden md:inline-flex"
          >
            <span>{t.navbar.savedQueries}</span>
          </button>

          {/* User Profile / Logout */}
          <div className="flex items-center gap-1 ml-1 pl-1 border-l border-[var(--win-border-dark)]">
            <button
              onClick={onOpenProfile}
              title={t.navbar.profileTooltip}
              className="win-btn text-xs py-0.5"
            >
              <div className="w-4 h-4 rounded-sm bg-[#0055ea] text-white flex items-center justify-center font-bold text-[10px]">
                {user?.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="hidden sm:inline max-w-[80px] truncate">{user?.username}</span>
            </button>

            <button
              onClick={onLogout}
              title={t.navbar.logoutTooltip}
              className="win-btn win-control-btn win-close text-xs !w-6 !h-6"
            >
              <LogOut size={12} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export const Navbar = React.memo(NavbarComponent);
