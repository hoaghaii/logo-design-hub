"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * Client picks a designer: accepts the application (rejecting the rest via the
 * accept_application RPC), then moves to the deal/order screen.
 */
export async function chooseDesigner(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const applicationId = String(formData.get("application_id") ?? "");
  const supabase = await createClient();

  const { error } = await supabase.rpc("accept_application", {
    p_application_id: applicationId,
  });
  if (error) throw new Error(error.message);

  redirect(`/deal/${applicationId}`);
}
