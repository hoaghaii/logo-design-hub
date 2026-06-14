"use server";

import { revalidatePath } from "next/cache";
import { ethers } from "ethers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getServerProvider, ESCROW_ADDRESS } from "@/lib/web3/contract";
import EscrowABI from "@/lib/web3/escrow-abi.json";

// ─── Legacy RPC actions (kept for backward-compat; no longer called by UI) ───

async function callRpc(
  fn: "escrow_lock" | "escrow_release" | "escrow_reject",
  orderId: string
) {
  const supabase = await createClient();
  const { error } = await supabase.rpc(fn, { p_order_id: orderId });
  if (error) throw new Error(error.message);
  revalidatePath(`/orders/${orderId}/escrow`);
  revalidatePath("/orders");
}

export async function lockEscrow(orderId: string) {
  await callRpc("escrow_lock", orderId);
}
export async function releaseEscrow(orderId: string) {
  await callRpc("escrow_release", orderId);
}
export async function rejectEscrow(orderId: string) {
  await callRpc("escrow_reject", orderId);
}

// ─── On-chain verify actions ──────────────────────────────────────────────────

function parseLog(receipt: ethers.TransactionReceipt, eventName: string) {
  const iface = new ethers.Interface(EscrowABI as ethers.InterfaceAbi);
  return receipt.logs
    .map((log) => {
      try {
        return iface.parseLog({ topics: [...log.topics], data: log.data });
      } catch {
        return null;
      }
    })
    .find((e) => e?.name === eventName) ?? null;
}

async function getVerifiedReceipt(txHash: string, expectedEvent: string) {
  const provider = getServerProvider();
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt || receipt.status !== 1)
    throw new Error("Giao dịch thất bại hoặc chưa được confirm");
  if (receipt.to?.toLowerCase() !== ESCROW_ADDRESS.toLowerCase())
    throw new Error("Giao dịch gửi đến sai contract");
  const log = parseLog(receipt, expectedEvent);
  if (!log) throw new Error(`Không tìm thấy event ${expectedEvent} trong tx này`);
  return { receipt, log };
}

async function checkDuplicate(txHash: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("transactions")
    .select("id")
    .eq("tx_hash", txHash)
    .maybeSingle();
  return !!data;
}

/**
 * Verifies a fund() tx on-chain then marks the order active.
 * Called by the client after MetaMask confirms.
 */
export async function confirmFunded(orderId: string, txHash: string) {
  const { log } = await getVerifiedReceipt(txHash, "Funded");

  const expectedDealId = ethers.keccak256(ethers.toUtf8Bytes(orderId));
  if (log.args[0].toLowerCase() !== expectedDealId.toLowerCase())
    throw new Error("dealId không khớp với orderId");

  if (await checkDuplicate(txHash)) return; // idempotent

  const amount = parseFloat(ethers.formatEther(log.args[3] as bigint));
  const supabase = createAdminClient();

  await Promise.all([
    supabase.from("orders").update({ status: "active" }).eq("id", orderId),
    supabase.from("transactions").insert({
      order_id: orderId,
      type: "escrow_lock",
      amount,
      tx_hash: txHash,
      from_address: log.args[1] as string,
      to_address: ESCROW_ADDRESS,
      status: "confirmed",
    }),
  ]);

  revalidatePath(`/orders/${orderId}/escrow`);
  revalidatePath("/orders");
}

/**
 * Verifies a release() tx on-chain then marks the order completed.
 */
export async function confirmReleased(orderId: string, txHash: string) {
  const { log } = await getVerifiedReceipt(txHash, "Released");

  const expectedDealId = ethers.keccak256(ethers.toUtf8Bytes(orderId));
  if (log.args[0].toLowerCase() !== expectedDealId.toLowerCase())
    throw new Error("dealId không khớp với orderId");

  if (await checkDuplicate(txHash)) return;

  const amount = parseFloat(ethers.formatEther(log.args[2] as bigint));
  const supabase = createAdminClient();

  await Promise.all([
    supabase.from("orders").update({ status: "completed" }).eq("id", orderId),
    supabase.from("transactions").insert({
      order_id: orderId,
      type: "escrow_release",
      amount,
      tx_hash: txHash,
      from_address: ESCROW_ADDRESS,
      to_address: log.args[1] as string,
      status: "confirmed",
    }),
  ]);

  revalidatePath(`/orders/${orderId}/escrow`);
  revalidatePath("/orders");
}

/**
 * Verifies a refund() tx on-chain then marks the order rejected and locks deliverable.
 */
export async function confirmRefunded(orderId: string, txHash: string) {
  const { log } = await getVerifiedReceipt(txHash, "Refunded");

  const expectedDealId = ethers.keccak256(ethers.toUtf8Bytes(orderId));
  if (log.args[0].toLowerCase() !== expectedDealId.toLowerCase())
    throw new Error("dealId không khớp với orderId");

  if (await checkDuplicate(txHash)) return;

  const amount = parseFloat(ethers.formatEther(log.args[2] as bigint));
  const supabase = createAdminClient();

  await Promise.all([
    supabase.from("orders").update({ status: "rejected" }).eq("id", orderId),
    supabase.from("transactions").insert({
      order_id: orderId,
      type: "escrow_refund",
      amount,
      tx_hash: txHash,
      from_address: ESCROW_ADDRESS,
      to_address: log.args[1] as string,
      status: "confirmed",
    }),
    supabase
      .from("deliverables")
      .update({ is_locked: true })
      .eq("order_id", orderId),
  ]);

  revalidatePath(`/orders/${orderId}/escrow`);
  revalidatePath("/orders");
}

// ─── Designer submits deliverable ─────────────────────────────────────────────

export async function submitDeliverable(orderId: string, fileUrl: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_deliverable", {
    p_order_id: orderId,
    p_file_url: fileUrl,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/orders/${orderId}/escrow`);
  revalidatePath("/orders");
}
