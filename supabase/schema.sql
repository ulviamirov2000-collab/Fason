-- FASON — Supabase Schema Migration
-- Run this in your Supabase SQL editor

-- ============================================================
-- EXTENSIONS
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- ============================================================
create table if not exists public.users (
  id          uuid primary key default uuid_generate_v4(),
  email       text unique,
  phone       text unique,
  full_name   text,
  avatar_url  text,
  is_seller   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- RLS
alter table public.users enable row level security;

create policy "Users can view all profiles"
  on public.users for select using (true);

create policy "Users can update own profile"
  on public.users for update using (auth.uid() = id);

-- ============================================================
-- LISTINGS
-- ============================================================
create table if not exists public.listings (
  id              uuid primary key default uuid_generate_v4(),
  seller_id       uuid not null references public.users(id) on delete cascade,
  title_az        text not null,
  title_ru        text not null default '',
  description_az  text,
  description_ru  text,
  price           numeric(10, 2) not null check (price >= 0),
  category        text,
  size            text,
  brand           text,
  condition       text not null check (condition in ('new', 'good', 'fair')),
  images          text[] not null default '{}',
  status          text not null default 'active' check (status in ('active', 'sold', 'archived')),
  views           integer not null default 0,
  created_at      timestamptz not null default now()
);

create index on public.listings (seller_id);
create index on public.listings (status);
create index on public.listings (category);
create index on public.listings (created_at desc);

-- RLS
alter table public.listings enable row level security;

create policy "Anyone can view active listings"
  on public.listings for select using (status = 'active');

create policy "Sellers can view own listings"
  on public.listings for select using (auth.uid() = seller_id);

create policy "Authenticated users can create listings"
  on public.listings for insert with check (auth.uid() = seller_id);

create policy "Sellers can update own listings"
  on public.listings for update using (auth.uid() = seller_id);

create policy "Sellers can delete own listings"
  on public.listings for delete using (auth.uid() = seller_id);

-- ============================================================
-- ORDERS
-- ============================================================
create table if not exists public.orders (
  id          uuid primary key default uuid_generate_v4(),
  listing_id  uuid not null references public.listings(id) on delete restrict,
  buyer_id    uuid not null references public.users(id) on delete restrict,
  seller_id   uuid not null references public.users(id) on delete restrict,
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'delivered', 'cancelled')),
  amount      numeric(10, 2) not null check (amount >= 0),
  created_at  timestamptz not null default now()
);

create index on public.orders (buyer_id);
create index on public.orders (seller_id);
create index on public.orders (listing_id);

-- RLS
alter table public.orders enable row level security;

create policy "Buyers and sellers can view own orders"
  on public.orders for select using (
    auth.uid() = buyer_id or auth.uid() = seller_id
  );

create policy "Authenticated users can create orders"
  on public.orders for insert with check (auth.uid() = buyer_id);

create policy "Sellers can update order status"
  on public.orders for update using (auth.uid() = seller_id);

-- ============================================================
-- MESSAGES
-- ============================================================
create table if not exists public.messages (
  id          uuid primary key default uuid_generate_v4(),
  listing_id  uuid not null references public.listings(id) on delete cascade,
  sender_id   uuid not null references public.users(id) on delete cascade,
  receiver_id uuid not null references public.users(id) on delete cascade,
  text        text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index on public.messages (sender_id);
create index on public.messages (receiver_id);
create index on public.messages (listing_id);
create index on public.messages (created_at asc);

-- RLS
alter table public.messages enable row level security;

create policy "Participants can view messages"
  on public.messages for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

create policy "Authenticated users can send messages"
  on public.messages for insert with check (auth.uid() = sender_id);

create policy "Receivers can mark messages as read"
  on public.messages for update using (auth.uid() = receiver_id);

-- ============================================================
-- TRIGGER: auto-insert into public.users on auth signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, full_name, created_at)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', now());
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET (run separately in Storage settings or via API)
-- ============================================================
-- Bucket name: listing-images
-- Public: true
-- Allowed MIME types: image/jpeg, image/png, image/webp
-- Max file size: 5MB
