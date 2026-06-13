-- LogoDesignHub — tighten function execution & storage exposure.

-- By default Postgres grants EXECUTE on functions to PUBLIC. Lock these down.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.auto_refund_expired_orders() from public, anon, authenticated;

revoke execute on function public.accept_application(uuid) from public, anon;
revoke execute on function public.escrow_lock(uuid) from public, anon;
revoke execute on function public.submit_deliverable(uuid, text) from public, anon;
revoke execute on function public.escrow_release(uuid) from public, anon;
revoke execute on function public.escrow_reject(uuid) from public, anon;

-- User-facing RPCs: only signed-in users (each function checks auth.uid()).
grant execute on function public.accept_application(uuid) to authenticated;
grant execute on function public.escrow_lock(uuid) to authenticated;
grant execute on function public.submit_deliverable(uuid, text) to authenticated;
grant execute on function public.escrow_release(uuid) to authenticated;
grant execute on function public.escrow_reject(uuid) to authenticated;

-- Cron-only: service_role bypasses these grants, so no role needs EXECUTE.

-- Public buckets serve objects by URL without a SELECT policy; dropping it
-- prevents clients from listing every file in the bucket.
drop policy if exists "portfolio images public read" on storage.objects;
