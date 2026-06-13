import * as React from "react";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

type Tone = "gray" | "blue" | "green" | "amber" | "red" | "indigo" | "teal";

const tones: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
};

export function Badge({
  tone = "gray",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

/** Vietnamese label + tone for each order status. */
export const ORDER_STATUS_META: Record<
  OrderStatus,
  { label: string; tone: Tone }
> = {
  pending_acceptance: { label: "Chờ designer chấp nhận", tone: "amber" },
  declined: { label: "Designer từ chối", tone: "red" },
  pending_escrow: { label: "Chờ ký quỹ", tone: "amber" },
  active: { label: "Đang thực hiện", tone: "blue" },
  submitted: { label: "Chờ duyệt", tone: "indigo" },
  completed: { label: "Hoàn thành", tone: "green" },
  rejected: { label: "Bị từ chối", tone: "red" },
  refunded: { label: "Đã hoàn tiền", tone: "gray" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Badge tone={meta.tone}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {meta.label}
    </Badge>
  );
}
