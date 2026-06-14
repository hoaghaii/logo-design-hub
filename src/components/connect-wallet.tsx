"use client";
import { useEffect, useTransition } from "react";
import { AlertTriangle, Wallet } from "lucide-react";
import { useWallet } from "@/lib/web3/use-wallet";
import { shortHex } from "@/lib/utils";
import { linkWallet } from "@/app/profile/actions";

export function ConnectWallet() {
  const { account, balance, isCorrectChain, connect, switchChain } = useWallet();
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (account) {
      startTransition(async () => { await linkWallet(account); });
    }
  }, [account]);

  if (!account) {
    return (
      <button
        onClick={connect}
        className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
      >
        <Wallet size={15} />
        Connect Wallet
      </button>
    );
  }

  if (!isCorrectChain) {
    return (
      <button
        onClick={switchChain}
        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition-colors hover:bg-amber-100"
        title="Sai mạng — click để switch sang Ganache Local"
      >
        <AlertTriangle size={15} />
        Sai mạng
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
      <Wallet size={15} />
      <span>{parseFloat(balance ?? "0").toFixed(3)} ETH</span>
      <span className="hidden text-[11px] font-normal text-emerald-500 sm:inline">
        · {shortHex(account)}
      </span>
    </span>
  );
}
