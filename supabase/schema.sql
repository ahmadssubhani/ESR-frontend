-- ============================================================================
-- ESR Platform — Complete Supabase Schema (fresh project)
-- ============================================================================
-- How to use:
-- 1. Create a new Supabase project
-- 2. Open SQL Editor → New query
-- 3. Paste this entire file and Run
-- 4. Auth → Providers: enable Email (+ Google if needed)
-- 5. Copy Project URL + anon key into your .env.local
-- 6. After you sign up once, promote yourself to admin with the
--    snippet at the bottom of this file
-- ============================================================================

create extension if not exists "pgcrypto";

-- =============================================
-- PROFILES (extends auth.users)
-- =============================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  location text,
  image_url text,
  registration_code text,
  role text not null default 'customer' check (role in ('customer', 'owner', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_email_idx on profiles (email);
create index if not exists profiles_role_idx on profiles (role);

-- =============================================
-- CATEGORIES
-- =============================================
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- =============================================
-- RESTAURANTS
-- =============================================
create table if not exists restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete set null,
  name text not null,
  description text,
  address text,
  city text,
  country text default 'PK',
  zip_code text,
  phone_number text,
  email text,
  website text,
  opening_hours text,
  price_level text check (price_level in ('LOW', 'MEDIUM', 'HIGH')) default 'MEDIUM',
  category_id uuid references categories(id) on delete set null,
  restaurant_type text check (restaurant_type in (
    'DINE IN ONLY',
    'DINE IN & TAKE AWAY',
    'DINE IN & DELIVERY',
    'TAKE AWAY ONLY',
    'TAKE AWAY & DELIVERY',
    'DELIVERY ONLY',
    'DINE IN & TAKE AWAY & DELIVERY'
  )) default 'DINE IN & TAKE AWAY & DELIVERY',
  lat double precision,
  lng double precision,
  google_place_id text unique,
  source text not null default 'manual',
  image_url text,
  logo_url text,
  cover_url text,
  tags text[] default '{}',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists restaurants_owner_id_idx on restaurants (owner_id);
create index if not exists restaurants_category_id_idx on restaurants (category_id);
create index if not exists restaurants_is_active_idx on restaurants (is_active);
create index if not exists restaurants_lat_lng_idx on restaurants (lat, lng);
create unique index if not exists restaurants_google_place_id_uidx
  on restaurants (google_place_id)
  where google_place_id is not null;

-- =============================================
-- RESTAURANT MENU IMAGES
-- =============================================
create table if not exists restaurant_menu_images (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists restaurant_menu_images_restaurant_id_idx
  on restaurant_menu_images (restaurant_id);

-- =============================================
-- OFFERS
-- =============================================
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,
  description text default '',
  original_price numeric(10,2) not null default 0,
  discounted_price numeric(10,2) not null default 0,
  image_url text,
  valid_from timestamptz not null,
  valid_till timestamptz not null,
  approval_status boolean not null default false,
  is_bumper boolean not null default false,
  is_redeemable boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists offers_restaurant_id_idx on offers (restaurant_id);
create index if not exists offers_approval_status_idx on offers (approval_status);
create index if not exists offers_valid_till_idx on offers (valid_till);

-- =============================================
-- COUPONS
-- =============================================
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references offers(id) on delete cascade,
  code text not null unique,
  valid_from timestamptz,
  valid_till timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists coupons_offer_id_idx on coupons (offer_id);
create index if not exists coupons_active_idx on coupons (active);

-- Auto-generate ESR- plus 5 unique digits when coupon code is blank
create or replace function generate_coupon_code()
returns trigger
language plpgsql
as $$
declare
  new_code text;
  attempts int := 0;
begin
  if new.code is not null and btrim(new.code) <> '' then
    return new;
  end if;

  loop
    new_code := 'ESR-' || lpad((floor(random() * 90000 + 10000))::int::text, 5, '0');
    exit when not exists (select 1 from coupons where code = new_code);
    attempts := attempts + 1;
    if attempts > 100 then
      raise exception 'Could not generate unique coupon code';
    end if;
  end loop;

  new.code := new_code;
  return new;
end;
$$;

drop trigger if exists set_coupon_code on coupons;
create trigger set_coupon_code
before insert on coupons
for each row
execute function generate_coupon_code();

-- =============================================
-- USER COUPONS (redemption records)
-- =============================================
create table if not exists user_coupons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  coupon_id uuid not null references coupons(id),
  offer_id uuid not null references offers(id),
  used_at timestamptz not null default now()
);

create index if not exists user_coupons_user_id_idx on user_coupons (user_id);
create index if not exists user_coupons_offer_id_idx on user_coupons (offer_id);
create index if not exists user_coupons_used_at_idx on user_coupons (used_at);

-- Read-only alias for clients that query claimed_vouchers
drop view if exists public.claimed_vouchers;

create view public.claimed_vouchers
with (security_invoker = true)
as
select
  uc.id,
  uc.user_id,
  uc.coupon_id,
  uc.offer_id,
  uc.used_at,
  uc.used_at as claimed_at,
  uc.used_at as created_at,
  uc.used_at as updated_at,
  c.code as voucher_code
from public.user_coupons uc
left join public.coupons c on c.id = uc.coupon_id;

grant select on public.claimed_vouchers to anon, authenticated, service_role;

-- =============================================
-- USER OFFERS (wishlist / favourites)
-- =============================================
create table if not exists user_offers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  offer_id uuid not null references offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, offer_id)
);

create index if not exists user_offers_user_id_idx on user_offers (user_id);

-- =============================================
-- REVIEWS
-- =============================================
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  offer_id uuid references offers(id) on delete set null,
  comment text,
  rating_taste int check (rating_taste between 1 and 5),
  rating_ambiance int check (rating_ambiance between 1 and 5),
  rating_quality int check (rating_quality between 1 and 5),
  rating_money_value int check (rating_money_value between 1 and 5),
  rating_overall numeric(3,1),
  tags text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_restaurant_id_idx on reviews (restaurant_id);
create index if not exists reviews_user_id_idx on reviews (user_id);
create index if not exists reviews_is_active_idx on reviews (is_active);

-- =============================================
-- REVIEW IMAGES
-- =============================================
create table if not exists review_images (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists review_images_review_id_idx on review_images (review_id);

-- =============================================
-- REVIEW LIKES
-- =============================================
create table if not exists review_likes (
  user_id uuid not null references profiles(id) on delete cascade,
  review_id uuid not null references reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

-- =============================================
-- REVIEW COMMENTS
-- =============================================
create table if not exists review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists review_comments_review_id_idx on review_comments (review_id, created_at);

-- =============================================
-- FEED STORIES / REELS
-- =============================================
create table if not exists feed_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  media_url text,
  media_type text not null check (media_type in ('image', 'video', 'embed')),
  caption text,
  source text not null default 'esr' check (source in ('esr', 'instagram', 'facebook')),
  external_url text,
  embed_url text,
  restaurant_id uuid references restaurants(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index if not exists feed_stories_expires_at_idx on feed_stories (expires_at desc);
create index if not exists feed_stories_user_id_idx on feed_stories (user_id, created_at desc);

-- =============================================
-- ADMIN ADS
-- =============================================
create table if not exists admin_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text check (category in ('S', 'G', 'D')) default 'S',
  expiry timestamptz,
  deeplink text,
  image_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================
-- APPLICATION VERSIONS
-- =============================================
create table if not exists application_versions (
  id uuid primary key default gen_random_uuid(),
  version numeric not null,
  is_update_version boolean not null default true,
  link_to_latest_version text,
  created_at timestamptz not null default now()
);

-- =============================================
-- updated_at helper
-- =============================================
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

drop trigger if exists restaurants_set_updated_at on restaurants;
create trigger restaurants_set_updated_at
before update on restaurants
for each row execute function set_updated_at();

drop trigger if exists offers_set_updated_at on offers;
create trigger offers_set_updated_at
before update on offers
for each row execute function set_updated_at();

drop trigger if exists reviews_set_updated_at on reviews;
create trigger reviews_set_updated_at
before update on reviews
for each row execute function set_updated_at();

drop trigger if exists admin_ads_set_updated_at on admin_ads;
create trigger admin_ads_set_updated_at
before update on admin_ads
for each row execute function set_updated_at();

-- =============================================
-- PROFILE AUTO-CREATE on signup / OAuth
-- =============================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, image_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update
    set
      email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      image_url = coalesce(public.profiles.image_url, excluded.image_url),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================
-- ATOMIC COUPON REDEMPTION
-- =============================================
create or replace function apply_coupon(
  p_user_id uuid,
  p_coupon_code text,
  p_offer_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon_id uuid;
  v_today_count int;
  v_already_used bool;
begin
  select id into v_coupon_id
  from coupons
  where code = p_coupon_code
    and offer_id = p_offer_id
    and active = true
  for update;

  if v_coupon_id is null then
    return json_build_object('success', false, 'error', 'Invalid coupon code');
  end if;

  select count(*) into v_today_count
  from user_coupons
  where user_id = p_user_id
    and used_at >= now() - interval '24 hours';

  if v_today_count >= 5 then
    return json_build_object(
      'success', false,
      'error', 'Daily redemption limit of 5 reached. Try again after 24 hours.'
    );
  end if;

  select exists(
    select 1 from user_coupons
    where user_id = p_user_id
      and offer_id = p_offer_id
      and used_at >= now() - interval '24 hours'
  ) into v_already_used;

  if v_already_used then
    return json_build_object(
      'success', false,
      'error', 'You already redeemed this offer. Please wait 24 hours.'
    );
  end if;

  insert into user_coupons (user_id, coupon_id, offer_id)
  values (p_user_id, v_coupon_id, p_offer_id);

  return json_build_object('success', true, 'message', 'Coupon redeemed successfully!');
end;
$$;

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================
alter table profiles enable row level security;
alter table restaurants enable row level security;
alter table offers enable row level security;
alter table coupons enable row level security;
alter table user_coupons enable row level security;
alter table user_offers enable row level security;
alter table reviews enable row level security;
alter table review_images enable row level security;
alter table review_likes enable row level security;
alter table review_comments enable row level security;
alter table feed_stories enable row level security;
alter table admin_ads enable row level security;
alter table application_versions enable row level security;
alter table categories enable row level security;
alter table restaurant_menu_images enable row level security;

-- Drop existing policies so this script is re-runnable on a fresh/partial DB
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'categories', 'restaurants', 'restaurant_menu_images',
        'offers', 'coupons', 'user_coupons', 'user_offers',
        'reviews', 'review_images', 'review_likes', 'review_comments', 'feed_stories',
        'admin_ads', 'application_versions'
      )
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Helper: admin check without re-entering profiles RLS (avoids infinite recursion)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- PROFILES
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Authenticated users can view community profiles"
  on profiles for select
  to authenticated
  using (true);

create policy "Users can insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can view all profiles"
  on profiles for select
  using (public.is_admin());

create policy "Admins can update all profiles"
  on profiles for update
  using (public.is_admin());

-- CATEGORIES
create policy "Anyone can view categories"
  on categories for select
  using (true);

create policy "Admins can manage categories"
  on categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- RESTAURANTS
create policy "Anyone can view active restaurants"
  on restaurants for select
  using (is_active = true);

create policy "Owners can manage own restaurant"
  on restaurants for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Admins can manage all restaurants"
  on restaurants for all
  using (public.is_admin())
  with check (public.is_admin());

-- RESTAURANT MENU IMAGES
create policy "Anyone can view menu images"
  on restaurant_menu_images for select
  using (true);

create policy "Owners can manage menu images"
  on restaurant_menu_images for all
  using (
    exists (
      select 1 from restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "Admins can manage menu images"
  on restaurant_menu_images for all
  using (public.is_admin())
  with check (public.is_admin());

-- OFFERS
create policy "Anyone can view approved offers"
  on offers for select
  using (approval_status = true);

create policy "Owners can manage own offers"
  on offers for all
  using (
    exists (
      select 1 from restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from restaurants r
      where r.id = restaurant_id and r.owner_id = auth.uid()
    )
  );

create policy "Admins can manage all offers"
  on offers for all
  using (public.is_admin())
  with check (public.is_admin());

-- COUPONS
create policy "Authenticated users can view active coupons"
  on coupons for select
  using (active = true and auth.uid() is not null);

create policy "Owners can view own coupons"
  on coupons for select
  using (
    exists (
      select 1
      from offers o
      join restaurants r on r.id = o.restaurant_id
      where o.id = offer_id and r.owner_id = auth.uid()
    )
  );

create policy "Admins can manage all coupons"
  on coupons for all
  using (
    public.is_admin()
  )
  with check (
    public.is_admin()
  );

-- USER COUPONS
create policy "Users can view own redemptions"
  on user_coupons for select
  using (user_id = auth.uid());

create policy "Users can insert own redemptions"
  on user_coupons for insert
  with check (user_id = auth.uid());

create policy "Owners can view redemptions on their offers"
  on user_coupons for select
  using (
    exists (
      select 1
      from offers o
      join restaurants r on r.id = o.restaurant_id
      where o.id = offer_id and r.owner_id = auth.uid()
    )
  );

create policy "Admins can view all redemptions"
  on user_coupons for select
  using (
    public.is_admin()
  );

-- USER OFFERS (wishlist)
create policy "Users manage own wishlist"
  on user_offers for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- REVIEWS
create policy "Anyone can view active reviews"
  on reviews for select
  using (is_active = true);

create policy "Authenticated users can create reviews"
  on reviews for insert
  with check (auth.uid() is not null and user_id = auth.uid());

create policy "Users can update own reviews"
  on reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can delete own reviews"
  on reviews for delete
  using (user_id = auth.uid());

create policy "Admins can manage all reviews"
  on reviews for all
  using (
    public.is_admin()
  )
  with check (
    public.is_admin()
  );

-- REVIEW IMAGES
create policy "Anyone can view review images"
  on review_images for select
  using (true);

create policy "Authenticated users can add review images"
  on review_images for insert
  with check (auth.uid() is not null);

create policy "Admins can manage review images"
  on review_images for all
  using (
    public.is_admin()
  )
  with check (
    public.is_admin()
  );

-- REVIEW LIKES
create policy "Anyone can view likes"
  on review_likes for select
  using (true);

create policy "Users manage own likes"
  on review_likes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- REVIEW COMMENTS
create policy "Anyone can view review comments"
  on review_comments for select
  using (true);

create policy "Users can comment on reviews"
  on review_comments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own comments"
  on review_comments for delete
  using (auth.uid() = user_id);

create policy "Admins can manage review comments"
  on review_comments for all
  using (public.is_admin())
  with check (public.is_admin());

-- FEED STORIES
create policy "Anyone can view live stories"
  on feed_stories for select
  using (expires_at > now());

create policy "Users can post own stories"
  on feed_stories for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own stories"
  on feed_stories for delete
  using (auth.uid() = user_id);

create policy "Admins can manage feed stories"
  on feed_stories for all
  using (public.is_admin())
  with check (public.is_admin());

-- ADMIN ADS
create policy "Anyone can view active ads"
  on admin_ads for select
  using (is_active = true and (expiry is null or expiry > now()));

create policy "Admins can manage ads"
  on admin_ads for all
  using (
    public.is_admin()
  )
  with check (
    public.is_admin()
  );

-- APPLICATION VERSIONS
create policy "Anyone can view app versions"
  on application_versions for select
  using (true);

create policy "Admins can manage app versions"
  on application_versions for all
  using (
    public.is_admin()
  )
  with check (
    public.is_admin()
  );

-- =============================================
-- STORAGE BUCKETS (avatars / restaurants / ads / reviews)
-- =============================================
insert into storage.buckets (id, name, public)
values
  ('restaurant-images', 'restaurant-images', true),
  ('review-images', 'review-images', true),
  ('feed-stories', 'feed-stories', true),
  ('ads', 'ads', true)
on conflict (id) do update
  set public = excluded.public;

-- Clean old storage policies for these buckets (re-runnable)
do $$
declare
  r record;
begin
  for r in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname like 'ESR %'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy "ESR public read restaurant-images"
  on storage.objects for select
  using (bucket_id = 'restaurant-images');

create policy "ESR public read review-images"
  on storage.objects for select
  using (bucket_id = 'review-images');

create policy "ESR public read feed-stories"
  on storage.objects for select
  using (bucket_id = 'feed-stories');

create policy "ESR public read ads"
  on storage.objects for select
  using (bucket_id = 'ads');

create policy "ESR auth upload restaurant-images"
  on storage.objects for insert
  with check (bucket_id = 'restaurant-images' and auth.uid() is not null);

create policy "ESR auth upload review-images"
  on storage.objects for insert
  with check (bucket_id = 'review-images' and auth.uid() is not null);

create policy "ESR auth upload feed-stories"
  on storage.objects for insert
  with check (bucket_id = 'feed-stories' and auth.uid() is not null);

create policy "ESR auth upload ads"
  on storage.objects for insert
  with check (bucket_id = 'ads' and auth.uid() is not null);

create policy "ESR auth update own restaurant-images"
  on storage.objects for update
  using (bucket_id = 'restaurant-images' and auth.uid() is not null);

create policy "ESR auth update own review-images"
  on storage.objects for update
  using (bucket_id = 'review-images' and auth.uid() is not null);

create policy "ESR auth update feed-stories"
  on storage.objects for update
  using (bucket_id = 'feed-stories' and auth.uid() is not null);

create policy "ESR auth update ads"
  on storage.objects for update
  using (bucket_id = 'ads' and auth.uid() is not null);

create policy "ESR auth delete own review-images"
  on storage.objects for delete
  using (bucket_id = 'review-images' and auth.uid() is not null);

create policy "ESR auth delete feed-stories"
  on storage.objects for delete
  using (bucket_id = 'feed-stories' and auth.uid() is not null);

create policy "ESR auth delete restaurant-images"
  on storage.objects for delete
  using (bucket_id = 'restaurant-images' and auth.uid() is not null);

create policy "ESR auth delete ads"
  on storage.objects for delete
  using (bucket_id = 'ads' and auth.uid() is not null);

-- =============================================
-- REALTIME (admin panel + website catalog sync)
-- =============================================
alter table restaurants replica identity full;
alter table offers replica identity full;
alter table coupons replica identity full;
alter table user_coupons replica identity full;
alter table admin_ads replica identity full;
alter table profiles replica identity full;
alter table reviews replica identity full;

do $$
begin
  alter publication supabase_realtime add table restaurants;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table offers;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table coupons;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table user_coupons;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table admin_ads;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table profiles;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table reviews;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table review_likes;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table review_comments;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table feed_stories;
exception when duplicate_object then null;
end $$;

-- =============================================
-- SEED DATA
-- =============================================
insert into categories (name) values
  ('Restaurant'),
  ('Cafe'),
  ('Bakery'),
  ('Pizza'),
  ('Fast Food'),
  ('Chinese'),
  ('Desi')
on conflict (name) do nothing;

insert into application_versions (version, is_update_version, link_to_latest_version)
select 1.0, true, null
where not exists (select 1 from application_versions);

-- =============================================
-- POST-SETUP (run AFTER first signup)
-- =============================================
-- Make your account admin (replace the email):
--
--   update profiles
--   set role = 'admin'
--   where email = 'you@example.com';
--
-- Optional: backfill any auth users missing a profile row:
--
--   insert into profiles (id, email, full_name, image_url)
--   select
--     u.id,
--     u.email,
--     coalesce(
--       u.raw_user_meta_data->>'full_name',
--       u.raw_user_meta_data->>'name',
--       split_part(u.email, '@', 1)
--     ),
--     coalesce(
--       u.raw_user_meta_data->>'avatar_url',
--       u.raw_user_meta_data->>'picture'
--     )
--   from auth.users u
--   left join profiles p on p.id = u.id
--   where p.id is null
--   on conflict (id) do nothing;
