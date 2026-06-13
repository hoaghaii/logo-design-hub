-- Client proposes (or re-proposes) a contract. Order starts in pending_acceptance.
-- SECURITY DEFINER because there is no direct UPDATE policy on orders.
create or replace function public.propose_contract(
  p_application_id uuid,
  p_final_price numeric,
  p_deadline timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
  o orders%rowtype;
  v_order_id uuid;
begin
  select ap.id as app_id, ap.designer_id, j.id as job_id, j.client_id
    into a
    from applications ap
    join jobs j on j.id = ap.job_id
    where ap.id = p_application_id;

  if a.app_id is null then raise exception 'Application not found'; end if;
  if a.client_id <> auth.uid() then raise exception 'Chỉ client mới gửi hợp đồng'; end if;
  if p_final_price <= 0 then raise exception 'Giá không hợp lệ'; end if;
  if p_deadline is null then raise exception 'Vui lòng chọn deadline'; end if;

  select * into o from orders where job_id = a.job_id for update;

  -- A non-declined contract already exists — nothing to do.
  if o.id is not null and o.status <> 'declined' then
    return o.id;
  end if;

  if o.id is not null then
    update orders
      set final_price = p_final_price,
          deadline = p_deadline,
          status = 'pending_acceptance',
          contract_address = '0x' || substring(replace(o.id::text, '-', ''), 1, 40)
      where id = o.id;
    v_order_id := o.id;
  else
    insert into orders (job_id, client_id, designer_id, final_price, deadline, status)
      values (a.job_id, a.client_id, a.designer_id, p_final_price, p_deadline, 'pending_acceptance')
      returning id into v_order_id;
    update orders
      set contract_address = '0x' || substring(replace(v_order_id::text, '-', ''), 1, 40)
      where id = v_order_id;
  end if;

  insert into notifications (user_id, type, title, body, link)
  values (a.designer_id, 'contract_proposed', 'Client gửi hợp đồng',
          'Vui lòng xem và chấp nhận hoặc từ chối hợp đồng.',
          '/deal/' || a.app_id);

  return v_order_id;
end;
$$;

grant execute on function public.propose_contract(uuid, numeric, timestamptz) to authenticated;
