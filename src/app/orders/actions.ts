"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

/** Client funds the escrow (debits wallet, order -> active). */
export async function lockEscrow(orderId: string) {
  await callRpc("escrow_lock", orderId);
}

/** Client approves: escrow releases to the designer (order -> completed). */
export async function releaseEscrow(orderId: string) {
  await callRpc("escrow_release", orderId);
}

/** Client rejects: escrow refunds the client, deliverable locked (order -> rejected). */
export async function rejectEscrow(orderId: string) {
  await callRpc("escrow_reject", orderId);
}

/** Designer submits the deliverable file URL (order -> submitted). */
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
