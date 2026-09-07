"use client";

import React, { useState } from "react";
import { Layers, Plus, Trash2, Edit3, AlertCircle, Check } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface WorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaces: any[];
  currentWorkspace: any;
  onSelectWorkspace?: (ws: any) => void;
  onWorkspaceCreated?: (ws: any) => void;
  onWorkspaceUpdated?: (ws: any) => void;
  onWorkspaceDeleted?: (wsId: string) => void;
  onWorkspacesChanged?: (wsList: any[], newActiveWs?: any) => void;
}

export const WorkspaceModal: React.FC<WorkspaceModalProps> = ({
  isOpen,
  onClose,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onWorkspaceCreated,
  onWorkspaceUpdated,
  onWorkspaceDeleted,
  onWorkspacesChanged,
}) => {
  const { t, language } = useLanguage();
  const [mode, setMode] = useState<"create" | "manage">("create");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Edit fields
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  if (!isOpen) return null;

  const isQuotaFull = workspaces.length >= 3;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await api.createWorkspace({ name, description });
      setName("");
      setDescription("");
      if (onWorkspaceCreated) onWorkspaceCreated(res.workspace);
      if (onWorkspacesChanged) {
        onWorkspacesChanged([...workspaces, res.workspace], res.workspace);
      }
      setMode("manage");
    } catch (err: any) {
      setErrorMsg(err.message || (language === "id" ? "Gagal membuat workspace." : "Failed to create workspace."));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await api.updateWorkspace(id, { name: editName, description: editDesc });
      const updatedList = workspaces.map((w) => (w.id === id ? res.workspace : w));
      if (onWorkspaceUpdated) onWorkspaceUpdated(res.workspace);
      if (onWorkspacesChanged) onWorkspacesChanged(updatedList);
      setEditId(null);
    } catch (err: any) {
      setErrorMsg(err.message || (language === "id" ? "Gagal memperbarui workspace." : "Failed to update workspace."));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      setErrorMsg("");
      await api.deleteWorkspace(id);
      const remaining = workspaces.filter((w) => w.id !== id);
      if (onWorkspaceDeleted) onWorkspaceDeleted(id);
      if (onWorkspacesChanged) onWorkspacesChanged(remaining);
      setConfirmDeleteId(null);
    } catch (err: any) {
      setErrorMsg(err.message || (language === "id" ? "Gagal menghapus workspace." : "Failed to delete workspace."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-md flex flex-col shadow-2xl p-0 bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Layers size={14} className="text-amber-300" />
            <span className="font-bold">{t.workspaceModal.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.workspaceModal.close}
          >
            ✕
          </button>
        </div>

        {/* Quota Status Strip */}
        <div className="win-status-bar px-2 py-1 justify-between text-xs border-b border-[var(--win-border-dark)]">
          <span>
            {language === "id"
              ? `Kapasitas: ${workspaces.length}/3 Workspace`
              : `Capacity: ${workspaces.length}/3 Workspaces`}
          </span>
          <span className={`font-bold ${isQuotaFull ? "text-amber-700" : "text-emerald-700"}`}>
            {isQuotaFull 
              ? (language === "id" ? "Batas Tercapai (3/3)" : "Quota Reached (3/3)") 
              : (language === "id" ? `${3 - workspaces.length} Slot Tersedia` : `${3 - workspaces.length} Slots Available`)}
          </span>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-[var(--win-surface)] border-b border-[var(--win-border-dark)]">
          <button
            onClick={() => { setMode("create"); setErrorMsg(""); }}
            className={`win-tab-item text-xs py-1 px-3 ${mode === "create" ? "active font-bold" : ""}`}
          >
            {t.workspaceModal.tabCreate}
          </button>
          <button
            onClick={() => { setMode("manage"); setErrorMsg(""); }}
            className={`win-tab-item text-xs py-1 px-3 ${mode === "manage" ? "active font-bold" : ""}`}
          >
            {t.workspaceModal.tabManage} ({workspaces.length})
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-3 space-y-3">
          {errorMsg && (
            <div className="p-2 bg-rose-50 border border-rose-400 text-rose-900 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === "create" ? (
            isQuotaFull ? (
              <div className="win-inset p-3 bg-amber-50 border border-amber-400 text-amber-900 text-xs space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>{t.workspaceModal.quotaWarning}</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  {language === "id"
                    ? 'Setiap akun dibatasi hingga 3 workspace mandiri dengan katalog DuckDB terisolasi. Hapus salah satu workspace pada tab "Kelola Workspace" untuk membuat workspace baru.'
                    : 'Each account is limited to 3 isolated workspaces with separate DuckDB catalogs. Delete a workspace in the "Manage Workspaces" tab to create a new one.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1">{t.workspaceModal.nameLabel}</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.workspaceModal.namePlaceholder}
                    className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">{t.workspaceModal.descLabel}</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t.workspaceModal.descPlaceholder}
                    className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none resize-none"
                  />
                </div>

                <div className="win-inset p-2.5 bg-[var(--win-surface)] text-[11px] text-[var(--win-text-muted)] space-y-1">
                  <div className="text-blue-700 font-bold flex items-center gap-1">
                    <Plus size={12} />
                    <span>{language === "id" ? "Fitur Workspace Terisolasi" : "Isolated Workspace Feature"}</span>
                  </div>
                  <p>
                    {language === "id"
                      ? "Database DuckDB, dataset CSV, riwayat eksekusi query, dan query library disimpan dalam folder independen."
                      : "DuckDB databases, CSV datasets, query execution logs, and saved queries are stored in isolated folders."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  className="win-btn win-btn-primary w-full py-1.5 text-xs font-bold"
                >
                  {loading ? t.workspaceModal.creating : t.workspaceModal.createBtn}
                </button>
              </form>
            )
          ) : (
            /* Manage Mode */
            <div className="win-inset p-1.5 space-y-1.5 max-h-64 overflow-y-auto bg-[var(--win-inset-bg)]">
              {workspaces.map((ws) => {
                const isActive = ws.id === currentWorkspace?.id;
                const isEditing = editId === ws.id;

                return (
                  <div
                    key={ws.id}
                    className={`win-outset p-2 text-xs transition ${
                      isActive ? "bg-blue-50 border-blue-500" : "bg-[var(--win-surface)]"
                    }`}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="win-inset w-full px-2 py-1 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)]"
                        />
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder={t.workspaceModal.descPlaceholder}
                          className="win-inset w-full px-2 py-1 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)]"
                        />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUpdate(ws.id)}
                            className="win-btn text-[11px] font-bold text-emerald-700"
                          >
                            {t.workspaceModal.saveChanges}
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="win-btn text-[11px]"
                          >
                            {t.workspaceModal.cancel}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            if (onSelectWorkspace && !isActive) {
                              onSelectWorkspace(ws);
                              onClose();
                            }
                          }}
                          title={
                            isActive 
                              ? (language === "id" ? "Workspace aktif" : "Active workspace")
                              : (language === "id" ? "Klik untuk berpindah ke workspace ini" : "Click to switch to this workspace")
                          }
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--win-text)] truncate">{ws.name}</span>
                            {isActive && (
                              <span className="px-1 py-0.2 text-[10px] font-bold bg-blue-600 text-white flex items-center gap-0.5">
                                <Check size={10} />
                                {language === "id" ? "Aktif" : "Active"}
                              </span>
                            )}
                          </div>
                          {ws.description && (
                            <p className="text-[11px] text-[var(--win-text-muted)] truncate mt-0.5">{ws.description}</p>
                          )}
                          <div className="text-[10px] text-[var(--win-text-muted)] mt-1 font-mono">
                            {ws.dataset_count || 0} {language === "id" ? "dataset" : "datasets"} • {ws.table_count || 0} {language === "id" ? "tabel" : "tables"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditId(ws.id);
                              setEditName(ws.name);
                              setEditDesc(ws.description || "");
                            }}
                            title={language === "id" ? "Edit nama" : "Edit name"}
                            className="win-btn !p-1 text-blue-700"
                          >
                            <Edit3 size={12} />
                          </button>

                          {workspaces.length > 1 && (
                            confirmDeleteId === ws.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(ws.id)}
                                  className="win-btn text-[10px] bg-rose-600 text-white font-bold"
                                >
                                  {language === "id" ? "Hapus?" : "Delete?"}
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="win-btn text-[10px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(ws.id)}
                                title={language === "id" ? "Hapus workspace" : "Delete workspace"}
                                className="win-btn !p-1 text-rose-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="win-btn text-xs px-4 py-1 font-bold"
          >
            {t.workspaceModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
