"use client";

import React, { useState, useRef } from "react";
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2
} from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";

interface UploadModalProps {
  isOpen: boolean;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB per file

export function UploadModal({ isOpen, workspaceId, onClose, onSuccess }: UploadModalProps) {
  const { t, language } = useLanguage();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFiles = (rawFiles: File[]) => {
    setErrorMsg(null);
    const valid: File[] = [];
    const oversized: string[] = [];

    rawFiles.forEach((file) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        oversized.push(`${file.name} (${formatFileSize(file.size)})`);
      } else {
        valid.push(file);
      }
    });

    if (oversized.length > 0) {
      setErrorMsg(
        language === "id"
          ? `File melebihi batas 50MB per file: ${oversized.join(", ")}.`
          : `Files exceed 50MB limit per file: ${oversized.join(", ")}.`
      );
    }

    if (valid.length > 0) {
      setSelectedFiles((prev) => [...prev, ...valid]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const totalQueueSize = selectedFiles.reduce((acc, f) => acc + f.size, 0);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("workspace_id", workspaceId);
    selectedFiles.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await api.uploadDatasets(formData);
      setUploadResult(res);
      setSelectedFiles([]);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to upload datasets.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (uploadResult && uploadResult.total_successful > 0) {
      onSuccess();
    } else {
      onClose();
    }
  };

  return (
    <div 
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[0.5px] animate-fadeIn flex items-center justify-center p-3 select-none"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="win-window w-full max-w-md shadow-2xl p-0 flex flex-col max-h-[90vh]"
      >
        {/* Windows XP Dialog Title Bar */}
        <div className="win-titlebar">
          <div className="flex items-center gap-1.5">
            <UploadCloud size={14} className="text-amber-300" />
            <span className="font-bold">{t.uploadModal.title}</span>
          </div>
          <button
            onClick={handleClose}
            className="win-control-btn win-close"
            title={t.uploadModal.close}
          >
            ✕
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-3 overflow-y-auto space-y-3 bg-[var(--win-surface)] text-[var(--win-text)]">
          {/* Dropzone with Inset Box */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="win-inset p-5 text-center cursor-pointer bg-[var(--win-inset-bg)] hover:bg-blue-50/50 transition"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept=".csv,.tsv,.txt"
              className="hidden"
            />
            <UploadCloud size={32} className="mx-auto text-blue-700 mb-1" />
            <p className="text-xs font-bold text-[var(--win-text)]">
              {t.uploadModal.dropzoneTitle}
            </p>
            <div className="flex items-center justify-center gap-2 mt-1.5 text-[11px] text-[var(--win-text-muted)]">
              <span className="font-bold text-emerald-700">{t.uploadModal.dropzoneSub}</span>
              <span>•</span>
              <span>CSV, TSV, TXT</span>
            </div>
            <p className="text-[10px] text-[var(--win-text-muted)] mt-1">
              {t.uploadModal.dropzoneDesc}
            </p>
          </div>

          {/* Selected Files List */}
          {selectedFiles.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-[var(--win-text-muted)]">
                <span>{t.uploadModal.queueTitle(selectedFiles.length)}</span>
                <span className="font-mono">Total: {formatFileSize(totalQueueSize)}</span>
              </div>
              <div className="win-inset p-1 max-h-36 overflow-y-auto space-y-1 bg-[var(--win-inset-bg)]">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-1 bg-[var(--win-surface-alt)] border border-[var(--win-border-medium)] text-xs"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText size={12} className="text-blue-700 flex-shrink-0" />
                      <span className="truncate font-mono text-[11px]">{file.name}</span>
                      <span className="text-[10px] text-[var(--win-text-muted)] font-mono">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      title={language === "id" ? "Hapus dari antrean" : "Remove from queue"}
                      className="win-btn !p-0.5 !w-5 !h-5 text-rose-600 font-bold text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="win-inset p-2 bg-rose-50 border border-rose-400 text-rose-800 text-xs flex items-start gap-1.5">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Success Report */}
          {uploadResult && (
            <div className="space-y-2">
              {uploadResult.total_successful > 0 && (
                <div className="win-inset p-2 bg-emerald-50 border border-emerald-400 text-xs space-y-1 text-emerald-900">
                  <div className="flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 size={14} />
                    <span>
                      {language === "id"
                        ? `Berhasil mendaftarkan ${uploadResult.total_successful} tabel ke DuckDB!`
                        : `Successfully registered ${uploadResult.total_successful} tables into DuckDB!`}
                    </span>
                  </div>
                  {uploadResult.uploaded?.map((item: any, i: number) => (
                    <div key={i} className="text-[11px] font-mono pl-4">
                      • {language === "id" ? "Tabel" : "Table"} <strong className="text-blue-700">{item.table_name}</strong> ({item.row_count.toLocaleString()} {language === "id" ? "baris" : "rows"}, {item.column_count} {language === "id" ? "kolom" : "columns"})
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <div className="p-2 border-t border-[var(--win-border-dark)] bg-[var(--win-surface)] flex items-center justify-end gap-2">
          <button
            onClick={handleClose}
            className="win-btn text-xs !px-3 !py-1"
          >
            {t.uploadModal.close}
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || selectedFiles.length === 0}
            className="win-btn win-btn-primary font-bold text-xs !px-4 !py-1"
          >
            {isUploading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>{t.uploadModal.uploading}</span>
              </>
            ) : (
              <>
                <UploadCloud size={12} />
                <span>{t.uploadModal.uploadBtn(selectedFiles.length)}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
