"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addPortfolio, deletePortfolio } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Portfolio = {
  id: string;
  title: string;
  category: string | null;
  image_url: string;
};

export function PortfolioUploader({
  userId,
  portfolios,
}: {
  userId: string;
  portfolios: Portfolio[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Chọn một ảnh trước.");
    if (!title.trim()) return toast.error("Nhập tiêu đề portfolio.");

    setBusy(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("portfolios")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("portfolios").getPublicUrl(path);

      const fd = new FormData();
      fd.set("title", title);
      fd.set("category", category);
      fd.set("image_url", publicUrl);
      await addPortfolio(fd);

      toast.success("Đã thêm portfolio!");
      setTitle("");
      setCategory("");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tải lên thất bại");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    await deletePortfolio(fd);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-dashed border-slate-300 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder="Tiêu đề (VD: Logo cà phê)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="Danh mục (VD: Logo)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
        />
        <Button onClick={handleUpload} disabled={busy} className="mt-3" size="sm">
          <UploadCloud size={16} />
          {busy ? "Đang tải..." : "Thêm portfolio"}
        </Button>
      </div>

      {portfolios.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {portfolios.map((p) => (
            <div
              key={p.id}
              className="group relative overflow-hidden rounded-lg border border-slate-200"
            >
              <div className="relative aspect-square">
                <Image
                  src={p.image_url}
                  alt={p.title}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
              <div className="p-2">
                <p className="truncate text-sm font-medium text-slate-800">
                  {p.title}
                </p>
                {p.category && (
                  <p className="text-xs text-slate-400">{p.category}</p>
                )}
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="absolute right-1.5 top-1.5 rounded-md bg-white/90 px-2 py-1 text-xs font-medium text-rose-600 opacity-0 shadow transition-opacity group-hover:opacity-100"
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
