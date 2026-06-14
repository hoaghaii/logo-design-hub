import Link from "next/link";
import { Clock, Wallet, Users, Plus, Search, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatETH, formatDateTime, toEth } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function JobsPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, client:users(full_name), applications(count)")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <PageHeader
        eyebrow="Việc làm"
        title="Việc đang mở"
        subtitle={`${jobs?.length ?? 0} dự án thiết kế đang tìm designer`}
        actions={
          user?.role === "client" ? (
            <Link href="/jobs/create">
              <Button size="sm">
                <Plus size={16} /> Đăng job
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Search bar (visual) */}
      <div className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search size={18} className="text-slate-400" />
        <span className="text-sm text-slate-400">
          Tìm theo tiêu đề, ngân sách, hoặc designer...
        </span>
      </div>

      {!jobs || jobs.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Search size={24} />}
          title="Chưa có job nào đang mở"
          description="Hãy quay lại sau, hoặc nếu bạn là client thì đăng job đầu tiên ngay."
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => {
            const count = job.applications?.[0]?.count ?? 0;
            return (
              <Link key={job.id} href={`/jobs/${job.id}`} className="group">
                <article className="flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-600/5">
                  <div className="flex items-start gap-3">
                    <Avatar name={job.client?.full_name} seed={job.client_id} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-slate-900 group-hover:text-emerald-700">
                        {job.title}
                      </h3>
                      <p className="truncate text-xs text-slate-500">
                        {job.client?.full_name || "Client"}
                        {job.created_at && (
                          <>
                            {" · "}
                            {formatDistanceToNow(new Date(job.created_at), {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    <ArrowUpRight
                      size={18}
                      className="shrink-0 text-slate-300 transition-colors group-hover:text-emerald-600"
                    />
                  </div>

                  {job.description && (
                    <p className="mt-3 line-clamp-2 text-sm text-slate-500">
                      {job.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone="green">
                      <Wallet size={12} /> {formatETH(toEth(job.budget))}
                    </Badge>
                    {job.deadline && (
                      <Badge tone="gray">
                        <Clock size={12} /> {formatDateTime(job.deadline)}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Users size={13} /> {count} ứng viên
                    </span>
                    <span className="font-medium text-emerald-600 opacity-0 transition-opacity group-hover:opacity-100">
                      Xem chi tiết →
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
