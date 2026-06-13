"use client";

import { useRef, useState, useTransition } from "react";
import { UploadCloud, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { applyToJob } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type FilePreview = { file: File; preview: string };

export function ApplyForm({ jobId }: { jobId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [coverNote, setCoverNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFilesChange(incoming: FileList | null) {
    if (!incoming) return;
    const next: FilePreview[] = Array.from(incoming).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setFiles((prev) => {
      // Revoke old previews when swapping
      prev.forEach((p) => URL.revokeObjectURL(p.preview));
      return next;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const supabase = createClient();
        const portfolioData: { url: string; title: string }[] = [];

        // Upload each file to the portfolios bucket
        for (const { file } of files) {
          const ext = file.name.split(".").pop() ?? "jpg";
          const path = `${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage
            .from("portfolios")
            .upload(path, file, { upsert: false });
          if (upErr) throw new Error(`Upload thất bại: ${upErr.message}`);

          const { data: { publicUrl } } = supabase.storage
            .from("portfolios")
            .getPublicUrl(path);

          // Derive a human-readable title from the filename
          const title = file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]/g, " ")
            .trim() || "Portfolio";

          portfolioData.push({ url: publicUrl, title });
        }

        const fd = new FormData();
        fd.set("job_id", jobId);
        fd.set("cover_note", coverNote);
        portfolioData.forEach(({ url, title }) => {
          fd.append("portfolio_url", url);
          fd.append("portfolio_title", title);
        });

        const result = await applyToJob(null, fd);
        if (result?.error) {
          setError(result.error);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gửi đơn thất bại");
      }
    });
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold text-slate-900">Apply job này</h2>

        <div className="mt-4 space-y-4">
          {/* File upload area */}
          <div>
            <Label>Ảnh portfolio đính kèm</Label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-slate-500 transition-colors hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-600"
            >
              <UploadCloud size={24} />
              <span className="text-sm font-medium">
                Chọn ảnh (nhiều file)
              </span>
              <span className="text-xs text-slate-400">PNG, JPG, WEBP…</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFilesChange(e.target.files)}
            />
          </div>

          {/* Previews */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {files.map(({ file, preview }, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X size={11} />
                  </button>
                  <p className="absolute bottom-0 left-0 right-0 truncate bg-black/40 px-1.5 py-0.5 text-[10px] text-white">
                    {file.name}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Cover note */}
          <div>
            <Label htmlFor="cover_note">Lời nhắn (cover note)</Label>
            <Textarea
              id="cover_note"
              value={coverNote}
              onChange={(e) => setCoverNote(e.target.value)}
              placeholder="Giới thiệu bản thân và vì sao bạn phù hợp..."
            />
          </div>

          {error && (
            <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Đang gửi..." : "Gửi đơn apply"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
