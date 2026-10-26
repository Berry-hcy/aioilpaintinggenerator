-- A credit lot records the origin, quality, and expiry of each generation credit.
create table if not exists public.generation_credit_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source text not null check (source in ('free', 'paid', 'legacy')),
  quality text not null check (quality in ('standard', 'hd')),
  credits_remaining integer not null check (credits_remaining >= 0),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists generation_credit_lots_available_idx
  on public.generation_credit_lots (user_id, expires_at, created_at)
  where credits_remaining > 0;

alter table public.generation_credit_lots enable row level security;

-- Preserve all credits that existed before this migration as standard, non-expiring credits.
insert into public.generation_credit_lots (user_id, source, quality, credits_remaining)
select p.id, 'legacy', 'standard', p.generation_credits
from public.profiles p
where p.generation_credits > 0
  and not exists (
    select 1 from public.generation_credit_lots l where l.user_id = p.id
  );

create table if not exists public.waffo_orders (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id text not null check (pack_id in ('starter', 'value')),
  product_id text not null,
  price numeric(8, 2) not null check (price > 0),
  credits integer not null check (credits > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  waffo_order_id text unique,
  credit_lot_id uuid references public.generation_credit_lots (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.waffo_orders enable row level security;

-- Replace profile creation so a newly created account receives one free standard credit lot.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, generation_credits)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    1
  )
  on conflict (id) do nothing;

  if found then
    insert into public.generation_credit_lots (user_id, source, quality, credits_remaining)
    values (new.id, 'free', 'standard', 1);
  end if;
  return new;
end;
$$;

drop function if exists public.consume_generation_credit(uuid);
create function public.consume_generation_credit(p_user_id uuid)
returns table (credit_lot_id uuid, quality text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_lot public.generation_credit_lots%rowtype;
begin
  -- Expire unused lots before checking the profile's cached total.
  with expired as (
    select id, credits_remaining
    from public.generation_credit_lots
    where user_id = p_user_id and credits_remaining > 0 and expires_at <= now()
    for update
  ), zeroed as (
    update public.generation_credit_lots
    set credits_remaining = 0
    where id in (select id from expired)
    returning id
  )
  update public.profiles p
  set generation_credits = greatest(0, p.generation_credits - coalesce((select sum(credits_remaining) from expired), 0)),
      updated_at = now()
  where p.id = p_user_id;

  select l.* into selected_lot
  from public.generation_credit_lots l
  where l.user_id = p_user_id
    and l.credits_remaining > 0
    and (l.expires_at is null or l.expires_at > now())
  order by l.expires_at asc nulls last, l.created_at asc
  for update skip locked
  limit 1;

  if not found then
    return;
  end if;

  update public.generation_credit_lots
  set credits_remaining = credits_remaining - 1
  where id = selected_lot.id;
  update public.profiles
  set generation_credits = generation_credits - 1, updated_at = now()
  where id = p_user_id and generation_credits > 0;

  credit_lot_id := selected_lot.id;
  quality := selected_lot.quality;
  return next;
end;
$$;

drop function if exists public.refund_generation_credit(uuid);
create function public.refund_generation_credit(p_user_id uuid, p_credit_lot_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  restored integer;
begin
  update public.generation_credit_lots
  set credits_remaining = credits_remaining + 1
  where id = p_credit_lot_id
    and user_id = p_user_id
    and (expires_at is null or expires_at > now())
    and not exists (
      select 1 from public.waffo_orders o
      where o.credit_lot_id = p_credit_lot_id and o.status = 'refunded'
    );
  get diagnostics restored = row_count;

  if restored > 0 then
    update public.profiles
    set generation_credits = generation_credits + 1, updated_at = now()
    where id = p_user_id;
  end if;
end;
$$;

create or replace function public.get_available_generation_credits(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  expired_credits integer;
  available integer;
begin
  with expired as (
    select id, credits_remaining
    from public.generation_credit_lots
    where user_id = p_user_id and credits_remaining > 0 and expires_at <= now()
    for update
  ), zeroed as (
    update public.generation_credit_lots
    set credits_remaining = 0
    where id in (select id from expired)
    returning id
  )
  select coalesce(sum(credits_remaining), 0)::integer into expired_credits from expired;

  update public.profiles
  set generation_credits = greatest(0, generation_credits - expired_credits), updated_at = now()
  where id = p_user_id;

  select generation_credits into available from public.profiles where id = p_user_id;
  return coalesce(available, 0);
end;
$$;

create or replace function public.fulfill_waffo_credit_order(
  p_external_id text,
  p_waffo_order_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_order public.waffo_orders%rowtype;
  new_lot_id uuid;
begin
  select * into payment_order
  from public.waffo_orders
  where external_id = p_external_id
  for update;

  if not found then
    raise exception 'Payment order not found';
  end if;

  -- Waffo may retry a delivery. Only the first verified completed order grants credits.
  if payment_order.status = 'completed' then
    if payment_order.waffo_order_id = p_waffo_order_id then return false; end if;
    raise exception 'Payment order already completed with a different Waffo order';
  end if;
  if payment_order.status <> 'pending' then
    raise exception 'Payment order is not pending';
  end if;

  insert into public.generation_credit_lots (user_id, source, quality, credits_remaining, expires_at)
  values (payment_order.user_id, 'paid', 'hd', payment_order.credits, now() + interval '12 months')
  returning id into new_lot_id;

  update public.profiles
  set generation_credits = generation_credits + payment_order.credits, updated_at = now()
  where id = payment_order.user_id;

  update public.waffo_orders
  set status = 'completed', waffo_order_id = p_waffo_order_id, credit_lot_id = new_lot_id, completed_at = now()
  where id = payment_order.id;
  return true;
end;
$$;

create or replace function public.revoke_waffo_refunded_order(
  p_external_id text,
  p_waffo_order_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_order public.waffo_orders%rowtype;
  remaining integer;
begin
  select * into payment_order
  from public.waffo_orders
  where external_id = p_external_id
  for update;

  if not found then raise exception 'Payment order not found'; end if;
  if payment_order.status = 'refunded' then return false; end if;
  if payment_order.status <> 'completed' or payment_order.waffo_order_id <> p_waffo_order_id then
    raise exception 'Refund does not match a completed order';
  end if;

  select credits_remaining into remaining
  from public.generation_credit_lots
  where id = payment_order.credit_lot_id
  for update;
  remaining := coalesce(remaining, 0);
  update public.generation_credit_lots set credits_remaining = 0 where id = payment_order.credit_lot_id;

  update public.profiles
  set generation_credits = greatest(0, generation_credits - remaining), updated_at = now()
  where id = payment_order.user_id;

  update public.waffo_orders set status = 'refunded' where id = payment_order.id;
  return true;
end;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.consume_generation_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_generation_credit(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_available_generation_credits(uuid) from public, anon, authenticated;
revoke all on function public.fulfill_waffo_credit_order(text, text) from public, anon, authenticated;
revoke all on function public.revoke_waffo_refunded_order(text, text) from public, anon, authenticated;
grant execute on function public.consume_generation_credit(uuid) to service_role;
grant execute on function public.refund_generation_credit(uuid, uuid) to service_role;
grant execute on function public.get_available_generation_credits(uuid) to service_role;
grant execute on function public.fulfill_waffo_credit_order(text, text) to service_role;
grant execute on function public.revoke_waffo_refunded_order(text, text) to service_role;
