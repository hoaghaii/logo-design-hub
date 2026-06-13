"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useNotifications } from "@/hooks/use-notifications";

export function NotificationBell({ userId }: { userId: string }) {
  const { items, unread, markAllRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next && unread > 0) markAllRead();
      return next;
    });
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100"
        aria-label="Thông báo"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <span className="font-semibold text-slate-900">Thông báo</span>
              <Link
                href="/notifications"
                className="text-xs font-medium text-emerald-600 hover:underline"
                onClick={() => setOpen(false)}
              >
                Xem tất cả
              </Link>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  Chưa có thông báo nào
                </p>
              ) : (
                items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? "/notifications"}
                    onClick={() => setOpen(false)}
                    className="block border-b border-slate-50 px-4 py-3 hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDistanceToNow(new Date(n.created_at), {
                        addSuffix: true,
                        locale: vi,
                      })}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
