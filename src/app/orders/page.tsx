import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Wallet,
  Clock,
  ArrowRight,
  ShieldCheck,
  Loader,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatVND, formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat";
import { EmptyState } from "@/components/ui/empty-state";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/orders");

  const supabase = await createClient();
  const column = user.role === "client" ? "client_id" : "designer_id";
  const { data: orders } = await supabase
    .from("orders")
    .select(
      "*, job:jobs(title), client:users!orders_client_id_fkey(full_name), designer:users!orders_designer_id_fkey(full_name)"
    )
    .eq(column, user.id)
    .order("created_at", { ascending: false });

  const list = orders ?? [];
  const activeCount = list.filter(
    (o) => o.status === "active" || o.status === "submitted"
  ).length;
  const completedCount = list.filter((o) => o.status === "completed").length;
  const totalValue = list
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.final_price, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <PageHeader
        eyebrow="Bảng điều khiển"
        title="Đơn hàng"
        subtitle="Các hợp đồng escrow của bạn."
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Loader size={18} />}
          label="Đang thực hiện"
          value={activeCount}
          tone="blue"
        />
        <StatCard
          icon={<CheckCircle2 size={18} />}
          label="Hoàn thành"
          value={completedCount}
          tone="emerald"
        />
        <StatCard
          icon={<Wallet size={18} />}
          label="Tổng giá trị xong"
          value={formatVND(totalValue)}
          tone="slate"
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<ShieldCheck size={24} />}
          title="Chưa có đơn hàng nào"
          description="Đơn hàng sẽ xuất hiện khi hợp đồng escrow được tạo."
        />
      ) : (
        <div className="mt-6 space-y-3">
          {list.map((order) => {
            const partnerName =
              user.role === "client"
                ? order.designer?.full_name
                : order.client?.full_name;
            return (
              <Link key={order.id} href={`/orders/${order.id}/escrow`}>
                <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar name={partnerName} seed={order.id} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-slate-900">
                            {order.job?.title ?? "Đơn hàng"}
                          </h3>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                          <span className="flex items-center gap-1 font-medium text-emerald-700">
                            <Wallet size={14} /> {formatVND(order.final_price)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} /> {formatDateTime(order.deadline)}
                          </span>
                          <span className="text-slate-400">
                            {user.role === "client" ? "Designer" : "Client"}:{" "}
                            {partnerName ?? "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-emerald-600">
                      Escrow <ArrowRight size={15} />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
