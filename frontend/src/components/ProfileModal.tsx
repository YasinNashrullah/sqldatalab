"use client";

import React, { useState, useEffect } from "react";
import { 
  User as UserIcon, 
  KeyRound, 
  Sliders, 
  Award, 
  Database, 
  Clock, 
  CheckCircle2, 
  Layers, 
  Zap,
  ShieldAlert
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onProfileUpdated?: (updatedUser: any) => void;
  onUpdatePreferences?: (prefs: { autoUppercase: boolean; defaultLimit: number }) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
  onUpdatePreferences,
}) => {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<"stats" | "edit" | "security" | "preferences">("stats");
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Edit profile form
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // Security form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Preferences
  const [autoCaps, setAutoCaps] = useState(false);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      setErrorMsg("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getProfile();
      setProfileData(res);
      if (res.user) {
        setFullName(res.user.full_name || "");
        setEmail(res.user.email || "");
      }
    } catch (err: any) {
      setErrorMsg(language === "id" ? "Gagal memuat data profil." : "Failed to load profile data.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    try {
      setLoading(true);
      const res = await api.updateProfile({ full_name: fullName, email });
      setSuccessMsg(language === "id" ? "Profil berhasil diperbarui!" : "Profile successfully updated!");
      if (onProfileUpdated) onProfileUpdated(res.user);
    } catch (err: any) {
      setErrorMsg(err.message || (language === "id" ? "Gagal memperbarui profil." : "Failed to update profile."));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    if (newPassword !== confirmPassword) {
      setErrorMsg(language === "id" ? "Konfirmasi password baru tidak cocok." : "New password confirmation does not match.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg(language === "id" ? "Password baru minimal 6 karakter." : "New password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSuccessMsg(language === "id" ? "Password berhasil diperbarui!" : "Password successfully updated!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setErrorMsg(err.message || (language === "id" ? "Gagal memperbarui password." : "Failed to update password."));
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreferences = () => {
    if (onUpdatePreferences) {
      onUpdatePreferences({ autoUppercase: autoCaps, defaultLimit: limit });
      setSuccessMsg(language === "id" ? "Preferensi editor berhasil disimpan!" : "Editor preferences saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
  };

  if (!isOpen) return null;

  const stats = profileData?.stats || {};
  const user = profileData?.user || currentUser || {};

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[0.5px] animate-fadeIn p-3 sm:p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-2xl flex flex-col shadow-2xl p-0 max-h-[90vh] bg-[var(--win-surface)] text-[var(--win-text)]"
      >
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <UserIcon size={14} className="text-amber-300" />
            <span className="font-bold">{t.profileModal.title}</span>
          </div>
          <button
            onClick={onClose}
            className="win-control-btn win-close"
            title={t.profileModal.close}
          >
            ✕
          </button>
        </div>

        {/* User Summary Top Strip */}
        <div className="p-3 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 win-inset flex items-center justify-center text-xl font-bold bg-[#0055ea] text-white">
              {user.username?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[var(--win-text)]">
                  {user.full_name || user.username}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-blue-100 text-blue-900 border border-blue-400">
                  {stats.rank_title || "SQL Novice"}
                </span>
              </div>
              <p className="text-xs text-[var(--win-text-muted)] font-mono">@{user.username} • {user.email}</p>
            </div>
          </div>

          {/* XP Badge */}
          <div className="win-status-panel font-bold text-amber-800 bg-amber-50">
            <Zap size={13} className="text-amber-500 fill-amber-500" />
            <span>{stats.total_xp || 0} XP Earned</span>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-[var(--win-surface)] border-b border-[var(--win-border-dark)] overflow-x-auto">
          <button
            onClick={() => { setActiveTab("stats"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-3 ${activeTab === "stats" ? "active font-bold" : ""}`}
          >
            <Award size={13} />
            <span>{t.profileModal.tabStats}</span>
          </button>
          <button
            onClick={() => { setActiveTab("edit"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-3 ${activeTab === "edit" ? "active font-bold" : ""}`}
          >
            <UserIcon size={13} />
            <span>{t.profileModal.tabEdit}</span>
          </button>
          <button
            onClick={() => { setActiveTab("security"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-3 ${activeTab === "security" ? "active font-bold" : ""}`}
          >
            <KeyRound size={13} />
            <span>{t.profileModal.tabSecurity}</span>
          </button>
          <button
            onClick={() => { setActiveTab("preferences"); setErrorMsg(""); setSuccessMsg(""); }}
            className={`win-tab-item flex items-center gap-1.5 text-xs py-1 px-3 ${activeTab === "preferences" ? "active font-bold" : ""}`}
          >
            <Sliders size={13} />
            <span>{t.profileModal.tabPreferences}</span>
          </button>
        </div>

        {/* Tab Body (Sunken Area) */}
        <div className="flex-1 overflow-y-auto m-2 p-3 win-inset bg-[var(--win-inset-bg)] text-[var(--win-text)] space-y-3">
          {errorMsg && (
            <div className="p-2 bg-rose-50 border border-rose-400 text-rose-900 text-xs flex items-center gap-2 font-bold">
              <ShieldAlert size={14} className="text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-2 bg-emerald-50 border border-emerald-400 text-emerald-900 text-xs flex items-center gap-2 font-bold">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: Stats */}
          {activeTab === "stats" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                  <div className="flex items-center gap-1 text-[var(--win-text-muted)] mb-1">
                    <Database size={12} className="text-blue-700" />
                    <span>Total Query</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-[var(--win-text)]">
                    {stats.total_queries || 0}
                  </div>
                  <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                    {stats.successful_queries || 0} {language === "id" ? "sukses" : "success"} • {stats.failed_queries || 0} error
                  </div>
                </div>

                <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                  <div className="flex items-center gap-1 text-[var(--win-text-muted)] mb-1">
                    <CheckCircle2 size={12} className="text-emerald-700" />
                    <span>Success Rate</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-emerald-700">
                    {stats.success_rate || 0}%
                  </div>
                  <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                    {language === "id" ? "Tingkat kueri valid" : "Valid execution rate"}
                  </div>
                </div>

                <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                  <div className="flex items-center gap-1 text-[var(--win-text-muted)] mb-1">
                    <Award size={12} className="text-amber-600" />
                    <span>Challenges</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-amber-600">
                    {stats.completed_challenges || 0} / {stats.total_challenges || 12}
                  </div>
                  <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                    {language === "id" ? "Tantangan selesai" : "Completed tasks"}
                  </div>
                </div>

                <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                  <div className="flex items-center gap-1 text-[var(--win-text-muted)] mb-1">
                    <Clock size={12} className="text-indigo-700" />
                    <span>Avg Duration</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-indigo-700">
                    {stats.avg_duration_ms || 0} ms
                  </div>
                  <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                    {language === "id" ? "Rata-rata kecepatan" : "Average run duration"}
                  </div>
                </div>

                <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                  <div className="flex items-center gap-1 text-[var(--win-text-muted)] mb-1">
                    <Layers size={12} className="text-purple-700" />
                    <span>Workspaces</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-purple-700">
                    {stats.workspaces_count || 1} / 3
                  </div>
                  <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                    {language === "id" ? "Katalog aktif" : "Active catalogs"}
                  </div>
                </div>

                <div className="win-outset p-2.5 bg-[var(--win-surface)] text-xs">
                  <div className="flex items-center gap-1 text-[var(--win-text-muted)] mb-1">
                    <Database size={12} className="text-teal-700" />
                    <span>Total Datasets</span>
                  </div>
                  <div className="text-lg font-bold font-mono text-teal-700">
                    {stats.datasets_count || 0}
                  </div>
                  <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                    {stats.tables_count || 0} {language === "id" ? "tabel terdaftar" : "registered tables"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Edit Profile */}
          {activeTab === "edit" && (
            <form onSubmit={handleUpdateProfile} className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-bold mb-1">Username</label>
                <input
                  type="text"
                  disabled
                  value={user.username || ""}
                  className="win-inset w-full px-2.5 py-1.5 text-xs opacity-70 cursor-not-allowed bg-[var(--win-surface)] text-[var(--win-text)]"
                />
                <p className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                  {language === "id" ? "Username tidak dapat diubah." : "Username cannot be changed."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{t.profileModal.fullName}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t.profileModal.fullNamePlaceholder}
                  className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{t.profileModal.email}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.profileModal.emailPlaceholder}
                  className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="win-btn win-btn-primary font-bold text-xs px-4 py-1.5"
                >
                  {loading ? t.profileModal.saving : t.profileModal.saveProfile}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Security */}
          {activeTab === "security" && (
            <form onSubmit={handleChangePassword} className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-bold mb-1">{t.profileModal.currentPassword}</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{t.profileModal.newPassword}</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{t.profileModal.confirmPassword}</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="win-inset w-full px-2.5 py-1.5 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="win-btn text-xs font-bold px-4 py-1.5 text-rose-600"
                >
                  {loading ? t.profileModal.saving : t.profileModal.updatePassword}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Preferences */}
          {activeTab === "preferences" && (
            <div className="space-y-3 max-w-md">
              <div className="win-outset p-2.5 bg-[var(--win-surface)] flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-bold text-[var(--win-text)]">
                    {t.profileModal.autoCaps}
                  </div>
                  <div className="text-[10px] text-[var(--win-text-muted)] mt-0.5">
                    {language === "id"
                      ? "Secara otomatis mengubah kata kunci SQL (SELECT, FROM, dll.) menjadi huruf kapital saat mengetik."
                      : "Automatically convert SQL keywords (SELECT, FROM, etc.) to UPPERCASE as you type."}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoCaps(!autoCaps)}
                  className={`win-btn text-xs font-bold px-3 py-1 ${autoCaps ? "win-inset font-bold text-blue-700" : ""}`}
                >
                  {autoCaps ? "ON" : "OFF"}
                </button>
              </div>

              <div className="win-outset p-2.5 bg-[var(--win-surface)] space-y-1">
                <label className="block text-xs font-bold text-[var(--win-text)]">{t.profileModal.defaultLimit}</label>
                <div className="text-[10px] text-[var(--win-text-muted)]">
                  {language === "id"
                    ? "Batas jumlah baris maksimum yang diambil saat eksekusi query default."
                    : "Maximum number of rows returned during default query execution."}
                </div>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="win-inset px-2 py-1 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] mt-1"
                >
                  <option value={50}>50 {t.common.rows}</option>
                  <option value={100}>100 {t.common.rows}</option>
                  <option value={500}>500 {t.common.rows}</option>
                  <option value={1000}>1,000 {t.common.rows}</option>
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  className="win-btn win-btn-primary text-xs font-bold px-4 py-1.5"
                >
                  {language === "id" ? "Simpan Preferensi" : "Save Preferences"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex justify-end">
          <button
            onClick={onClose}
            className="win-btn text-xs px-4 py-1 font-bold"
          >
            {t.profileModal.close}
          </button>
        </div>
      </div>
    </div>
  );
};
