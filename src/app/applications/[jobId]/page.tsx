import Link from "next/link";
import Image from "next/image";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { chooseDesigner } from "@/app/applications/actions";

const APP_STATUS = {
  pending: { label: "Chờ duyệt", tone: "amber" as const },
  accepted: { label: "Đã chọn", tone: "green" as const },
  rejected: { label: "Từ chối", tone: "gray" as const },
};

export default async function ApplicantsPage({
  params,
}: PageProps<"/applications/[jobId]">) {
  const { jobId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?redirect=/applications/${jobId}`);

  const supabase = await createClient();
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (!job) notFound();
  if (job.client_id !== user.id) redirect("/jobs/manage");

  const { data: applications } = await supabase
    .from("applications")
    .select("*, designer:users(id, full_name, bio)")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });

  // Resolve any portfolio images referenced by applicants.
  const allPortfolioIds = [
    ...new Set((applications ?? []).flatMap((a) => a.portfolio_ids)),
  ];
  const { data: portfolios } = allPortfolioIds.length
    ? await supabase
        .from("portfolios")
        .select("id, title, image_url")
        .in("id", allPortfolioIds)
    : { data: [] };
  const pfMap = new Map((portfolios ?? []).map((p) => [p.id, p]));

  const hasAccepted = (applications ?? []).some((a) => a.status === "accepted");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/jobs/manage"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
      >
        <ArrowLeft size={15} /> Quay lại
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
        Ứng viên — {job.title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {applications?.length ?? 0} designer đã apply
      </p>

      <div className="mt-6 space-y-4">
        {(!applications || applications.length === 0) && (
          <Card>
            <CardContent>
              <p className="py-6 text-center text-slate-400">
                Chưa có ai apply job này.
              </p>
            </CardContent>
          </Card>
        )}

        {applications?.map((app) => {
          const meta = APP_STATUS[app.status];
          return (
            <Card key={app.id}>
              <CardContent>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={app.designer?.full_name} seed={app.designer?.id} />
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
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">
                    {app.cover_note}
                  </p>
                )}

                {app.portfolio_ids.length > 0 && (
                  <div className="mt-3 flex gap-2">
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

                <div className="mt-4 flex gap-2">
                  {app.status === "accepted" ? (
                    <Link href={`/deal/${app.id}`}>
                      <Button size="sm">Tiếp tục deal / tạo order →</Button>
                    </Link>
                  ) : (
                    !hasAccepted && (
                      <form action={chooseDesigner}>
                        <input type="hidden" name="application_id" value={app.id} />
                        <Button size="sm" type="submit">
                          Chọn designer này
                        </Button>
                      </form>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
