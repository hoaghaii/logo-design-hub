import { createClient } from "@/lib/supabase/server";
import type { UserRow } from "@/lib/types";

/**
 * Returns the signed-in user's profile row, or null when logged out.
 * Use in Server Components / Server Actions.
 */
export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile ?? null;
}
