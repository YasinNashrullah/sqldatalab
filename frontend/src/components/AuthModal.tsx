"use client";

import React, { useState } from "react";
import { 
  Database, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface AuthModalProps {
  onSuccess: (user: any, defaultWorkspaceId: string) => void;
  onClose?: () => void;
}

export function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const { t } = useLanguage();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({
          username_or_email: username || email,
          password: password,
        });
        onSuccess(res.user, res.default_workspace_id);
      } else {
        const res = await api.register({
          email: email,
          username: username,
          password: password,
          full_name: fullName,
        });
        onSuccess(res.user, res.default_workspace_id);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsLoading(true);
    const demoUser = `demo_${Math.floor(Math.random() * 9000 + 1000)}`;
    try {
      const res = await api.register({
        email: `${demoUser}@sqldatalab.com`,
        username: demoUser,
        password: "DemoPassword123!",
        full_name: "Demo Analyst",
      });
      onSuccess(res.user, res.default_workspace_id);
    } catch (err: any) {
      setError(err.message || "Failed to initialize demo session.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn flex items-center justify-center p-3 select-none">
      <div className="win-window w-full max-w-md shadow-2xl p-0 flex flex-col bg-[var(--win-surface)] text-[var(--win-text)]">
        {/* Windows Titlebar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <Database size={14} className="text-amber-300" />
            <span className="font-bold">{t.authModal.title}</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="win-control-btn win-close">✕</button>
          )}
        </div>

        {/* Dialog Header Banner */}
        <div className="p-3 border-b border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center gap-3">
          <div className="w-10 h-10 win-inset flex items-center justify-center bg-[#0055ea] text-white">
            <Database size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--win-text)]">
              SQLDataLab Studio
            </h2>
            <p className="text-[11px] text-[var(--win-text-muted)]">
              {t.authModal.subtitle}
            </p>
          </div>
        </div>

        {/* Auth Tab Switcher */}
        <div className="flex items-center gap-1 px-3 pt-2 bg-[var(--win-surface)] border-b border-[var(--win-border-dark)]">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`win-tab-item text-xs py-1 px-3 ${isLogin ? "active font-bold" : ""}`}
          >
            {t.authModal.loginTitle}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`win-tab-item text-xs py-1 px-3 ${!isLogin ? "active font-bold" : ""}`}
          >
            {t.authModal.registerTitle}
          </button>
        </div>

        {/* Form Body */}
        <div className="p-3 space-y-3">
          {/* Error Alert */}
          {error && (
            <div className="p-2 win-inset bg-rose-50 border border-rose-400 text-rose-900 text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={14} className="text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold mb-1">{t.authModal.fullName}</label>
                <div className="relative">
                  <UserIcon size={13} className="absolute left-2.5 top-2 text-[var(--win-text-muted)]" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t.authModal.fullNamePlaceholder}
                    className="win-inset w-full pl-8 pr-2.5 py-1 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div>
                <label className="block text-[11px] font-bold mb-1">{t.authModal.email}</label>
                <div className="relative">
                  <Mail size={13} className="absolute left-2.5 top-2 text-[var(--win-text-muted)]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.authModal.emailPlaceholder}
                    className="win-inset w-full pl-8 pr-2.5 py-1 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold mb-1">
                {isLogin ? `${t.authModal.username} / ${t.authModal.email}` : t.authModal.username}
              </label>
              <div className="relative">
                <UserIcon size={13} className="absolute left-2.5 top-2 text-[var(--win-text-muted)]" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t.authModal.usernamePlaceholder}
                  className="win-inset w-full pl-8 pr-2.5 py-1 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold mb-1">{t.authModal.password}</label>
              <div className="relative">
                <Lock size={13} className="absolute left-2.5 top-2 text-[var(--win-text-muted)]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.authModal.passwordPlaceholder}
                  className="win-inset w-full pl-8 pr-2.5 py-1 text-xs bg-[var(--win-inset-bg)] text-[var(--win-text)] focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="win-btn win-btn-primary w-full py-1.5 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>{t.authModal.loading}</span>
                  </>
                ) : isLogin ? (
                  <>
                    <LogIn size={13} />
                    <span>{t.authModal.loginBtn}</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={13} />
                    <span>{t.authModal.registerBtn}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Login Option */}
          <div className="pt-2 border-t border-[var(--win-border-dark)] text-center">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={isLoading}
              className="win-btn w-full py-1 text-xs font-bold text-blue-700 flex items-center justify-center gap-1.5"
            >
              <Sparkles size={12} className="text-amber-500" />
              <span>{t.authModal.demoBtn}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
