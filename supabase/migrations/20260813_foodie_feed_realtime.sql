-- Community comments and realtime support.

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
-- REALTIME
-- =============================================
alter table reviews replica identity full;
alter table review_likes replica identity full;
alter table review_comments replica identity full;

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
