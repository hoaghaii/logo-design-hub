"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

type ApplicationParties = {
  application_id: string;
  designer_id: string;
  client_id: string;
  job_id: string;
  budget: number;
};

async function loadParties(
  applicationId: string
): Promise<ApplicationParties | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("applications")
    .select("id, designer_id, job:jobs(id, client_id, budget)")
    .eq("id", applicationId)
    .single();
  if (!data || !data.job) return null;
  return {
    application_id: data.id,
    designer_id: data.designer_id,
    client_id: data.job.client_id,
    job_id: data.job.id,
    budget: data.job.budget,
  };
}

/** Send a plain text message into the deal chat. */
export async function sendMessage(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const applicationId = String(formData.get("application_id") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  const parties = await loadParties(applicationId);
  if (!parties) throw new Error("Application not found");
  if (user.id !== parties.designer_id && user.id !== parties.client_id) {
    throw new Error("Not a party to this deal");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("deal_messages").insert({
    application_id: applicationId,
    sender_id: user.id,
    type: "text",
    content,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/deal/${applicationId}`);
}

/** Send a price proposal into the deal chat. Supersedes any pending proposal. */
export async function sendDealRequest(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const applicationId = String(formData.get("application_id") ?? "");
  const price = Number(formData.get("proposed_price") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  const deadlineRaw = String(formData.get("proposed_deadline") ?? "").trim();

  const parties = await loadParties(applicationId);
  if (!parties) throw new Error("Application not found");
  if (user.id !== parties.designer_id && user.id !== parties.client_id) {
    throw new Error("Not a party to this deal");
  }
  if (price <= 0) throw new Error("Giá đề xuất không hợp lệ");

  const supabase = await createClient();

  // Mark any pending proposals as countered.
  await supabase
    .from("deal_messages")
    .update({ proposal_status: "countered" })
    .eq("application_id", applicationId)
    .eq("type", "price_proposal")
    .eq("proposal_status", "pending");

  const { error } = await supabase.from("deal_messages").insert({
    application_id: applicationId,
    sender_id: user.id,
    type: "price_proposal",
    content: note || null,
    proposed_price: price,
    proposed_deadline: deadlineRaw ? new Date(deadlineRaw).toISOString() : null,
    proposal_status: "pending",
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/deal/${applicationId}`);
}

/** Accept or reject a pending price proposal. */
export async function respondDeal(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const messageId = String(formData.get("message_id") ?? "");
  const applicationId = String(formData.get("application_id") ?? "");
  const decision = String(formData.get("decision") ?? ""); // accept | reject

  const supabase = await createClient();
  const { data: msg } = await supabase
    .from("deal_messages")
    .select("id, sender_id, proposal_status")
    .eq("id", messageId)
    .single();

  if (!msg || msg.proposal_status !== "pending") {
    throw new Error("Đề xuất không khả dụng");
  }
  if (msg.sender_id === user.id) {
    throw new Error("Bạn không thể tự duyệt đề xuất của mình");
  }

  const { error } = await supabase
    .from("deal_messages")
    .update({ proposal_status: decision === "accept" ? "accepted" : "rejected" })
    .eq("id", messageId);
  if (error) throw new Error(error.message);

  revalidatePath(`/deal/${applicationId}`);
}

/**
 * Client proposes the contract. The order starts in `pending_acceptance` —
 * the designer must accept (→ pending_escrow) or decline (→ declined) before
 * any escrow happens. Handled by a SECURITY DEFINER RPC (also re-proposes a
 * previously declined contract).
 */
export async function createOrder(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const applicationId = String(formData.get("application_id") ?? "");
  const finalPrice = Number(formData.get("final_price") ?? 0);
  const deadline = String(formData.get("deadline") ?? "");
  if (finalPrice <= 0) throw new Error("Giá không hợp lệ");
  if (!deadline) throw new Error("Vui lòng chọn deadline");

  const supabase = await createClient();
  const { error } = await supabase.rpc("propose_contract", {
    p_application_id: applicationId,
    p_final_price: finalPrice,
    p_deadline: new Date(deadline).toISOString(),
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/deal/${applicationId}`);
}

/** Designer accepts or declines a contract the client proposed. */
export async function respondContract(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const applicationId = String(formData.get("application_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const accept = String(formData.get("decision") ?? "") === "accept";
  if (!orderId) throw new Error("Thiếu mã hợp đồng");

  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_contract", {
    p_order_id: orderId,
    p_accept: accept,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/deal/${applicationId}`);
}
