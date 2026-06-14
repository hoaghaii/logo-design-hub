"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  Loader2,
  Lock,
  ShieldCheck,
  UploadCloud,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ethers } from "ethers";
import { createClient } from "@/lib/supabase/client";
import { formatETH, formatDateTime, shortHex } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/ui/badge";
import { useWallet } from "@/lib/web3/use-wallet";
import { getEscrowContract } from "@/lib/web3/contract";
import {
  confirmFunded,
  confirmReleased,
  confirmRefunded,
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

const TX_LABEL: Record<string, string> = {
  escrow_lock: "Nạp vào Escrow",
  escrow_release: "Giải ngân",
  escrow_refund: "Hoàn tiền",
};

export function EscrowClient({
  order,
  role,
  counterpartyName,
  designerWalletAddress: initialDesignerWallet,
  designerId,
  transactions,
  deliverable,
  downloadUrl,
}: {
  order: OrderLite;
  role: "client" | "designer";
  counterpartyName: string;
  designerWalletAddress: string | null;
  designerId: string;
  transactions: TransactionRow[];
  deliverable: DeliverableRow | null;
  downloadUrl: string | null;
}) {
  const router = useRouter();
  const { refreshBalance } = useWallet();
  const [designerWalletAddress, setDesignerWalletAddress] = useState(initialDesignerWallet);

  // Keep state in sync if server re-renders with fresh prop (e.g. after router.refresh())
  useEffect(() => {
    setDesignerWalletAddress(initialDesignerWallet);
  }, [initialDesignerWallet]);

  // Realtime: watch for designer linking wallet after escrow is created
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`designer_wallet:${designerId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${designerId}` },
        (payload) => {
          const addr = (payload.new as { wallet_address?: string | null }).wallet_address ?? null;
          setDesignerWalletAddress(addr);
          if (addr) toast.success("Designer vừa liên kết ví — bạn có thể ký quỹ ngay!");
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [designerId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`escrow:${order.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` },
        (payload) => {
          router.refresh();
          const newStatus = (payload.new as { status?: string }).status;
          // Designer receives ETH on completed; client gets refund on rejected/refunded
          if (newStatus === "completed" || newStatus === "rejected" || newStatus === "refunded") {
            refreshBalance();
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deliverables", filter: `order_id=eq.${order.id}` },
        () => router.refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order.id, router]);

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
                ? `Hợp đồng đã gửi tới ${counterpartyName}. Khi được chấp nhận, bạn có thể ký quỹ.`
                : `${counterpartyName} đã từ chối hợp đồng. Vào phòng deal để điều chỉnh và gửi lại.`}
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
        <WalletCard price={order.final_price} />
      </div>

      <StepTracker status={order.status} />

      <ActionPanel
        order={order}
        role={role}
        counterpartyName={counterpartyName}
        designerWalletAddress={designerWalletAddress}
        deliverable={deliverable}
        downloadUrl={downloadUrl}
      />

      {transactions.length > 0 && (
        <Card>
          <CardContent>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">Lịch sử giao dịch</h2>
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
                    {tx.from_address && (
                      <span className="font-mono text-[11px] text-slate-300">
                        from {shortHex(tx.from_address)}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatETH(tx.amount)}
                    </p>
                    <p className="text-xs text-slate-400">
                      ≈ ${(tx.amount * 3500).toLocaleString("en-US", { maximumFractionDigits: 2 })}
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

// ─── Contract header card ─────────────────────────────────────────────────────

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
          Smart Contract · Ganache Local
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-emerald-400">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          live
        </span>
      </div>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <code className="font-mono text-sm text-slate-800">{shortHex(addr, 8, 6)}</code>
          <button
            onClick={copy}
            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600"
          >
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <OrderStatusBadge status={order.status} />
          <span className="text-xs text-slate-400">Hạn: {formatDateTime(order.deadline)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Wallet card (reads from MetaMask) ───────────────────────────────────────

function WalletCard({ price }: { price: number }) {
  const { account, balance, isCorrectChain, connect, switchChain } = useWallet();
  const ethBalance = parseFloat(balance ?? "0");

  return (
    <Card>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500">
            <Wallet size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Ví MetaMask</span>
          </div>
          {account && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              {shortHex(account)}
            </span>
          )}
        </div>

        {account ? (
          <>
            {!isCorrectChain ? (
              <button
                onClick={switchChain}
                className="mt-2 flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:underline"
              >
                <AlertTriangle size={13} /> Sai mạng — click để switch
              </button>
            ) : (
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {ethBalance.toFixed(4)}{" "}
                <span className="text-lg font-semibold text-slate-400">ETH</span>
              </p>
            )}
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                Giá trị hợp đồng:{" "}
                <span className="font-semibold text-slate-700">{formatETH(price)}</span>
              </p>
            </div>
          </>
        ) : (
          <button
            onClick={connect}
            className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"
          >
            <Wallet size={14} /> Connect MetaMask
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 6-step tracker ───────────────────────────────────────────────────────────

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

// ─── Action panel ─────────────────────────────────────────────────────────────

function ActionPanel({
  order,
  role,
  counterpartyName,
  designerWalletAddress,
  deliverable,
  downloadUrl,
}: {
  order: OrderLite;
  role: "client" | "designer";
  counterpartyName: string;
  designerWalletAddress: string | null;
  deliverable: DeliverableRow | null;
  downloadUrl: string | null;
}) {
  const { status } = order;

  if (status === "pending_escrow") {
    return role === "client" ? (
      <FundEscrowButton
        orderId={order.id}
        finalPrice={order.final_price}
        designerWalletAddress={designerWalletAddress}
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
            <p className="mt-3 text-sm text-slate-500">Chờ {counterpartyName} duyệt sản phẩm.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (status === "completed")
    return <ResultCard tone="success" title="Hoàn thành 🎉" text="Escrow đã giải ngân cho designer." />;
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
        text="Escrow hoàn tiền về client."
        locked={deliverable?.is_locked}
      />
    );
  return null;
}

// ─── Fund escrow button (MetaMask) ───────────────────────────────────────────

function FundEscrowButton({
  orderId,
  finalPrice,
  designerWalletAddress,
}: {
  orderId: string;
  finalPrice: number;
  designerWalletAddress: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const { account, balance, isCorrectChain, connect, switchChain, refreshBalance } = useWallet();
  const ethBalance = parseFloat(balance ?? "0");
  const insufficient = account !== null && balance !== null && ethBalance < finalPrice;

  async function handleFund() {
    if (!account) { await connect(); return; }
    if (!isCorrectChain) { await switchChain(); return; }
    if (!designerWalletAddress) {
      toast.error("Designer chưa liên kết ví MetaMask. Yêu cầu họ vào hồ sơ để link ví trước.");
      return;
    }

    setLoading(true);
    const tid = toast.loading("Chờ MetaMask xác nhận...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const contract = getEscrowContract(signer);

      const dealId = ethers.keccak256(ethers.toUtf8Bytes(orderId));
      const value  = ethers.parseEther(finalPrice.toString());

      const tx = await contract.fund(dealId, designerWalletAddress, { value });
      toast.loading("Chờ xác nhận trên chain...", { id: tid });

      const receipt = await tx.wait();
      await confirmFunded(orderId, receipt.hash);
      await refreshBalance();
      toast.success("Đã khoá tiền vào Escrow!", { id: tid });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Ký quỹ thất bại";
      toast.error(msg.includes("user rejected") ? "Đã hủy giao dịch" : msg, { id: tid });
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-sm font-semibold text-slate-700">Ký quỹ vào Escrow</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tiền sẽ bị khóa trong smart contract cho đến khi bạn duyệt sản phẩm.
        </p>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs text-slate-400">Số tiền ký quỹ</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900">
            {finalPrice.toFixed(4)}{" "}
            <span className="text-lg font-semibold text-slate-400">ETH</span>
          </p>
          <p className="text-xs text-slate-400">
            ≈ ${(finalPrice * 3500).toLocaleString("en-US", { maximumFractionDigits: 0 })} USD
          </p>
        </div>

        {account && balance !== null && (
          <div className={`mt-2 flex items-center justify-between rounded-lg px-3 py-2 text-xs ${insufficient ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
            <span>Số dư ví: {ethBalance.toFixed(4)} ETH</span>
            {insufficient && (
              <span className="flex items-center gap-1">
                <AlertTriangle size={12} /> Không đủ số dư
              </span>
            )}
          </div>
        )}

        {!designerWalletAddress && (
          <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <AlertTriangle size={12} />
            Designer chưa liên kết ví — chưa thể ký quỹ
          </div>
        )}

        {!account ? (
          <Button onClick={connect} className="mt-4" size="lg">
            <Wallet size={18} /> Connect MetaMask
          </Button>
        ) : !isCorrectChain ? (
          <Button onClick={switchChain} className="mt-4" size="lg" variant="outline">
            <AlertTriangle size={18} /> Switch sang Ganache Local
          </Button>
        ) : (
          <Button
            onClick={handleFund}
            disabled={loading || insufficient || !designerWalletAddress}
            className="mt-4"
            size="lg"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
            ) : (
              <><Lock size={18} /> Ký quỹ qua MetaMask</>
            )}
          </Button>
        )}

        <p className="mt-2 text-[11px] text-slate-400">
          MetaMask sẽ hiển thị popup xác nhận với phí gas thực tế.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Review buttons (MetaMask) ────────────────────────────────────────────────

function ReviewButtons({ orderId }: { orderId: string }) {
  const [busy, setBusy] = useState(false);
  const { account, isCorrectChain, connect, switchChain, refreshBalance } = useWallet();

  async function decide(kind: "release" | "refund") {
    if (!account) { await connect(); return; }
    if (!isCorrectChain) { await switchChain(); return; }

    setBusy(true);
    const tid = toast.loading("Chờ MetaMask xác nhận...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
      const signer   = await provider.getSigner();
      const contract = getEscrowContract(signer);
      const dealId   = ethers.keccak256(ethers.toUtf8Bytes(orderId));

      const tx = kind === "release"
        ? await contract.release(dealId)
        : await contract.refund(dealId);

      toast.loading("Chờ xác nhận trên chain...", { id: tid });
      const receipt = await tx.wait();

      if (kind === "release") {
        await confirmReleased(orderId, receipt.hash);
        await refreshBalance();
        toast.success("Đã giải ngân cho designer!", { id: tid });
      } else {
        await confirmRefunded(orderId, receipt.hash);
        await refreshBalance();
        toast.success("Đã từ chối & hoàn tiền.", { id: tid });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Thao tác thất bại";
      toast.error(msg.includes("user rejected") ? "Đã hủy giao dịch" : msg, { id: tid });
      setBusy(false);
    }
  }

  if (!account) {
    return (
      <div className="mt-4">
        <Button onClick={connect} variant="outline">
          <Wallet size={16} /> Connect MetaMask để thực hiện
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex gap-2">
      <Button variant="success" disabled={busy} onClick={() => decide("release")}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        Duyệt & Giải ngân
      </Button>
      <Button variant="danger" disabled={busy} onClick={() => decide("refund")}>
        {busy ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
        Từ chối & Hoàn tiền
      </Button>
    </div>
  );
}

// ─── Submit deliverable ───────────────────────────────────────────────────────

function SubmitDeliverable({ orderId }: { orderId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handle() {
    const file = fileRef.current?.files?.[0];
    if (!file) return toast.error("Chọn file thiết kế trước.");

    setBusy(true);
    try {
      const supabase = createClient();
      const ext  = file.name.split(".").pop();
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

// ─── Utility cards ────────────────────────────────────────────────────────────

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
        className={tone === "success" ? "border-l-4 border-emerald-500" : "border-l-4 border-rose-500"}
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

