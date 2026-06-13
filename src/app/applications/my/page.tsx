import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Clock,
  Wallet,
  MessageSquare,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatVND, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, OrderStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";

const APP_STATUS = {
  pending: { label: "Chờ duyệt", tone: "amber" as const },
  accepted: { label: "Đã được chọn", tone: "green" as const },
  rejected: { label: "Không được chọn", tone: "gray" as const },
};

export default async function MyWorkPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/applications/my");
  if (user.role !== "designer") redirect("/jobs/manage");

  const supabase = await createClient();

  const [{ data: applications }, { data: orders }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, status, cover_note, job:jobs(id, title, budget, deadline, client_id, client:users(full_name))"
      )
      .eq("designer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("orders").select("id, status, job_id").eq("designer_id", user.id),
  ]);

  const orderByJobId = new Map((orders ?? []).map((o) => [o.job_id, o]));
  const list = applications ?? [];
  const acceptedCount = list.filter((a) => a.status === "accepted").length;
  const activeOrders = (orders ?? []).filter(
    (o) => o.status === "active" || o.status === "submitted"
  ).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <PageHeader
        eyebrow="Bảng điều khiển"
        title="Công việc của tôi"
        subtitle="Theo dõi đơn apply, deal và escrow của bạn."
        actions={
          <Link href="/jobs">
            <Button size="sm" variant="outline">
              <Search size={16} /> Tìm việc
            </Button>
          </Link>
        }
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={<Briefcase size={18} />} label="Đã apply" value={list.length} />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Được chọn"
          value={acceptedCount}
          tone="emerald"
        />
        <StatCard
          icon={<ShieldCheck size={18} />}
          label="Đang làm"
          value={activeOrders}
          tone="blue"
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Search size={24} />}
          title="Bạn chưa apply job nào"
          description="Khám phá việc đang mở và nộp portfolio của bạn."
          action={
            <Link href="/jobs">
              <Button size="sm">Tìm việc ngay</Button>
            </Link>
          }
        />
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((app) => {
            const job = app.job;
            if (!job) return null;
            const meta = APP_STATUS[app.status];
            const order = orderByJobId.get(job.id);
            const client = job.client as { full_name: string | null } | null;

            return (
              <Card
                key={app.id}
                className={app.status === "rejected" ? "opacity-60" : undefined}
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={client?.full_name} seed={job.client_id} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/jobs/${job.id}`}
                            className="truncate font-semibold text-slate-900 hover:text-emerald-600 hover:underline"
                          >
                            {job.title}
                          </Link>
                          <Badge tone={meta.tone}>{meta.label}</Badge>
                          {order && <OrderStatusBadge status={order.status} />}
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1 font-medium text-emerald-700">
                            <Wallet size={13} /> {formatVND(job.budget)}
                          </span>
                          {job.deadline && (
                            <span className="flex items-center gap-1">
                              <Clock size={13} /> {formatDateTime(job.deadline)}
                            </span>
                          )}
                          {client && (
                            <span className="text-slate-400">
                              bởi {client.full_name ?? "Client"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {app.status === "accepted" && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Link href={`/deal/${app.id}`}>
                        <Button size="sm" variant="outline">
                          <MessageSquare size={14} /> Chat / Deal
                        </Button>
                      </Link>
                      {order && (
                        <Link href={`/orders/${order.id}/escrow`}>
                          <Button size="sm">
                            <ShieldCheck size={14} /> Vào Escrow
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
