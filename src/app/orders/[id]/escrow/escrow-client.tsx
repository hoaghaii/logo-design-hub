"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Fuel,
  Loader2,
  Lock,
  ShieldCheck,
  Wallet,
  Download,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  formatETH,
  toEth,
  VND_PER_ETH,
  formatDateTime,
  shortHex,
} from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/ui/badge";
import {
  lockEscrow,
  releaseEscrow,
  rejectEscrow,
  submitDeliverable,
} from "@/app/orders/actions";
import type { OrderStatus, TransactionRow, DeliverableRow } from "@/lib/types";

type OrderLite = {
  id: string;
  status: OrderStatus;
  final_price: number;
  contract_address: string | null;
  deadline: string;
};

type GasDetails = {
  gasLimit: number;
  baseFeeGwei: number;
  priorityFeeGwei: number;
  gasCostEth: number;
};

function generateGas(): GasDetails {
  const gasLimit = 65_000;
  // Randomise each time so it feels live.
  const baseFeeGwei = parseFloat((Math.random() * 15 + 10).toFixed(2));
  const priorityFeeGwei = parseFloat((Math.random() * 2 + 0.5).toFixed(2));
  const gasCostEth = (gasLimit * (baseFeeGwei + priorityFeeGwei)) / 1e9;
  return { gasLimit, baseFeeGwei, priorityFeeGwei, gasCostEth };
}

const TX_LABEL: Record<string, string> = {
  escrow_lock: "Nạp vào Escrow",
  escrow_release: "Giải ngân",
  escrow_refund: "Hoàn tiền",
};

export function EscrowClient({
  order,
  role,
  walletBalance,
  counterpartyName,
  transactions,
  deliverable,
  downloadUrl,
}: {
  order: OrderLite;
  role: "client" | "designer";
  walletBalance: number;
  counterpartyName: string;
  transactions: TransactionRow[];
  deliverable: DeliverableRow | null;
  downloadUrl: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`escrow:${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        () => router.refresh()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliverables", filter: `order_id=eq.${order.id}` },
        () => router.refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order.id, router]);

  // Pre-escrow handshake states: contract isn't funded-ready yet.
  if (order.status === "pending_acceptance" || order.status === "declined") {
    const awaiting = order.status === "pending_acceptance";
    return (
      <div className="mt-6 space-y-6">
        <ContractCard order={order} />
        <Card>
          <CardContent className={`border-l-4 ${awaiting ? "border-amber-400" : "border-rose-500"}`}>
            <h2 className="font-semibold text-slate-900">
              {awaiting ? "Chờ designer chấp nhận hợp đồng" : "Hợp đồng đã bị từ chối"}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {awaiting
                ? `Hợp đồng đã được gửi tới ${counterpartyName}. Khi được chấp nhận, bạn có thể ký quỹ vào escrow.`
                : `${counterpartyName} đã từ chối hợp đồng này. Vào phòng deal để điều chỉnh và gửi lại.`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ContractCard order={order} />
        <WalletCard balance={walletBalance} price={order.final_price} />
      </div>

      <StepTracker status={order.status} />

      <ActionPanel
        order={order}
        role={role}
        walletBalance={walletBalance}
        counterpartyName={counterpartyName}
        deliverable={deliverable}
        downloadUrl={downloadUrl}
      />

      {transactions.length > 0 && (
        <Card>
          <CardContent>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              Lịch sử giao dịch
            </h2>
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">
                      {TX_LABEL[tx.type] ?? tx.type}
                    </span>
                    {tx.tx_hash && (
                      <span className="font-mono text-xs text-slate-400">
                        {shortHex(tx.tx_hash)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatETH(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      ≈ {(toEth(tx.amount) * 3500).toLocaleString("en-US", { style: "currency", currency: "USD" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------- Contract header card ----------

function ContractCard({ order }: { order: OrderLite }) {
  const [copied, setCopied] = useState(false);
  const addr = order.contract_address ?? "0x000000000000";

  function copy() {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 bg-slate-900 px-5 py-3 text-slate-300">
        <ShieldCheck size={15} className="text-emerald-400" />
        <span className="text-xs font-medium uppercase tracking-wide">
          Smart Contract · Mock Chain
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          live
        </span>
      </div>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <code className="font-mono text-sm text-slate-800">
            {shortHex(addr, 8, 6)}
          </code>
          <button
            onClick={copy}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-slate-400">
            Hạn: {formatDateTime(order.deadline)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Wallet card ----------

function WalletCard({ balance, price }: { balance: number; price: number }) {
  const ethBalance = toEth(balance);
  const ethPrice = toEth(price);
  const usdBalance = (ethBalance * 3500).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <Wallet size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">
              Ví của bạn
            </span>
          </div>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
            MockNet
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {ethBalance.toFixed(4)}{" "}
          <span className="text-lg font-semibold text-slate-400">ETH</span>
        </p>
        <p className="text-xs text-slate-400">{usdBalance}</p>
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-xs text-slate-500">
            Giá trị hợp đồng:{" "}
            <span className="font-semibold text-slate-700">
              {ethPrice.toFixed(4)} ETH
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- 6-step tracker ----------

type StepState = "done" | "active" | "pending" | "failed";

function computeSteps(status: OrderStatus): { label: string; state: StepState }[] {
  const order: OrderStatus[] = ["pending_escrow", "active", "submitted", "completed"];
  const idx = order.indexOf(status);
  const funded = status !== "pending_escrow";
  const submitted = ["submitted", "completed", "rejected"].includes(status);
  const finished = ["completed", "rejected", "refunded"].includes(status);

  return [
    { label: "Hợp đồng khởi tạo", state: "done" },
    { label: "Tiền đã vào Escrow", state: funded ? "done" : "active" },
    {
      label: "Đang thực hiện",
      state: status === "active" ? "active" : funded && idx >= 1 ? "done" : "pending",
    },
    {
      label: "Sản phẩm đã nộp",
      state: submitted ? "done" : status === "active" ? "pending" : "pending",
    },
    {
      label: "Chờ duyệt",
      state: status === "submitted" ? "active" : finished && submitted ? "done" : "pending",
    },
    {
      label:
        status === "completed"
          ? "Đã giải ngân"
          : status === "rejected" || status === "refunded"
          ? "Đã hoàn tiền"
          : "Giải ngân / Hoàn tiền",
      state:
        status === "completed"
          ? "done"
          : status === "rejected" || status === "refunded"
          ? "failed"
          : "pending",
    },
  ];
}

function StepTracker({ status }: { status: OrderStatus }) {
  const steps = computeSteps(status);
  return (
    <Card>
      <CardContent>
        <h2 className="mb-5 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Tiến trình Escrow
        </h2>
        <ol className="relative">
          {steps.map((step, i) => {
            const last = i === steps.length - 1;
            return (
              <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {!last && (
                  <span
                    className={`absolute left-3 top-7 h-[calc(100%-1.25rem)] w-px ${
                      step.state === "done" ? "bg-emerald-200" : "bg-slate-200"
                    }`}
                  />
                )}
                <StepIcon state={step.state} />
                <span
                  className={
                    "pt-0.5 text-sm " +
                    (step.state === "pending"
                      ? "text-slate-400"
                      : step.state === "failed"
                      ? "font-medium text-rose-600"
                      : step.state === "active"
                      ? "font-semibold text-blue-700"
                      : "font-medium text-slate-800")
                  }
                >
                  {step.label}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done")
    return (
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white ring-4 ring-emerald-50">
        <Check size={13} />
      </span>
    );
  if (state === "active")
    return (
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white ring-4 ring-blue-50">
        <Loader2 size={13} className="animate-spin" />
      </span>
    );
  if (state === "failed")
    return (
      <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white ring-4 ring-rose-50">
        <X size={13} />
      </span>
    );
  return (
    <span className="relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-200 bg-white text-slate-300">
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

// ---------- Action panel ----------

function ActionPanel({
  order,
  role,
  walletBalance,
  counterpartyName,
  deliverable,
  downloadUrl,
}: {
  order: OrderLite;
  role: "client" | "designer";
  walletBalance: number;
  counterpartyName: string;
  deliverable: DeliverableRow | null;
  downloadUrl: string | null;
}) {
  const { status } = order;

  if (status === "pending_escrow") {
    return role === "client" ? (
      <FundEscrowButton
        orderId={order.id}
        finalPrice={order.final_price}
        walletBalance={walletBalance}
        contractAddress={order.contract_address}
      />
    ) : (
      <InfoCard text={`Chờ ${counterpartyName} ký quỹ vào escrow.`} />
    );
  }

  if (status === "active") {
    return role === "designer" ? (
      <SubmitDeliverable orderId={order.id} />
    ) : (
      <InfoCard text={`${counterpartyName} đang thực hiện. Chờ nộp sản phẩm.`} />
    );
  }

  if (status === "submitted") {
    return (
      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold text-slate-700">Sản phẩm đã nộp</h2>
          {downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download size={16} /> Tải file thiết kế
            </a>
          )}
          {role === "client" ? (
            <ReviewButtons orderId={order.id} />
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Chờ {counterpartyName} duyệt sản phẩm.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (status === "completed")
    return (
      <ResultCard tone="success" title="Hoàn thành 🎉" text="Escrow đã giải ngân cho designer." />
    );
  if (status === "rejected")
    return (
      <ResultCard
        tone="danger"
        title="Đã từ chối"
        text="Escrow đã hoàn tiền về client. File thiết kế bị khóa."
        locked={deliverable?.is_locked}
      />
    );
  if (status === "refunded")
    return (
      <ResultCard
        tone="danger"
        title="Đã hoàn tiền"
        text="Quá hạn deadline — escrow tự động hoàn tiền về client."
        locked={deliverable?.is_locked}
      />
    );
  return null;
}

// ---------- Fund escrow button + confirmation modal ----------

function FundEscrowButton({
  orderId,
  finalPrice,
  walletBalance,
  contractAddress,
}: {
  orderId: string;
  finalPrice: number;
  walletBalance: number;
  contractAddress: string | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const [gas, setGas] = useState<GasDetails | null>(null);
  const [loading, setLoading] = useState(false);

  function openModal() {
    setGas(generateGas());
    setShowModal(true);
  }

  async function confirm() {
    setLoading(true);
    // Mimic on-chain confirmation delay.
    await new Promise((r) => setTimeout(r, 2200));
    try {
      await lockEscrow(orderId);
      toast.success("Giao dịch đã được xác nhận — tiền vào Escrow!");
      setShowModal(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ký quỹ thất bại");
      setLoading(false);
    }
  }

  const ethAmount = toEth(finalPrice);
  const gasCostEth = gas?.gasCostEth ?? 0;
  const totalEth = ethAmount + gasCostEth;
  const balanceAfterEth = toEth(walletBalance) - totalEth;
  const addr = contractAddress ?? "0x0000000000000000000000000000000000000000";

  return (
    <>
      <Card>
        <CardContent>
          <h2 className="text-sm font-semibold text-slate-700">Ký quỹ vào Escrow</h2>
          <p className="mt-1 text-sm text-slate-500">
            Số tiền sẽ bị khóa trong hợp đồng cho đến khi bạn duyệt sản phẩm.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-400">Số tiền cần ký quỹ</p>
              <p className="mt-0.5 text-xl font-bold text-slate-900">
                {ethAmount.toFixed(4)}{" "}
                <span className="text-base font-semibold text-slate-400">ETH</span>
              </p>
              <p className="text-xs text-slate-400">
                ≈ {(ethAmount * 3500).toLocaleString("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                })}
              </p>
            </div>
          </div>
          <Button onClick={openModal} className="mt-4" size="lg">
            <Lock size={18} /> Ký quỹ vào Escrow
          </Button>
        </CardContent>
      </Card>

      {showModal && gas && (
        <EscrowConfirmModal
          contractAddress={addr}
          ethAmount={ethAmount}
          gas={gas}
          totalEth={totalEth}
          balanceAfterEth={balanceAfterEth}
          loading={loading}
          onConfirm={confirm}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function EscrowConfirmModal({
  contractAddress,
  ethAmount,
  gas,
  totalEth,
  balanceAfterEth,
  loading,
  onConfirm,
  onCancel,
}: {
  contractAddress: string;
  ethAmount: number;
  gas: GasDetails;
  totalEth: number;
  balanceAfterEth: number;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const insufficient = balanceAfterEth < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !loading && onCancel()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10">
        {/* Header */}
        <div className="bg-slate-900 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/40">
                <ShieldCheck size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Xác nhận giao dịch</p>
                <p className="text-[11px] text-slate-400">MockNet · EscrowProtocol v2</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400 ring-1 ring-emerald-500/20">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Kết nối
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* To */}
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                Gửi đến hợp đồng
              </p>
              <code className="mt-0.5 block font-mono text-xs font-medium text-slate-700">
                {shortHex(contractAddress, 10, 8)}
              </code>
            </div>
            <ExternalLink size={13} className="text-slate-300" />
          </div>

          {/* Amount */}
          <div className="mt-4 text-center">
            <p className="text-3xl font-bold tracking-tight text-slate-900">
              {ethAmount.toFixed(4)}{" "}
              <span className="text-xl font-semibold text-slate-400">ETH</span>
            </p>
            <p className="mt-0.5 text-sm text-slate-400">
              ≈ {(ethAmount * 3500).toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </p>
          </div>

          {/* Gas breakdown */}
          <div className="mt-4 rounded-xl border border-slate-200 divide-y divide-slate-100">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Fuel size={12} className="text-slate-400" /> Gas limit
              </span>
              <span className="font-mono text-xs font-medium text-slate-700">
                {gas.gasLimit.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Zap size={12} className="text-orange-400" /> Base fee
              </span>
              <span className="font-mono text-xs font-medium text-slate-700">
                {gas.baseFeeGwei.toFixed(2)} Gwei
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Zap size={12} className="text-emerald-400" /> Priority fee
              </span>
              <span className="font-mono text-xs font-medium text-slate-700">
                {gas.priorityFeeGwei.toFixed(2)} Gwei
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
              <span className="text-xs font-medium text-slate-600">
                Phí gas ước tính
              </span>
              <div className="text-right">
                <p className="font-mono text-xs font-semibold text-slate-800">
                  {gas.gasCostEth.toFixed(6)} ETH
                </p>
                <p className="text-[10px] text-slate-400">
                  ≈ ${(gas.gasCostEth * 3500).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3">
            <span className="text-sm font-medium text-slate-300">Tổng thanh toán</span>
            <div className="text-right">
              <p className="font-mono text-base font-bold text-white">
                {totalEth.toFixed(4)} ETH
              </p>
              <p className="text-[11px] text-slate-400">
                ≈ ${(totalEth * 3500).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Balance after */}
          <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 ${
            insufficient ? "bg-rose-50" : "bg-emerald-50"
          }`}>
            <span className="text-xs text-slate-500">Số dư sau giao dịch</span>
            <span className={`font-mono text-xs font-semibold ${
              insufficient ? "text-rose-600" : "text-emerald-700"
            }`}>
              {balanceAfterEth < 0 ? "-" : ""}{Math.abs(balanceAfterEth).toFixed(4)} ETH
            </span>
          </div>

          {insufficient && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertTriangle size={13} />
              Số dư không đủ để thực hiện giao dịch này.
            </div>
          )}

          {/* Warning */}
          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Tiền sẽ bị khóa trong hợp đồng cho đến khi bạn duyệt hoặc từ chối sản phẩm. Giao dịch không thể hoàn tác.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || insufficient}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Đang xác nhận...
              </>
            ) : (
              <>
                <Lock size={15} />
                Xác nhận & Ký quỹ
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Submit deliverable ----------

function SubmitDeliverable({ orderId }: { orderId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle() {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Chọn file thiết kế trước.");

    setBusy(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("deliverables")
        .upload(path, file);
      if (upErr) throw upErr;

      await submitDeliverable(orderId, path);
      toast.success("Đã nộp sản phẩm!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Nộp thất bại");
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-sm font-semibold text-slate-700">Nộp sản phẩm</h2>
        <input
          ref={fileRef}
          type="file"
          className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
        />
        <Button onClick={handle} disabled={busy} className="mt-3">
          {busy ? (
            <><Loader2 size={16} className="animate-spin" /> Đang nộp...</>
          ) : (
            <><UploadCloud size={16} /> Nộp file thiết kế</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------- Review buttons ----------

function ReviewButtons({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);

  async function decide(kind: "release" | "reject") {
    setBusy(true);
    try {
      if (kind === "release") {
        await releaseEscrow(orderId);
        toast.success("Đã giải ngân cho designer!");
      } else {
        await rejectEscrow(orderId);
        toast.success("Đã từ chối & hoàn tiền.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Thao tác thất bại");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 flex gap-2">
      <Button variant="success" disabled={busy} onClick={() => decide("release")}>
        <Check size={16} /> Duyệt & Giải ngân
      </Button>
      <Button variant="danger" disabled={busy} onClick={() => decide("reject")}>
        <X size={16} /> Từ chối & Hoàn tiền
      </Button>
    </div>
  );
}

// ---------- Utility cards ----------

function InfoCard({ text }: { text: string }) {
  return (
    <Card>
      <CardContent>
        <p className="py-2 text-center text-sm text-slate-500">{text}</p>
      </CardContent>
    </Card>
  );
}

function ResultCard({
  tone,
  title,
  text,
  locked,
}: {
  tone: "success" | "danger";
  title: string;
  text: string;
  locked?: boolean;
}) {
  return (
    <Card>
      <CardContent
        className={
          tone === "success"
            ? "border-l-4 border-emerald-500"
            : "border-l-4 border-rose-500"
        }
      >
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
        {locked && (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            <Lock size={13} /> File đã bị khóa
          </p>
        )}
      </CardContent>
    </Card>
  );
}
