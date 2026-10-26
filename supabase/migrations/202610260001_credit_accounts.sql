create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  generation_credits integer not null default 1 check (generation_credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
grant select on public.profiles to authenticated;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

insert into public.profiles (id, email, display_name, generation_credits)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name'),
  1
from auth.users
on conflict (id) do nothing;

create or replace function public.consume_generation_credit(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set generation_credits = generation_credits - 1,
      updated_at = now()
  where id = p_user_id and generation_credits > 0;
  return found;
end;
$$;

create or replace function public.refund_generation_credit(p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set generation_credits = generation_credits + 1,
      updated_at = now()
  where id = p_user_id;
$$;

revoke all on function public.create_profile_for_new_user() from public, anon, authenticated;
revoke all on function public.consume_generation_credit(uuid) from public, anon, authenticated;
revoke all on function public.refund_generation_credit(uuid) from public, anon, authenticated;
grant execute on function public.consume_generation_credit(uuid) to service_role;
grant execute on function public.refund_generation_credit(uuid) to service_role;
