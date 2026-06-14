"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Wallet } from "lucide-react";
import { useWallet } from "@/lib/web3/use-wallet";
import { linkWallet } from "@/app/profile/actions";
import { Button } from "@/components/ui/button";
import { shortHex } from "@/lib/utils";

export function LinkWallet({ currentAddress }: { currentAddress: string | null }) {
  const { account, isCorrectChain, connect, switchChain } = useWallet();
  const [pending, startTransition] = useTransition();

  const alreadyLinked =
    !!currentAddress &&
    !!account &&
    currentAddress.toLowerCase() === account.toLowerCase();

  function handleLink() {
    if (!account) { connect(); return; }
    if (!isCorrectChain) { switchChain(); return; }
    startTransition(async () => {
      const result = await linkWallet(account);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Đã liên kết ví!");
    });
  }

  return (
    <div className="space-y-3">
      {currentAddress && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <Check size={14} className="shrink-0 text-emerald-500" />
          <span className="text-slate-500">Đang liên kết:</span>
          <code className="font-mono text-slate-800">{shortHex(currentAddress, 8, 6)}</code>
        </div>
      )}

      {!account ? (
        <Button variant="outline" onClick={connect}>
          <Wallet size={16} /> Connect MetaMask
        </Button>
      ) : !isCorrectChain ? (
        <Button variant="outline" onClick={switchChain}>
          <AlertTriangle size={16} /> Switch sang Ganache Local
        </Button>
      ) : alreadyLinked ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <Check size={14} /> Ví kết nối khớp với ví đã liên kết
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-500">
            MetaMask hiện tại:{" "}
            <code className="font-mono text-slate-700">{shortHex(account, 8, 6)}</code>
          </p>
          <Button onClick={handleLink} disabled={pending}>
            <Wallet size={16} />
            {pending ? "Đang lưu..." : currentAddress ? "Cập nhật địa chỉ ví" : "Liên kết ví này"}
          </Button>
        </div>
      )}
    </div>
  );
}
