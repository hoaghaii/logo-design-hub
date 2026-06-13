import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { Avatar } from "@/components/ui/avatar";
import { DealRoom } from "./deal-room";

export default async function DealPage({
  params,
}: PageProps<"/deal/[applicationId]">) {
  const { applicationId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?redirect=/deal/${applicationId}`);

  const supabase = await createClient();
  const { data: app } = await supabase
    .from("applications")
    .select(
      "id, designer_id, designer:users(full_name), job:jobs(id, title, budget, deadline, client_id)"
    )
    .eq("id", applicationId)
    .single();

  if (!app || !app.job) notFound();

  const isClient = user.id === app.job.client_id;
  const isDesigner = user.id === app.designer_id;
  if (!isClient && !isDesigner) redirect("/orders");

  const partnerId = isClient ? app.designer_id : app.job.client_id;
  const { data: partner } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", partnerId)
    .single();
  const partnerName = partner?.full_name ?? (isClient ? "Designer" : "Client");

  const [{ data: messages }, { data: order }] = await Promise.all([
    supabase
      .from("deal_messages")
      .select("*, sender:users(full_name)")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select("id, status, final_price, contract_address, deadline")
      .eq("job_id", app.job.id)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={isClient ? `/jobs/${app.job.id}` : "/applications/my"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
      >
        <ArrowLeft size={15} /> Quay lại
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <Avatar name={partnerName} seed={partnerId} size="lg" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {partnerName}
          </h1>
          <p className="text-sm text-slate-500">
            Phòng deal · <span className="font-medium">{app.job.title}</span>
          </p>
        </div>
      </div>

      <DealRoom
        applicationId={applicationId}
        jobId={app.job.id}
        currentUserId={user.id}
        role={isClient ? "client" : "designer"}
        budget={app.job.budget}
        defaultDeadline={app.job.deadline}
        initialMessages={(messages ?? []) as Parameters<typeof DealRoom>[0]["initialMessages"]}
        initialOrder={order ?? null}
        partnerName={partnerName}
      />
    </div>
  );
}
