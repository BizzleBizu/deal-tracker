-- Deal Tracker: complete database schema
-- For a FRESH Supabase project. Run once in the SQL Editor.
-- Contains no secrets, so it is safe to keep in a public repo.

-- ============ TABLES ============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Member',
  role text not null default 'member' check (role in ('owner','member')),
  budget numeric(10,2) not null default 0 check (budget >= 0),
  ntfy_topic text not null unique default ('dt-' || replace(gen_random_uuid()::text, '-', '')),
  notify_push boolean not null default true,
  phone text,
  created_at timestamptz not null default now()
);

create table public.store_links (
  id uuid primary key default gen_random_uuid(),
  url text not null unique check (url ~* '^https://' and length(url) < 2000),
  store text not null,
  title text,
  current_price numeric(10,2) check (current_price > 0),
  last_checked timestamptz,
  status text not null default 'pending' check (status in ('pending','ok','stale','failed')),
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.price_history (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.store_links(id) on delete cascade,
  price numeric(10,2) not null check (price > 0),
  source text not null check (source in ('auto','manual')),
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now()
);

create table public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 200),
  priority text not null default 'nice_to_have' check (priority in ('must_have','nice_to_have','only_if_cheap')),
  target_price numeric(10,2) check (target_price > 0),
  notes text check (length(notes) < 2000),
  status text not null default 'watching' check (status in ('watching','bought','skipped')),
  created_at timestamptz not null default now()
);

create table public.item_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  item_id uuid not null references public.wishlist_items(id) on delete cascade,
  link_id uuid not null references public.store_links(id) on delete cascade,
  unique (item_id, link_id)
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.wishlist_items(id) on delete cascade,
  link_id uuid references public.store_links(id) on delete set null,
  type text not null check (type in ('target_hit','price_drop','check_failed')),
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============ INDEXES ============

create index on public.price_history (link_id, recorded_at desc);
create index on public.wishlist_items (user_id);
create index on public.item_links (user_id);
create index on public.item_links (item_id);
create index on public.item_links (link_id);
create index on public.alerts (user_id, is_read, created_at desc);

-- ============ ROW LEVEL SECURITY ============

alter table public.profiles       enable row level security;
alter table public.store_links    enable row level security;
alter table public.price_history  enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.item_links     enable row level security;
alter table public.alerts         enable row level security;

-- Profiles: see and edit only your own
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Shared price data: any signed-in user can read
create policy "store_links_select" on public.store_links
  for select to authenticated using (true);
create policy "store_links_insert" on public.store_links
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "price_history_select" on public.price_history
  for select to authenticated using (true);

-- Wishlist: your own rows only
create policy "items_all_own" on public.wishlist_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Item links: your own, and only for items you own
create policy "item_links_select_own" on public.item_links
  for select to authenticated using (user_id = (select auth.uid()));
create policy "item_links_insert_own" on public.item_links
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wishlist_items w
      where w.id = item_id and w.user_id = (select auth.uid())
    )
  );
create policy "item_links_delete_own" on public.item_links
  for delete to authenticated using (user_id = (select auth.uid()));

-- Alerts: read, mark read, and delete your own
create policy "alerts_select_own" on public.alerts
  for select to authenticated using (user_id = (select auth.uid()));
create policy "alerts_update_own" on public.alerts
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "alerts_delete_own" on public.alerts
  for delete to authenticated using (user_id = (select auth.uid()));

-- ============ PERMISSIONS ============
-- Nothing is open to logged-out visitors; signed-in users get only what they need.

revoke all on public.profiles, public.store_links, public.price_history,
  public.wishlist_items, public.item_links, public.alerts from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, budget, phone, notify_push) on public.profiles to authenticated;

grant select on public.store_links to authenticated;
grant insert (url, store, title, created_by) on public.store_links to authenticated;

grant select on public.price_history to authenticated;

grant select, insert, update, delete on public.wishlist_items to authenticated;

grant select, delete on public.item_links to authenticated;
grant insert (item_id, link_id, user_id) on public.item_links to authenticated;

grant select, delete on public.alerts to authenticated;
grant update (is_read) on public.alerts to authenticated;

-- The background price checker (uses the secret service key)
grant all on public.profiles, public.store_links, public.price_history,
  public.wishlist_items, public.item_links, public.alerts to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ============ FUNCTIONS ============

-- Create a profile automatically when a user is added
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create alerts when a price change matters (target hit or 5%+ drop).
-- Returns one row per alert created so the checker can send push notifications.
create or replace function public.notify_price_change(p_link_id uuid, p_old numeric, p_new numeric)
returns table (out_user_id uuid, out_message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  v_store text;
  v_type text;
  v_msg text;
begin
  select store into v_store from public.store_links where id = p_link_id;
  for r in
    select w.id as item_id, w.user_id, w.name, w.target_price
    from public.item_links il
    join public.wishlist_items w on w.id = il.item_id
    where il.link_id = p_link_id and w.status = 'watching'
  loop
    v_type := null;
    if r.target_price is not null and p_new <= r.target_price
       and (p_old is null or p_old > r.target_price) then
      v_type := 'target_hit';
      v_msg := r.name || ' is $' || to_char(p_new, 'FM999990.00') || ' at ' || v_store
        || ' (target $' || to_char(r.target_price, 'FM999990.00') || ')';
    elsif p_old is not null and p_new <= p_old * 0.95 then
      v_type := 'price_drop';
      v_msg := r.name || ' dropped from $' || to_char(p_old, 'FM999990.00')
        || ' to $' || to_char(p_new, 'FM999990.00') || ' at ' || v_store;
    end if;
    if v_type is not null then
      insert into public.alerts (user_id, item_id, link_id, type, message)
      values (r.user_id, r.item_id, p_link_id, v_type, v_msg);
      out_user_id := r.user_id;
      out_message := v_msg;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.notify_price_change(uuid, numeric, numeric) from public, anon, authenticated;
grant execute on function public.notify_price_change(uuid, numeric, numeric) to service_role;

-- Controlled way for members to enter a price manually
create or replace function public.submit_manual_price(p_link_id uuid, p_price numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old numeric;
  v_new numeric;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if p_price is null or p_price <= 0 or p_price > 100000 then
    raise exception 'Invalid price';
  end if;
  if not exists (
    select 1 from public.item_links il
    where il.link_id = p_link_id and il.user_id = auth.uid()
  ) then
    raise exception 'That link is not on your wishlist';
  end if;

  v_new := round(p_price, 2);
  select current_price into v_old from public.store_links where id = p_link_id;

  insert into public.price_history (link_id, price, source, recorded_by)
  values (p_link_id, v_new, 'manual', auth.uid());

  update public.store_links
  set current_price = v_new, last_checked = now(), status = 'ok'
  where id = p_link_id;

  perform public.notify_price_change(p_link_id, v_old, v_new);
end;
$$;

revoke all on function public.submit_manual_price(uuid, numeric) from public, anon;
grant execute on function public.submit_manual_price(uuid, numeric) to authenticated;

-- ============ AFTER SETUP ============
-- 1. In Supabase, turn OFF "Allow new users to sign up" (Authentication settings).
-- 2. Create your account under Authentication > Users (tick Auto Confirm User).
-- 3. Make yourself the owner (replace the email):
--
--   update public.profiles
--   set role = 'owner'
--   where id = (select id from auth.users where email = 'you@example.com');