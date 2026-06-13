import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/notifications");

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <PageHeader eyebrow="Hoạt động" title="Thông báo" />

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={<Bell size={24} />}
          title="Chưa có thông báo nào"
          description="Cập nhật về deal, order và sản phẩm sẽ hiện ở đây."
        />
      ) : (
        <div className="mt-6 space-y-2">
          {notifications.map((n) => {
            const inner = (
              <Card
                className={
                  n.is_read
                    ? "transition-shadow hover:shadow-md"
                    : "border-emerald-200 bg-emerald-50/40 transition-shadow hover:shadow-md"
                }
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{n.title}</p>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    )}
                  </div>
                  {n.body && (
                    <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(n.created_at)}
                  </p>
                </CardContent>
              </Card>
            );
            return n.link ? (
              <Link key={n.id} href={n.link}>
                {inner}
              </Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
