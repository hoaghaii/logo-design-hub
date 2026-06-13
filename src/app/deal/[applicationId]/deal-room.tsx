"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { DollarSign, Send, Clock, ShieldCheck, Copy, Check, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatVND, formatDateTime, shortHex } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge, OrderStatusBadge } from "@/components/ui/badge";
import { sendMessage, sendDealRequest, respondDeal, createOrder, respondContract } from "@/app/deal/actions";
import type { DealMessageRow, OrderStatus } from "@/lib/types";

type MsgWithSender = DealMessageRow & {
  sender: { full_name: string | null } | null;
};

type ProposalStatus = "pending" | "accepted" | "countered" | "rejected";

type OrderCard = {
  id: string;
  status: OrderStatus;
  final_price: number;
  contract_address: string | null;
  deadline: string;
};

export function DealRoom({
  applicationId,
  jobId,
  currentUserId,
  role,
  budget,
  defaultDeadline,
  initialMessages,
  initialOrder,
  partnerName,
}: {
  applicationId: string;
  jobId: string;
  currentUserId: string;
  role: "client" | "designer";
  budget: number;
  defaultDeadline: string | null;
  initialMessages: MsgWithSender[];
  initialOrder: OrderCard | null;
  partnerName: string;
}) {
  const [messages, setMessages] = useState<MsgWithSender[]>(initialMessages);
  const [order, setOrder] = useState<OrderCard | null>(initialOrder);
  const [inputMode, setInputMode] = useState<"text" | "price">("text");
  const [textInput, setTextInput] = useState("");
  const [priceInput, setPriceInput] = useState(String(budget));
  const [noteInput, setNoteInput] = useState("");
  const [deadlineInput, setDeadlineInput] = useState(
    defaultDeadline ? new Date(defaultDeadline).toISOString().slice(0, 16) : ""
  );
  const [isPending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, order]);

  // Realtime: deal messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`deal_messages:${applicationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deal_messages", filter: `application_id=eq.${applicationId}` },
        async (payload) => {
          const { data } = await supabase
            .from("deal_messages")
            .select("*, sender:users(full_name)")
            .eq("id", payload.new.id)
            .single();
          if (data) {
            setMessages((prev) =>
              prev.some((m) => m.id === data.id) ? prev : [...prev, data as MsgWithSender]
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deal_messages", filter: `application_id=eq.${applicationId}` },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === payload.new.id ? { ...m, proposal_status: payload.new.proposal_status } : m
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [applicationId]);

  // Realtime: orders — fires for both parties when client creates or escrow status changes
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`orders:job:${jobId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders", filter: `job_id=eq.${jobId}` },
        (payload) => {
          setOrder(payload.new as OrderCard);
          toast.info(
            role === "designer" ? "Client gửi hợp đồng!" : "Đã gửi hợp đồng cho designer",
            {
              description:
                role === "designer"
                  ? "Vui lòng chấp nhận hoặc từ chối."
                  : "Chờ designer phản hồi.",
            }
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `job_id=eq.${jobId}` },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...(payload.new as Partial<OrderCard>) } : (payload.new as OrderCard)));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [jobId, role]);

  const pendingProposal = messages.find(
    (m) => m.type === "price_proposal" && m.proposal_status === "pending"
  );
  const acceptedProposal = messages.find(
    (m) => m.type === "price_proposal" && m.proposal_status === "accepted"
  );

  const deadlineLocal = defaultDeadline
    ? new Date(defaultDeadline).toISOString().slice(0, 16)
    : "";

  function handleSendText() {
    const content = textInput.trim();
    if (!content) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("application_id", applicationId);
      fd.set("content", content);
      try {
        await sendMessage(fd);
        setTextInput("");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Lỗi gửi tin nhắn");
      }
    });
  }

  function handleSendProposal() {
    const price = Number(priceInput);
    if (price <= 0) { toast.error("Giá phải lớn hơn 0"); return; }
    startTransition(async () => {
      const fd = new FormData();
      fd.set("application_id", applicationId);
      fd.set("proposed_price", String(price));
      fd.set("note", noteInput);
      fd.set("proposed_deadline", deadlineInput);
      try {
        await sendDealRequest(fd);
        setInputMode("text");
        setNoteInput("");
        toast.success("Đã gửi đề xuất");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Lỗi gửi đề xuất");
      }
    });
  }

  function handleRespond(messageId: string, decision: "accept" | "reject") {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("message_id", messageId);
      fd.set("application_id", applicationId);
      fd.set("decision", decision);
      try {
        await respondDeal(fd);
        if (decision === "accept") toast.success("Đã chốt giá!");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  }

  function handleRespondContract(decision: "accept" | "decline") {
    if (!order) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("order_id", order.id);
      fd.set("application_id", applicationId);
      fd.set("decision", decision);
      try {
        await respondContract(fd);
        toast.success(
          decision === "accept"
            ? "Đã chấp nhận hợp đồng! Chờ client ký quỹ."
            : "Đã từ chối hợp đồng."
        );
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Lỗi");
      }
    });
  }

  // A contract is "active" once it exists and hasn't been declined.
  const orderActive = !!order && order.status !== "declined";

  return (
    <div className="mt-6 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Budget bar */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <span className="text-xs text-slate-500">Ngân sách gốc</span>
        <span className="text-sm font-semibold text-slate-900">{formatVND(budget)}</span>
      </div>

      {/* Messages */}
      <div className="flex h-[400px] flex-col gap-3 overflow-y-auto p-4">
        {messages.length === 0 && !order && (
          <p className="m-auto text-sm text-slate-400">
            Bắt đầu trao đổi với {partnerName}…
          </p>
        )}

        {messages.map((msg) => {
          const mine = msg.sender_id === currentUserId;
          const senderLabel = mine ? "Bạn" : (msg.sender?.full_name ?? partnerName);

          if (msg.type === "text") {
            return (
              <div key={msg.id} className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
                <span className="px-1 text-[11px] text-slate-400">{senderLabel}</span>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    mine
                      ? "rounded-tr-sm bg-emerald-600 text-white"
                      : "rounded-tl-sm bg-slate-100 text-slate-800"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          // price_proposal bubble
          const status = msg.proposal_status as ProposalStatus | null;
          const canAct = status === "pending" && !mine;

          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${mine ? "items-end" : "items-start"}`}>
              <span className="px-1 text-[11px] text-slate-400">
                {senderLabel} · đề xuất
              </span>
              <div
                className={`w-full max-w-[85%] rounded-xl border px-4 py-3 ${
                  status === "accepted"
                    ? "border-emerald-200 bg-emerald-50"
                    : status === "countered" || status === "rejected"
                    ? "border-slate-200 bg-slate-50 opacity-60"
                    : mine
                    ? "border-teal-200 bg-teal-50"
                    : "border-amber-200 bg-amber-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={15} className={status === "accepted" ? "text-emerald-600" : "text-slate-500"} />
                    <span className={`text-base font-bold ${status === "accepted" ? "text-emerald-700" : "text-slate-900"}`}>
                      {formatVND(msg.proposed_price ?? 0)}
                    </span>
                  </div>
                  {status === "accepted" && <Badge tone="green">✓ Đã chốt</Badge>}
                  {status === "countered" && <Badge tone="gray">Đã counter</Badge>}
                  {status === "rejected" && <Badge tone="red">Từ chối</Badge>}
                  {status === "pending" && mine && <Badge tone="amber">Chờ phản hồi</Badge>}
                </div>

                {msg.proposed_deadline && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-500">
                    <Clock size={11} />
                    Deadline: {new Date(msg.proposed_deadline).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}

                {msg.content && (
                  <p className="mt-1 text-sm text-slate-600">{msg.content}</p>
                )}

                {canAct && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="success" disabled={isPending} onClick={() => handleRespond(msg.id, "accept")}>
                      Chấp nhận ✓
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isPending}
                      onClick={() => {
                        setPriceInput(String(msg.proposed_price ?? budget));
                        if (msg.proposed_deadline) {
                          setDeadlineInput(new Date(msg.proposed_deadline).toISOString().slice(0, 16));
                        }
                        setInputMode("price");
                      }}
                    >
                      Deal lại ↺
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Contract card — appears in real-time when client proposes the contract */}
        {order && (
          <ContractChatCard
            order={order}
            role={role}
            isPending={isPending}
            onRespond={handleRespondContract}
          />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area — hidden once a contract is in flight */}
      {!orderActive && (
        <div className="border-t border-slate-100 bg-slate-50 p-3">
          {inputMode === "text" ? (
            <div className="flex items-end gap-2">
              <button
                type="button"
                disabled={!!acceptedProposal || !!pendingProposal || isPending}
                onClick={() => setInputMode("price")}
                title={
                  acceptedProposal ? "Giá đã chốt"
                  : pendingProposal ? "Đang có đề xuất chờ phản hồi"
                  : "Đề xuất giá"
                }
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <DollarSign size={13} />
                <span className="hidden sm:inline">Đề xuất giá</span>
              </button>

              <textarea
                rows={1}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendText(); }
                }}
                placeholder="Nhắn tin… (Enter để gửi)"
                className="flex-1 resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
              />

              <Button size="sm" disabled={isPending || !textInput.trim()} onClick={handleSendText}>
                <Send size={14} />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Giá (VND)</label>
                  <input
                    type="number" min={0} step="any"
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                    // eslint-disable-next-line jsx-a11y/no-autofocus
                    autoFocus
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-500">Deadline đề xuất (tùy chọn)</label>
                  <input
                    type="datetime-local"
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Ghi chú lý do (tùy chọn)…"
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-200"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setInputMode("text")}>Hủy</Button>
                <Button size="sm" disabled={isPending} onClick={handleSendProposal}>
                  <DollarSign size={13} className="mr-1" /> Gửi đề xuất
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Send Contract panel — client only, shown when no active contract */}
      {!orderActive && role === "client" && (
        <div className={`border-t p-4 ${acceptedProposal ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          {order?.status === "declined" && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              Designer đã từ chối hợp đồng trước. Điều chỉnh và gửi lại bên dưới.
            </p>
          )}
          {acceptedProposal ? (
            <p className="mb-3 text-sm font-medium text-emerald-800">
              Giá đã chốt: {formatVND(acceptedProposal.proposed_price ?? budget)} · Sẵn sàng gửi hợp đồng
            </p>
          ) : (
            <p className="mb-2 text-xs text-slate-500">
              Gửi hợp đồng theo ngân sách gốc ({formatVND(budget)}):
            </p>
          )}
          <form action={createOrder} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="application_id" value={applicationId} />
            <input type="hidden" name="final_price" value={acceptedProposal?.proposed_price ?? budget} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-500">Deadline</label>
              <input
                name="deadline"
                type="datetime-local"
                defaultValue={
                  acceptedProposal?.proposed_deadline
                    ? new Date(acceptedProposal.proposed_deadline).toISOString().slice(0, 16)
                    : deadlineLocal
                }
                required
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <Button type="submit" variant={acceptedProposal ? "primary" : "outline"} size="sm">
              <ShieldCheck size={14} />
              {acceptedProposal ? "Gửi hợp đồng cho designer" : "Gửi hợp đồng theo ngân sách"}
            </Button>
          </form>
        </div>
      )}

      {/* Designer waiting message — only when no active contract yet */}
      {!orderActive && role === "designer" && !acceptedProposal && (
        <div className="border-t border-slate-100 p-3">
          <p className="text-center text-xs text-slate-400">
            Chờ client gửi hợp đồng sau khi thương lượng xong.
          </p>
        </div>
      )}

      {!orderActive && role === "designer" && acceptedProposal && (
        <div className="border-t border-emerald-100 bg-emerald-50 p-3">
          <p className="text-center text-xs text-emerald-700">
            ✓ Giá đã chốt {formatVND(acceptedProposal.proposed_price ?? budget)}
            {acceptedProposal.proposed_deadline && (
              <> · Deadline: {new Date(acceptedProposal.proposed_deadline).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</>
            )}
            {" "}· Chờ client gửi hợp đồng.
          </p>
        </div>
      )}
    </div>
  );
}

// Contract card that appears inline in the chat thread
function ContractChatCard({
  order,
  role,
  isPending,
  onRespond,
}: {
  order: OrderCard;
  role: "client" | "designer";
  isPending: boolean;
  onRespond: (decision: "accept" | "decline") => void;
}) {
  const [copied, setCopied] = useState(false);
  const addr = order.contract_address ?? "0x" + order.id.replace(/-/g, "").slice(0, 40);

  function copy() {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const awaiting = order.status === "pending_acceptance";
  const declined = order.status === "declined";
  const headerLabel = awaiting
    ? "Hợp đồng chờ phản hồi"
    : declined
      ? "Hợp đồng bị từ chối"
      : "Hợp đồng đã khởi tạo";

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div
          className={`flex items-center gap-2 px-4 py-2.5 text-slate-300 ${
            declined ? "bg-rose-950" : "bg-slate-900"
          }`}
        >
          <ShieldCheck size={14} className={declined ? "text-rose-400" : "text-emerald-400"} />
          <span className="text-xs font-semibold uppercase tracking-wide">{headerLabel}</span>
          {!declined && (
            <span className="ml-auto h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          )}
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <code className="font-mono text-sm text-slate-800">{shortHex(addr, 8, 6)}</code>
            <button
              onClick={copy}
              className="rounded p-1 text-slate-400 transition-colors hover:text-emerald-600"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className="font-semibold text-emerald-700">{formatVND(order.final_price)}</span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> {formatDateTime(order.deadline)}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <OrderStatusBadge status={order.status} />
            {!awaiting && !declined && (
              <Link
                href={`/orders/${order.id}/escrow`}
                className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
              >
                Vào Escrow <ExternalLink size={11} />
              </Link>
            )}
          </div>

          {/* Designer must accept or decline a freshly proposed contract */}
          {awaiting && role === "designer" && (
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <Button
                size="sm"
                variant="success"
                disabled={isPending}
                onClick={() => onRespond("accept")}
              >
                <Check size={14} /> Chấp nhận
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onRespond("decline")}
              >
                Từ chối
              </Button>
            </div>
          )}

          {awaiting && role === "client" && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-center text-xs text-amber-600">
              Chờ designer chấp nhận hợp đồng…
            </p>
          )}

          {declined && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-center text-xs text-rose-600">
              {role === "client"
                ? "Designer đã từ chối. Bạn có thể gửi lại hợp đồng bên dưới."
                : "Bạn đã từ chối hợp đồng này."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
