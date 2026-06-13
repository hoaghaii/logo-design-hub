import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Wallet, Plus, Briefcase, FolderOpen, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatETH } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";

const JOB_STATUS_META = {
  open: { label: "Đang mở", tone: "green" as const },
  in_progress: { label: "Đang thực hiện", tone: "blue" as const },
  completed: { label: "Hoàn thành", tone: "indigo" as const },
  cancelled: { label: "Đã hủy", tone: "gray" as const },
};

export default async function ManageJobsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/jobs/manage");
  if (user.role !== "client") redirect("/jobs");

  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*, applications(count)")
    .eq("client_id", user.id)
    .order("created_at", { ascending: false });

  const list = jobs ?? [];
  const totalApplicants = list.reduce(
    (sum, j) => sum + (j.applications?.[0]?.count ?? 0),
    0
  );
  const openCount = list.filter((j) => j.status === "open").length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        eyebrow="Bảng điều khiển"
        title="Job của tôi"
        subtitle="Quản lý các dự án bạn đã đăng và ứng viên."
        actions={
          <Link href="/jobs/create">
            <Button size="sm">
              <Plus size={16} /> Đăng job
            </Button>
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Briefcase size={18} />} label="Tổng job" value={list.length} />
        <StatCard
          icon={<FolderOpen size={18} />}
          label="Đang mở"
          value={openCount}
          tone="blue"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Tổng ứng viên"
          value={totalApplicants}
          tone="amber"
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Briefcase size={24} />}
          title="Bạn chưa đăng job nào"
          description="Đăng job đầu tiên để bắt đầu nhận portfolio từ designer."
          action={
            <Link href="/jobs/create">
              <Button size="sm">
                <Plus size={16} /> Đăng job ngay
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((job) => {
            const count = job.applications?.[0]?.count ?? 0;
            const meta = JOB_STATUS_META[job.status];
            return (
              <Card key={job.id} className="transition-shadow hover:shadow-md">
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900">
                        {job.title}
                      </h3>
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1 font-medium text-emerald-700">
                        <Wallet size={14} /> {formatETH(job.budget)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={14} /> {count} ứng viên
                      </span>
                      {job.created_at && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock size={14} />
                          {formatDistanceToNow(new Date(job.created_at), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href={`/jobs/${job.id}`} className="shrink-0">
                    <Button variant="outline" size="sm">
                      Chi tiết
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
