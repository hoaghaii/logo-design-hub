"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

export type FormResult = { error: string } | { ok: true } | null;

export async function updateProfile(
  _prev: FormResult,
  formData: FormData
): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn cần đăng nhập." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ full_name: fullName, bio: bio || null })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile/edit");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

/** Persist a portfolio row after the image has been uploaded to Storage. */
export async function addPortfolio(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "");
  if (!title || !imageUrl) throw new Error("Thiếu thông tin portfolio");

  const supabase = await createClient();
  const { error } = await supabase.from("portfolios").insert({
    designer_id: user.id,
    title,
    category: category || null,
    image_url: imageUrl,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/profile/edit");
  revalidatePath(`/profile/${user.id}`);
}

export async function linkWallet(address: string): Promise<FormResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bạn cần đăng nhập." };
  if (!/^0x[0-9a-fA-F]{40}$/.test(address))
    return { error: "Địa chỉ ví không hợp lệ." };

  const normalized = address.toLowerCase();
  const admin = createAdminClient();

  // Release this wallet from any other account that currently holds it
  await admin
    .from("users")
    .update({ wallet_address: null })
    .eq("wallet_address", normalized)
    .neq("id", user.id);

  const { error } = await admin
    .from("users")
    .update({ wallet_address: normalized })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/profile/edit");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

export async function deletePortfolio(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  await supabase.from("portfolios").delete().eq("id", id).eq("designer_id", user.id);

  revalidatePath("/profile/edit");
  revalidatePath(`/profile/${user.id}`);
}
