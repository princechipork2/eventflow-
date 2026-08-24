-- Buy tickets RPC: atomically decrement available_tickets and create order
create or replace function public.buy_tickets(
  p_event_id uuid,
  p_ticket_tier_id uuid,
  p_quantity integer,
  p_total_amount numeric
)
returns json
language plpgsql
security definer
as $$
declare
  v_tier record;
  v_ticket_id uuid;
  v_ticket_code text;
  v_user_id uuid;
begin
  -- Get the authenticated user
  v_user_id := auth.uid();

  if v_user_id is null then
    return json_build_object('success', false, 'error', 'Not authenticated');
  end if;

  -- Lock the ticket tier row to prevent race conditions
  select * into v_tier
  from public.ticket_tiers
  where id = p_ticket_tier_id and event_id = p_event_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Ticket tier not found');
  end if;

  -- Check availability
  if v_tier.sold + p_quantity > v_tier.quantity then
    return json_build_object('success', false, 'error', 'Not enough tickets available');
  end if;

  -- Update sold count
  update public.ticket_tiers
  set sold = sold + p_quantity
  where id = p_ticket_tier_id;

  -- Update events tickets_sold column
  update public.events
  set tickets_sold = tickets_sold + p_quantity
  where id = p_event_id;

  -- Generate ticket code
  v_ticket_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

  -- Create the ticket/order
  insert into public.tickets (
    event_id,
    attendee_id,
    ticket_code,
    quantity,
    total_amount,
    status
  )
  values (
    p_event_id,
    v_user_id,
    v_ticket_code,
    p_quantity,
    p_total_amount,
    'confirmed'
  )
  returning id into v_ticket_id;

  return json_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'ticket_code', v_ticket_code
  );
end;
$$;
