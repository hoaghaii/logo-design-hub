-- LogoDesignHub — escrow & workflow RPCs
-- All money movement is centralized here. Functions are SECURITY DEFINER and
-- authorize the caller via auth.uid(), so the browser never touches wallets
-- directly and operations are atomic.

-- Client chooses a designer: accept one application, reject the rest.
create or replace function public.accept_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_id uuid;
  v_client uuid;
begin
  select a.job_id, j.client_id
    into v_job_id, v_client
    from applications a
    join jobs j on j.id = a.job_id
   where a.id = p_application_id;

  if v_job_id is null then
    raise exception 'Application not found';
  end if;
  if v_client <> auth.uid() then
    raise exception 'Only the job owner can accept applications';
  end if;

  update applications set status = 'rejected'
   where job_id = v_job_id and id <> p_application_id;
  update applications set status = 'accepted'
   where id = p_application_id;
end;
$$;

-- Step 3 — Client funds the escrow.
create or replace function public.escrow_lock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  v_balance numeric;
  v_hash text := '0x' || encode(gen_random_bytes(32), 'hex');
begin
  select * into o from orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.client_id <> auth.uid() then raise exception 'Not your order'; end if;
  if o.status <> 'pending_escrow' then raise exception 'Order not awaiting escrow'; end if;

  select wallet_balance into v_balance from users where id = o.client_id for update;
  if v_balance < o.final_price then raise exception 'Insufficient wallet balance'; end if;

  update users set wallet_balance = wallet_balance - o.final_price where id = o.client_id;

  insert into transactions (order_id, from_user_id, to_user_id, type, amount, contract_address, tx_hash, status)
  values (o.id, o.client_id, null, 'escrow_lock', o.final_price, o.contract_address, v_hash, 'confirmed');

  update orders set status = 'active' where id = o.id;
  update jobs set status = 'in_progress' where id = o.job_id;

  insert into notifications (user_id, type, title, body, link)
  values (o.designer_id, 'escrow_funded', 'Escrow đã được nạp',
          'Tiền đã được khóa trong escrow. Bắt đầu thực hiện!',
          '/orders/' || o.id || '/escrow');
end;
$$;

-- Designer submits the deliverable file.
create or replace function public.submit_deliverable(p_order_id uuid, p_file_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
begin
  select * into o from orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.designer_id <> auth.uid() then raise exception 'Not your order'; end if;
  if o.status <> 'active' then raise exception 'Order is not active'; end if;

  insert into deliverables (order_id, file_url) values (o.id, p_file_url);
  update orders set status = 'submitted' where id = o.id;

  insert into notifications (user_id, type, title, body, link)
  values (o.client_id, 'deliverable_submitted', 'Sản phẩm đã được nộp',
          'Designer đã nộp sản phẩm, đang chờ bạn duyệt.',
          '/orders/' || o.id || '/escrow');
end;
$$;

-- Step 6a — Client approves: escrow releases to the designer.
create or replace function public.escrow_release(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  v_hash text := '0x' || encode(gen_random_bytes(32), 'hex');
begin
  select * into o from orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.client_id <> auth.uid() then raise exception 'Not your order'; end if;
  if o.status <> 'submitted' then raise exception 'Order is not awaiting review'; end if;

  update users set wallet_balance = wallet_balance + o.final_price where id = o.designer_id;

  insert into transactions (order_id, from_user_id, to_user_id, type, amount, contract_address, tx_hash, status)
  values (o.id, null, o.designer_id, 'escrow_release', o.final_price, o.contract_address, v_hash, 'confirmed');

  update orders set status = 'completed' where id = o.id;
  update jobs set status = 'completed' where id = o.job_id;

  insert into notifications (user_id, type, title, body, link)
  values (o.designer_id, 'escrow_released', 'Escrow đã giải ngân',
          'Client đã duyệt sản phẩm. Tiền đã được giải ngân cho bạn!',
          '/orders/' || o.id || '/escrow');
end;
$$;

-- Step 6b — Client rejects: escrow refunds the client, deliverable is locked.
create or replace function public.escrow_reject(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  v_hash text := '0x' || encode(gen_random_bytes(32), 'hex');
begin
  select * into o from orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.client_id <> auth.uid() then raise exception 'Not your order'; end if;
  if o.status <> 'submitted' then raise exception 'Order is not awaiting review'; end if;

  update users set wallet_balance = wallet_balance + o.final_price where id = o.client_id;

  insert into transactions (order_id, from_user_id, to_user_id, type, amount, contract_address, tx_hash, status)
  values (o.id, null, o.client_id, 'escrow_refund', o.final_price, o.contract_address, v_hash, 'confirmed');

  update orders set status = 'rejected' where id = o.id;
  update deliverables set is_locked = true where order_id = o.id;

  insert into notifications (user_id, type, title, body, link)
  values (o.designer_id, 'escrow_refunded', 'Sản phẩm bị từ chối',
          'Client đã từ chối sản phẩm. Escrow hoàn tiền về client.',
          '/orders/' || o.id || '/escrow');
end;
$$;

-- Cron / edge-function entrypoint — refund every active order past its deadline.
-- Not auth-guarded; intended to be called by the service role only.
create or replace function public.auto_refund_expired_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  v_count integer := 0;
  v_hash text;
begin
  for o in
    select * from orders where status = 'active' and deadline < now() for update
  loop
    v_hash := '0x' || encode(gen_random_bytes(32), 'hex');

    update users set wallet_balance = wallet_balance + o.final_price where id = o.client_id;

    insert into transactions (order_id, from_user_id, to_user_id, type, amount, contract_address, tx_hash, status)
    values (o.id, null, o.client_id, 'escrow_refund', o.final_price, o.contract_address, v_hash, 'confirmed');

    update orders set status = 'refunded' where id = o.id;
    update deliverables set is_locked = true where order_id = o.id;

    insert into notifications (user_id, type, title, body, link)
    values
      (o.client_id, 'deadline_refund', 'Quá hạn — hoàn tiền tự động',
       'Designer trễ deadline. Escrow đã tự động hoàn tiền cho bạn.',
       '/orders/' || o.id || '/escrow'),
      (o.designer_id, 'deadline_refund', 'Quá hạn — đơn bị hủy',
       'Bạn đã trễ deadline. Escrow đã hoàn tiền về client.',
       '/orders/' || o.id || '/escrow');

    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;
