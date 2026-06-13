import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Pencil, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export default async function ProfilePage({
  params,
}: PageProps<"/profile/[userId]">) {
  const { userId } = await params;
  const me = await getCurrentUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, bio, role, created_at")
    .eq("id", userId)
    .single();

  if (!profile) notFound();

  const isDesigner = profile.role === "designer";
  const { data: portfolios } = isDesigner
    ? await supabase
        .from("portfolios")
        .select("id, title, category, image_url")
        .eq("designer_id", userId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Profile header */}
      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-br from-emerald-500 to-teal-600 bg-grid" />
        <CardContent className="pt-0">
          <div className="-mt-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              <Avatar
                name={profile.full_name}
                seed={profile.id}
                size="xl"
                className="ring-4 ring-white"
              />
              <div className="pb-1">
                <h1 className="text-xl font-bold text-slate-900">
                  {profile.full_name || "Người dùng"}
                </h1>
                <div className="mt-1 flex items-center gap-2">
                  <Badge tone={isDesigner ? "teal" : "blue"}>
                    {isDesigner ? "Designer" : "Client"}
                  </Badge>
                  {memberSince && (
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <CalendarDays size={12} /> Tham gia {memberSince}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {me?.id === profile.id && (
              <Link href="/profile/edit">
                <Button variant="outline" size="sm">
                  <Pencil size={14} /> Chỉnh sửa
                </Button>
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="mt-5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
              {profile.bio}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Portfolio */}
      {isDesigner && (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <LayoutGrid size={18} className="text-slate-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              Portfolio{" "}
              <span className="text-slate-400">({portfolios?.length ?? 0})</span>
            </h2>
          </div>
          {!portfolios || portfolios.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-slate-400">
                Chưa có portfolio nào.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {portfolios.map((p) => (
                <div
                  key={p.id}
                  className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={p.image_url}
                      alt={p.title}
                      fill
                      sizes="240px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {p.title}
                    </p>
                    {p.category && (
                      <p className="text-xs text-slate-400">{p.category}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
