import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a number as Vietnamese Dong. */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Legacy VND→ETH conversion (still used for jobs.budget display only).
 * All new money values (final_price, proposed_price, tx.amount) are stored as ETH.
 */
export const VND_PER_ETH = 1_000_000;

export function toEth(vnd: number): number {
  return vnd / VND_PER_ETH;
}

/** Format an ETH amount for display. Value must already be in ETH (e.g. 0.5). */
export function formatETH(eth: number, decimals = 4): string {
  return eth.toFixed(decimals) + " ETH";
}

/** Build a deterministic mock contract address from an order id. */
export function mockContractAddress(orderId: string): string {
  return "0x" + orderId.replace(/-/g, "").slice(0, 40);
}

/** Generate a random mock transaction hash for display, explorer-style. */
export function mockTxHash(): string {
  const hex = Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
  return "0x" + hex;
}

/** Shorten a hex address/hash for display: 0xABCD...1234 */
export function shortHex(value: string, lead = 6, tail = 4): string {
  if (value.length <= lead + tail) return value;
  return `${value.slice(0, lead)}...${value.slice(-tail)}`;
}

/** Format an ISO timestamp as a Vietnamese date-time, or a dash when null. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
