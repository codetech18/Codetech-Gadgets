-- CodeTech Gadgets catalog and inventory foundation for Supabase.
-- Run this in the Supabase SQL Editor before connecting the storefront.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

create table if not exists public.device_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model_name text not null,
  category text not null check (category in ('phones', 'laptops', 'tablets', 'audio', 'wearables', 'cameras', 'accessories', 'other')),
  created_at timestamptz not null default now(),
  unique (brand, model_name, category)
);

create table if not exists public.device_listings (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.device_models(id) on delete restrict,
  title text not null,
  storage text,
  color text,
  condition text not null check (condition in ('sealed', 'like_new', 'excellent', 'very_good', 'good', 'fair', 'faulty')),
  condition_notes text not null default '',
  battery_health smallint check (battery_health between 1 and 100),
  price_ngn bigint not null check (price_ngn >= 0),
  stock_quantity integer not null default 1 check (stock_quantity >= 0),
  individual_unit boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'available', 'reserved', 'sold')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint individual_device_has_single_stock check (not individual_unit or stock_quantity <= 1)
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.device_listings(id) on delete cascade,
  secure_url text not null,
  cloudinary_public_id text not null,
  alt_text text not null default '',
  position smallint not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (listing_id, cloudinary_public_id)
);

create index if not exists device_listings_public_catalog_idx
  on public.device_listings (status, model_id) where status = 'available';
create index if not exists listing_images_listing_position_idx
  on public.listing_images (listing_id, position);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists device_listings_set_updated_at on public.device_listings;
create trigger device_listings_set_updated_at
  before update on public.device_listings
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.device_models enable row level security;
alter table public.device_listings enable row level security;
alter table public.listing_images enable row level security;

-- Public visitors can see available inventory and its images only.
drop policy if exists "Public can read device models" on public.device_models;
create policy "Public can read device models"
  on public.device_models for select to anon, authenticated
  using (exists (
    select 1 from public.device_listings listing
    where listing.model_id = device_models.id
      and listing.status = 'available'
      and listing.stock_quantity > 0
  ));

drop policy if exists "Public can read available listings" on public.device_listings;
create policy "Public can read available listings"
  on public.device_listings for select to anon, authenticated
  using (status = 'available' and stock_quantity > 0);

drop policy if exists "Public can read images for available listings" on public.listing_images;
create policy "Public can read images for available listings"
  on public.listing_images for select to anon, authenticated
  using (exists (
    select 1 from public.device_listings listing
    where listing.id = listing_images.listing_id
      and listing.status = 'available'
      and listing.stock_quantity > 0
  ));

-- Admin access is assigned by the owner; regular signed-in users cannot edit stock.
drop policy if exists "Admins can manage device models" on public.device_models;
create policy "Admins can manage device models"
  on public.device_models for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can manage device listings" on public.device_listings;
create policy "Admins can manage device listings"
  on public.device_listings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Admins can manage listing images" on public.listing_images;
create policy "Admins can manage listing images"
  on public.listing_images for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.device_models, public.device_listings, public.listing_images to anon, authenticated;
grant insert, update, delete on public.device_models, public.device_listings, public.listing_images to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
