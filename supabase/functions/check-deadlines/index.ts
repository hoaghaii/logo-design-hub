// Supabase Edge Function — refunds escrow for orders past their deadline.
// Invokes the SECURITY DEFINER RPC `auto_refund_expired_orders` with the
// service-role key. Schedulable via cron or callable over HTTP for testing.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase.rpc("auto_refund_expired_orders");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ refunded: data }), {
    headers: { "Content-Type": "application/json" },
  });
});
