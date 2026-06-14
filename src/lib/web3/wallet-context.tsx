"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ethers } from "ethers";
import { CHAIN_ID } from "./contract";

export type WalletState = {
  account: string | null;
  balance: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  connect: () => Promise<void>;
  switchChain: () => Promise<void>;
  refreshBalance: () => Promise<void>;
};

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const fetchBalance = useCallback(async (addr: string) => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const provider = new ethers.BrowserProvider(window.ethereum as ethers.Eip1193Provider);
    try {
      const network = await provider.getNetwork();
      const id = Number(network.chainId);
      setChainId(id);
      if (id === CHAIN_ID) {
        const bal = await provider.getBalance(addr);
        setBalance(ethers.formatEther(bal));
      } else {
        setBalance(null);
      }
    } catch {
      // MetaMask unavailable or wrong network
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum as {
      request: (a: { method: string }) => Promise<string[]>;
      on: (e: string, h: (v: unknown) => void) => void;
    };

    eth.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts[0]) { setAccount(accounts[0]); fetchBalance(accounts[0]); }
    });

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      setAccount(list[0] ?? null);
      if (list[0]) fetchBalance(list[0]);
    };

    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", () => window.location.reload());
  }, [fetchBalance]);

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Vui lòng cài MetaMask: https://metamask.io");
      return;
    }
    const eth = window.ethereum as { request: (a: { method: string }) => Promise<string[]> };
    const accounts = await eth.request({ method: "eth_requestAccounts" });
    setAccount(accounts[0]);
    await fetchBalance(accounts[0]);
  }, [fetchBalance]);

  const switchChain = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const eth = window.ethereum as {
      request: (a: { method: string; params: unknown[] }) => Promise<void>;
    };
    const hexChainId = `0x${CHAIN_ID.toString(16)}`;
    try {
      await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChainId }] });
    } catch {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: hexChainId,
          chainName: "Ganache Local",
          rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545"],
          nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        }],
      });
    }
  }, []);

  const refreshBalance = useCallback(async () => {
    if (account) await fetchBalance(account);
  }, [account, fetchBalance]);

  return (
    <WalletContext.Provider
      value={{ account, balance, chainId, isCorrectChain: chainId === CHAIN_ID, connect, switchChain, refreshBalance }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
