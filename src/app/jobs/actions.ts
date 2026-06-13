"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type FormResult = { error: string } | null;

/** Client creates a new job. */
export async function createJob(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn cần đăng nhập." };
  if (user.role !== "client") return { error: "Chỉ Client mới đăng được job." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const budget = Number(formData.get("budget") ?? 0);
  const deadline = String(formData.get("deadline") ?? "");

  if (!title || budget <= 0) {
    return { error: "Tiêu đề và ngân sách hợp lệ là bắt buộc." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert({
    client_id: user.id,
    title,
    description: description || null,
    budget,
    deadline: deadline ? new Date(deadline).toISOString() : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/jobs");
  revalidatePath("/jobs/manage");
  redirect("/jobs/manage");
}

/** Designer applies to a job. Portfolio files are uploaded client-side first; this action creates the portfolio records then the application. */
export async function applyToJob(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn cần đăng nhập." };
  if (user.role !== "designer") {
    return { error: "Chỉ Designer mới apply được." };
  }

  const jobId = String(formData.get("job_id") ?? "");
  const coverNote = String(formData.get("cover_note") ?? "").trim();
  const portfolioUrls = formData.getAll("portfolio_url").map(String).filter(Boolean);
  const portfolioTitles = formData.getAll("portfolio_title").map(String);

  const supabase = await createClient();

  // Create portfolio records for uploaded files
  let portfolioIds: string[] = [];
  if (portfolioUrls.length > 0) {
    const records = portfolioUrls.map((image_url, i) => ({
      designer_id: user.id,
      title: portfolioTitles[i] || "Portfolio",
      image_url,
    }));
    const { data: created, error: portErr } = await supabase
      .from("portfolios")
      .insert(records)
      .select("id");
    if (portErr) return { error: portErr.message };
    portfolioIds = (created ?? []).map((p) => p.id);
  }

  const { error } = await supabase.from("applications").insert({
    job_id: jobId,
    designer_id: user.id,
    cover_note: coverNote || null,
    portfolio_ids: portfolioIds,
  });

  if (error) {
    if (error.code === "23505") return { error: "Bạn đã apply job này rồi." };
    return { error: error.message };
  }

  revalidatePath(`/jobs/${jobId}`);
  redirect("/applications/my");
}
