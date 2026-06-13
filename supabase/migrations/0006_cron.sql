-- LogoDesignHub — schedule the deadline auto-refund.
-- pg_cron runs the SECURITY DEFINER RPC directly every hour; its inserts/updates
-- broadcast over Realtime to connected clients just like any other change.

create extension if not exists pg_cron;

-- Replace any prior schedule with the same name.
select cron.unschedule(jobid)
  from cron.job
 where jobname = 'auto-refund-deadlines';

select cron.schedule(
  'auto-refund-deadlines',
  '0 * * * *',
  $$ select public.auto_refund_expired_orders(); $$
);
