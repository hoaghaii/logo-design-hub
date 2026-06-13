"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { NotificationRow } from "@/lib/types";

/**
 * Subscribes to the current user's notifications via Supabase Realtime.
 * Returns the recent list, unread count, and a markAllRead helper.
 * New inserts pop a sonner toast.
 */
export function useNotifications(userId: string) {
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const supabaseRef = useRef(createClient());

  const refresh = useCallback(async () => {
    const supabase = supabaseRef.current;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setItems(data);
      setUnread(data.filter((n) => !n.is_read).length);
    }
  }, [userId]);

  useEffect(() => {
    refresh();

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as NotificationRow;
          setItems((prev) => [n, ...prev].slice(0, 20));
          setUnread((c) => c + 1);
          toast(n.title, { description: n.body ?? undefined });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  const markAllRead = useCallback(async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabaseRef.current
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }, [userId]);

  return { items, unread, markAllRead, refresh };
}
