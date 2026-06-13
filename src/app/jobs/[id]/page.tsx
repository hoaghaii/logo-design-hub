import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Clock,
  Wallet,
  Users,
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  User,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatVND, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { ApplyForm } from "./apply-form";
import { chooseDesigner } from "@/app/applications/actions";
import type { ApplicationStatus } from "@/lib/types";

const APP_STATUS = {
  pending: { label: "Chờ duyệt", tone: "amber" as const },
  accepted: { label: "Đã chọn", tone: "green" as const },
  rejected: { label: "Từ chối", tone: "gray" as const },
};

export default async function JobDetailPage({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("*, client:users(id, full_name, bio)")
    .eq("id", id)
    .single();

  if (!job) notFound();

  const isOwner = user?.id === job.client_id;
  const isDesigner = user?.role === "designer";

  let alreadyApplied = false;
  if (isDesigner && user) {
    const { data: existing } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", id)
      .eq("designer_id", user.id)
      .maybeSingle();
    alreadyApplied = !!existing;
  }

  // Fetch applicants inline when owner is viewing
  type AppWithDesigner = {
    id: string;
    status: ApplicationStatus;
    cover_note: string | null;
    portfolio_ids: string[];
    designer: { id: string; full_name: string | null; bio: string | null } | null;
  };
  let applications: AppWithDesigner[] | null = null;
  let pfMap = new Map<string, { id: string; title: string; image_url: string }>();
  if (isOwner) {
    const { data: apps } = await supabase
      .from("applications")
      .select("*, designer:users(id, full_name, bio)")
      .eq("job_id", id)
      .order("created_at", { ascending: false });

    applications = apps;

    const allPortfolioIds = [
      ...new Set((apps ?? []).flatMap((a) => a.portfolio_ids)),
    ];
    if (allPortfolioIds.length) {
      const { data: pfs } = await supabase
        .from("portfolios")
        .select("id, title, image_url")
        .in("id", allPortfolioIds);
      pfMap = new Map((pfs ?? []).map((p) => [p.id, p]));
    }
  }

  const hasAccepted = (applications ?? []).some((a) => a.status === "accepted");
  const accepted = applications?.find((a) => a.status === "accepted");

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link
        href={isOwner ? "/jobs/manage" : "/jobs"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
      >
        <ArrowLeft size={15} />
        {isOwner ? "Job của tôi" : "Quay lại danh sách"}
      </Link>

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        {/* ───────── Main column ───────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Job header */}
          <Card>
            <CardContent>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Avatar name={job.client?.full_name} seed={job.client_id} size="lg" />
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                      {job.title}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                      Đăng bởi{" "}
                      <Link
                        href={`/profile/${job.client?.id}`}
                        className="font-medium text-slate-700 hover:text-emerald-600 hover:underline"
                      >
                        {job.client?.full_name || "Client"}
                      </Link>
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
                </div>
                <Badge tone={job.status === "open" ? "green" : "gray"}>
                  {job.status === "open" ? "Đang mở" : "Đã đóng"}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
                <div className="rounded-xl bg-emerald-50/60 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <Wallet size={13} /> Ngân sách
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {formatVND(job.budget)}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                    <Clock size={13} /> Deadline
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {job.deadline ? formatDateTime(job.deadline) : "Linh hoạt"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {job.description && (
            <Card>
              <CardContent>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Mô tả công việc
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                  {job.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Designer apply form */}
          {isDesigner && job.status === "open" && (
            <>
              {alreadyApplied ? (
                <Card>
                  <CardContent className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={20} />
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Bạn đã apply job này
                      </p>
                      <p className="text-sm text-slate-500">
                        Chờ client phản hồi nhé! Theo dõi ở mục “Công việc”.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ApplyForm jobId={job.id} />
              )}
            </>
          )}

          {/* Owner: applicants */}
          {isOwner && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Users size={18} className="text-slate-600" />
                <h2 className="text-lg font-semibold text-slate-900">
                  {accepted
                    ? "Designer đã chọn"
                    : `Ứng viên (${applications?.length ?? 0})`}
                </h2>
              </div>

              {accepted ? (
                <Card>
                  <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={accepted.designer?.full_name}
                        seed={accepted.designer?.id}
                        size="lg"
                      />
                      <div>
                        <Link
                          href={`/profile/${accepted.designer?.id}`}
                          className="font-semibold text-slate-900 hover:text-emerald-600 hover:underline"
                        >
                          {accepted.designer?.full_name || "Designer"}
                        </Link>
                        {accepted.designer?.bio && (
                          <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                            {accepted.designer.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    <Link href={`/deal/${accepted.id}`} className="w-full sm:w-auto">
                      <Button size="sm" className="w-full">
                        <MessageSquare size={15} /> Vào phòng deal
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : !applications || applications.length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-sm text-slate-400">
                    Chưa có ai apply job này.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {applications.map((app) => {
                    const meta = APP_STATUS[app.status];
                    return (
                      <Card key={app.id}>
                        <CardContent>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <Avatar
                                name={app.designer?.full_name}
                                seed={app.designer?.id}
                              />
                              <div>
                                <Link
                                  href={`/profile/${app.designer?.id}`}
                                  className="font-semibold text-slate-900 hover:text-emerald-600 hover:underline"
                                >
                                  {app.designer?.full_name || "Designer"}
                                </Link>
                                {app.designer?.bio && (
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {app.designer.bio}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge tone={meta.tone}>{meta.label}</Badge>
                          </div>

                          {app.cover_note && (
                            <p className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                              {app.cover_note}
                            </p>
                          )}

                          {app.portfolio_ids.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {app.portfolio_ids.map((pid) => {
                                const p = pfMap.get(pid);
                                if (!p) return null;
                                return (
                                  <div
                                    key={pid}
                                    className="relative h-20 w-20 overflow-hidden rounded-lg border border-slate-200"
                                  >
                                    <Image
                                      src={p.image_url}
                                      alt={p.title}
                                      fill
                                      sizes="80px"
                                      className="object-cover"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {!hasAccepted && (
                            <form action={chooseDesigner} className="mt-4">
                              <input
                                type="hidden"
                                name="application_id"
                                value={app.id}
                              />
                              <Button size="sm" type="submit">
                                <CheckCircle2 size={15} /> Chọn designer này
                              </Button>
                            </form>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ───────── Sidebar ───────── */}
        <aside className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-20">
            <Card>
              <CardContent>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tổng quan
                </p>
                <div className="mt-3 space-y-3 text-sm">
                  <Row icon={<Wallet size={15} />} label="Ngân sách">
                    <span className="font-semibold text-emerald-700">
                      {formatVND(job.budget)}
                    </span>
                  </Row>
                  <Row icon={<Clock size={15} />} label="Deadline">
                    {job.deadline ? formatDateTime(job.deadline) : "Linh hoạt"}
                  </Row>
                  <Row icon={<User size={15} />} label="Client">
                    {job.client?.full_name || "Client"}
                  </Row>
                </div>

                {!user && (
                  <Link href={`/auth/login?redirect=/jobs/${job.id}`}>
                    <Button className="mt-5 w-full">Đăng nhập để apply</Button>
                  </Link>
                )}
                {isDesigner && job.status === "open" && !alreadyApplied && (
                  <p className="mt-5 rounded-xl bg-emerald-50 px-3 py-2.5 text-center text-xs text-emerald-700">
                    Cuộn xuống để nộp portfolio và apply 👇
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-slate-500">
        {icon}
        {label}
      </span>
      <span className="text-right font-medium text-slate-800">{children}</span>
    </div>
  );
}
