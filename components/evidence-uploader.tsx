"use client";

import { useState, useRef } from "react";
import {
  FileText,
  FileCheck,
  Film,
  Music,
  Image as ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { compressImage } from "@/lib/virus-scanner";
import type { EvidenceFile } from "@/lib/mock";

interface EvidenceUploaderProps {
  files: EvidenceFile[];
  onChange: (files: EvidenceFile[]) => void;
  className?: string;
}

export function EvidenceUploader({ files, onChange, className }: EvidenceUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setErrorMsg(null);
    setUploading(true);

    const newUploaded: EvidenceFile[] = [];

    for (let i = 0; i < selected.length; i++) {
      let file = selected[i];

      // 1. Client-side image compression for photos
      if (file.type.startsWith("image/")) {
        try {
          file = await compressImage(file);
        } catch (err) {
          console.warn("Client compression skipped:", err);
        }
      }

      // 2. Upload to server
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/evidence/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (res.ok && data.success) {
          newUploaded.push(data.file);
        } else {
          setErrorMsg(data.error || `Failed to upload ${file.name}`);
        }
      } catch (err) {
        setErrorMsg(`Network error uploading ${file.name}.`);
      }
    }

    if (newUploaded.length > 0) {
      onChange([...files, ...newUploaded]);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (id: string) => {
    onChange(files.filter((f) => f.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return ImageIcon;
    if (type.startsWith("video/")) return Film;
    if (type.startsWith("audio/")) return Music;
    return FileText;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-3 ${className || ""}`}>
      {/* Upload drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 p-5 text-center transition-colors hover:border-blue-900 hover:bg-blue-50/40"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.mp4,.webm"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-900 mb-2">
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
        </div>

        <p className="text-sm font-semibold text-slate-800">
          {uploading ? "Scanning & Uploading Evidence..." : "Click or drag files to attach evidence"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          PDF documents, photos, audio recordings, or video clips (Max 25 MB per file)
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Real-time Anti-Virus scanning enabled</span>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Uploaded files list */}
      {files.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.type);
            const isImage = file.type.startsWith("image/") && file.url;

            return (
              <div
                key={file.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={file.url}
                      alt={file.name}
                      className="h-10 w-10 rounded object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600">
                      <Icon className="h-5 w-5" />
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-medium text-slate-800 truncate max-w-[170px]">{file.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span>{formatBytes(file.size)}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                        <FileCheck className="h-3 w-3" /> Scanned Clean
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFile(file.id)}
                  className="h-7 w-7 text-slate-400 hover:text-red-600 shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
