import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { EscrowClient } from "./escrow-client";

export default async function EscrowPage({
  params,
}: PageProps<"/orders/[id]/escrow">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?redirect=/orders/${id}/escrow`);

  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select(
      "*, client:users!orders_client_id_fkey(full_name, wallet_address), designer:users!orders_designer_id_fkey(full_name, wallet_address), job:jobs(title)"
    )
    .eq("id", id)
    .single();

  if (!order) notFound();
  const isClient = user.id === order.client_id;
  const isDesigner = user.id === order.designer_id;
  if (!isClient && !isDesigner) redirect("/orders");

  const [{ data: transactions }, { data: deliverable }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("deliverables")
      .select("*")
      .eq("order_id", id)
      .order("submitted_at", { ascending: false })
      .maybeSingle(),
  ]);

  let downloadUrl: string | null = null;
  if (deliverable && !deliverable.is_locked) {
    const { data: signed } = await supabase.storage
      .from("deliverables")
      .createSignedUrl(deliverable.file_url, 3600);
    downloadUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600"
      >
        <ArrowLeft size={15} /> Đơn hàng
      </Link>

      <div className="mt-5 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-600/30">
          <ShieldCheck size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Hợp đồng Escrow
          </h1>
          <p className="text-sm text-slate-500">{order.job?.title}</p>
        </div>
      </div>

      <EscrowClient
        order={{
          id: order.id,
          status: order.status,
          final_price: order.final_price,
          contract_address: order.contract_address,
          deadline: order.deadline,
        }}
        role={isClient ? "client" : "designer"}
        counterpartyName={
          isClient
            ? order.designer?.full_name ?? "Designer"
            : order.client?.full_name ?? "Client"
        }
        designerWalletAddress={order.designer?.wallet_address ?? null}
        designerId={order.designer_id}
        transactions={transactions ?? []}
        deliverable={deliverable ?? null}
        downloadUrl={downloadUrl}
      />
    </div>
  );
}
