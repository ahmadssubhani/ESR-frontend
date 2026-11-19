begin;

alter table public.profiles
  add column if not exists avatar_url text;

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set role = case role
  when 'customer' then 'user'
  when 'owner' then 'restaurant'
  else role
end;

alter table public.profiles
  alter column role set default 'user',
  add constraint profiles_role_check check (role in ('user', 'restaurant', 'admin'));

update public.profiles
set avatar_url = coalesce(avatar_url, image_url)
where avatar_url is null;

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.role is distinct from old.role then
    raise exception 'Profile role cannot be changed by the account owner';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, image_url, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    'user'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      image_url = coalesce(public.profiles.image_url, excluded.image_url),
      avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id and role = 'user');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);
drop policy if exists "Public community profile names and avatars" on public.profiles;
create policy "Public community profile names and avatars"
  on public.profiles for select to anon
  using (true);
revoke select on public.profiles from anon;
grant select (id, full_name, image_url, avatar_url) on public.profiles to anon;
grant select (id, full_name, image_url, avatar_url) on public.profiles to authenticated;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  image_url text not null,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  caption text not null check (char_length(trim(caption)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);
create index if not exists posts_author_id_idx on public.posts (author_id, created_at desc);
create index if not exists posts_restaurant_id_idx on public.posts (restaurant_id, created_at desc);

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists post_comments_post_id_idx
  on public.post_comments (post_id, created_at);

create table if not exists public.restaurant_views (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists restaurant_views_user_recent_idx
  on public.restaurant_views (user_id, viewed_at desc);

create table if not exists public.user_restaurants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, restaurant_id)
);

create index if not exists user_restaurants_user_id_idx
  on public.user_restaurants (user_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('voucher', 'like', 'comment')),
  entity_id uuid,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_recipient_recent_idx
  on public.notifications (recipient_id, created_at desc);

alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.restaurant_views enable row level security;
alter table public.user_restaurants enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "Posts are public" on public.posts;
create policy "Posts are public"
  on public.posts for select using (true);
drop policy if exists "Users create own posts" on public.posts;
create policy "Users create own posts"
  on public.posts for insert to authenticated
  with check (author_id = auth.uid());
drop policy if exists "Users update own posts" on public.posts;
create policy "Users update own posts"
  on public.posts for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "Users delete own posts" on public.posts;
create policy "Users delete own posts"
  on public.posts for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists "Post likes are public" on public.post_likes;
create policy "Post likes are public"
  on public.post_likes for select using (true);
drop policy if exists "Users manage own post likes" on public.post_likes;
create policy "Users manage own post likes"
  on public.post_likes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Post comments are public" on public.post_comments;
create policy "Post comments are public"
  on public.post_comments for select using (true);
drop policy if exists "Users add own post comments" on public.post_comments;
create policy "Users add own post comments"
  on public.post_comments for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Users delete own post comments" on public.post_comments;
create policy "Users delete own post comments"
  on public.post_comments for delete to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users read own restaurant views" on public.restaurant_views;
create policy "Users read own restaurant views"
  on public.restaurant_views for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users add own restaurant views" on public.restaurant_views;
create policy "Users add own restaurant views"
  on public.restaurant_views for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users manage own saved restaurants" on public.user_restaurants;
create policy "Users manage own saved restaurants"
  on public.user_restaurants for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select to authenticated
  using (recipient_id = auth.uid());
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.posts, public.post_likes, public.post_comments to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;
grant insert, delete on public.post_likes, public.post_comments to authenticated;
grant select, insert on public.restaurant_views to authenticated;
grant select, insert, delete on public.user_restaurants to authenticated;
grant select, update (read_at) on public.notifications to authenticated;

create or replace function public.notify_post_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  post_author uuid;
begin
  select author_id into post_author
  from public.posts
  where id = new.post_id;

  if post_author is not null and post_author <> new.user_id then
    insert into public.notifications (recipient_id, actor_id, type, entity_id)
    values (
      post_author,
      new.user_id,
      case when tg_table_name = 'post_likes' then 'like' else 'comment' end,
      new.post_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists post_likes_notify_author on public.post_likes;
create trigger post_likes_notify_author
after insert on public.post_likes
for each row execute function public.notify_post_activity();
drop trigger if exists post_comments_notify_author on public.post_comments;
create trigger post_comments_notify_author
after insert on public.post_comments
for each row execute function public.notify_post_activity();

create or replace function public.notify_new_voucher()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, type, entity_id)
  values (new.user_id, 'voucher', new.offer_id);
  return new;
end;
$$;

drop trigger if exists user_coupons_notify_user on public.user_coupons;
create trigger user_coupons_notify_user
after insert on public.user_coupons
for each row execute function public.notify_new_voucher();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('post-images', 'post-images', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read avatars" on storage.objects;
create policy "Public can read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');
drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Public can read post images" on storage.objects;
create policy "Public can read post images"
  on storage.objects for select
  using (bucket_id = 'post-images');
drop policy if exists "Users upload own post images" on storage.objects;
create policy "Users upload own post images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users update own post images" on storage.objects;
create policy "Users update own post images"
  on storage.objects for update to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own post images" on storage.objects;
create policy "Users delete own post images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'post-images' and (storage.foldername(name))[1] = auth.uid()::text);

do $$
begin
  alter publication supabase_realtime add table public.posts;
exception when duplicate_object then null;
end $$;

commit;
