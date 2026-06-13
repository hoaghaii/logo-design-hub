-- Designer accepts or declines a contract the client proposed.
-- accept  -> order becomes 'pending_escrow', job 'in_progress', client notified to fund.
-- decline -> order becomes 'declined', client notified (can re-propose).
create or replace function public.respond_contract(p_order_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders%rowtype;
  v_app_id uuid;
begin
  select * into o from orders where id = p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.designer_id <> auth.uid() then raise exception 'Not your contract'; end if;
  if o.status <> 'pending_acceptance' then raise exception 'Contract not awaiting your response'; end if;

  select id into v_app_id
    from applications
    where job_id = o.job_id and designer_id = o.designer_id
    limit 1;

  if p_accept then
    update orders set status = 'pending_escrow' where id = o.id;
    update jobs set status = 'in_progress' where id = o.job_id;
    insert into notifications (user_id, type, title, body, link)
    values (o.client_id, 'contract_accepted', 'Designer đã chấp nhận hợp đồng',
            'Vui lòng ký quỹ vào escrow để bắt đầu.',
            '/orders/' || o.id || '/escrow');
  else
    update orders set status = 'declined' where id = o.id;
    insert into notifications (user_id, type, title, body, link)
    values (o.client_id, 'contract_declined', 'Designer đã từ chối hợp đồng',
            'Bạn có thể điều chỉnh và gửi lại hợp đồng.',
            '/deal/' || coalesce(v_app_id::text, ''));
  end if;
end;
$$;

grant execute on function public.respond_contract(uuid, boolean) to authenticated;
