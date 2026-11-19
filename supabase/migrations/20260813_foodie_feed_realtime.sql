-- Foodie Feed: comments, 24h stories/reels, community profile visibility, realtime.

-- Other foodies' names/avatars must be readable for a public community feed.
drop policy if exists "Authenticated users can view community profiles" on profiles;
create policy "Authenticated users can view community profiles"
  on profiles for select
  to authenticated
  using (true);

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

alter table review_comments enable row level security;

drop policy if exists "Anyone can view review comments" on review_comments;
create policy "Anyone can view review comments"
  on review_comments for select
  using (true);

drop policy if exists "Users can comment on reviews" on review_comments;
create policy "Users can comment on reviews"
  on review_comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own comments" on review_comments;
create policy "Users can delete own comments"
  on review_comments for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can manage review comments" on review_comments;
create policy "Admins can manage review comments"
  on review_comments for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- FEED STORIES / REELS (native + Instagram/Facebook embeds)
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

alter table feed_stories enable row level security;

drop policy if exists "Anyone can view live stories" on feed_stories;
create policy "Anyone can view live stories"
  on feed_stories for select
  using (expires_at > now());

drop policy if exists "Users can post own stories" on feed_stories;
create policy "Users can post own stories"
  on feed_stories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own stories" on feed_stories;
create policy "Users can delete own stories"
  on feed_stories for delete
  using (auth.uid() = user_id);

drop policy if exists "Admins can manage feed stories" on feed_stories;
create policy "Admins can manage feed stories"
  on feed_stories for all
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================
-- STORAGE
-- =============================================
insert into storage.buckets (id, name, public)
values ('feed-stories', 'feed-stories', true)
on conflict (id) do update
  set public = excluded.public;

drop policy if exists "ESR public read feed-stories" on storage.objects;
create policy "ESR public read feed-stories"
  on storage.objects for select
  using (bucket_id = 'feed-stories');

drop policy if exists "ESR auth upload feed-stories" on storage.objects;
create policy "ESR auth upload feed-stories"
  on storage.objects for insert
  with check (bucket_id = 'feed-stories' and auth.uid() is not null);

drop policy if exists "ESR auth update feed-stories" on storage.objects;
create policy "ESR auth update feed-stories"
  on storage.objects for update
  using (bucket_id = 'feed-stories' and auth.uid() is not null);

drop policy if exists "ESR auth delete feed-stories" on storage.objects;
create policy "ESR auth delete feed-stories"
  on storage.objects for delete
  using (bucket_id = 'feed-stories' and auth.uid() is not null);

-- =============================================
-- REALTIME
-- =============================================
alter table reviews replica identity full;
alter table review_likes replica identity full;
alter table review_comments replica identity full;
alter table feed_stories replica identity full;

do $$
begin
  alter publication supabase_realtime add table reviews;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table review_likes;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table review_comments;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table feed_stories;
exception
  when duplicate_object then null;
end $$;
