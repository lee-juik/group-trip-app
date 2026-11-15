-- 0003_together.sql  (2026-11-15, '함께' 탭: 준비물 · 정산 · 사진)
-- 원칙: 새 표만 만든다. 기존 표와 데이터는 건드리지 않는다 (CREATE / ALTER ... ADD 만).

-- ───────────────────────── 1. 준비물 (투두) ─────────────────────────
-- assignee 가 비어 있으면 "각자 챙기기": 멤버마다 체크. 있으면 그 사람 담당: 담당자가 체크하면 끝.
create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  assignee uuid references public.members(id) on delete set null,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists todos_trip_idx on public.todos(trip_id);

create table if not exists public.todo_checks (
  todo_id uuid not null references public.todos(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  checked_at timestamptz not null default now(),
  primary key (todo_id, member_id)
);
create index if not exists todo_checks_trip_idx on public.todo_checks(trip_id);

alter table public.todos enable row level security;
alter table public.todo_checks enable row level security;
create policy "members all todos" on public.todos for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members read checks" on public.todo_checks for select to authenticated using (public.is_trip_member(trip_id));
create policy "own check insert" on public.todo_checks for insert to authenticated with check (member_id = public.my_member_id(trip_id));
create policy "own check delete" on public.todo_checks for delete to authenticated using (member_id = public.my_member_id(trip_id));

-- ───────────────────────── 2. 정산 (쓴 돈) ─────────────────────────
-- amount 는 currency 단위 금액, rate 는 1 단위가 몇 원인지 (원화면 1). 정산은 원화로 계산한다.
-- is_transfer: "정산 송금했어요" 기록 (paid_by 가 split_among[1] 에게 보냄)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'JPY' check (currency in ('JPY','KRW','USD')),
  rate numeric(10,4) not null default 1 check (rate > 0),
  paid_by uuid not null references public.members(id) on delete cascade,
  split_among uuid[] not null check (cardinality(split_among) > 0),
  category text not null default '기타',
  spent_on date not null default current_date,
  is_transfer boolean not null default false,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists expenses_trip_idx on public.expenses(trip_id, spent_on);
alter table public.expenses enable row level security;
create policy "members all expenses" on public.expenses for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

-- ───────────────────────── 3. 사진 ─────────────────────────
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  path text not null,             -- storage 'trip-photos' 버킷 안 경로: <trip_id>/<id>.jpg
  caption text check (caption is null or char_length(caption) <= 300),
  taken_on date not null default current_date,
  place_id uuid references public.places(id) on delete set null,
  width int, height int,
  created_at timestamptz not null default now()
);
create index if not exists photos_trip_idx on public.photos(trip_id, created_at desc);
alter table public.photos enable row level security;
create policy "members read photos" on public.photos for select to authenticated using (public.is_trip_member(trip_id));
create policy "own photo insert" on public.photos for insert to authenticated with check (member_id = public.my_member_id(trip_id));
create policy "own photo update" on public.photos for update to authenticated using (member_id = public.my_member_id(trip_id)) with check (member_id = public.my_member_id(trip_id));
create policy "own photo delete" on public.photos for delete to authenticated using (member_id = public.my_member_id(trip_id));

-- 비공개 버킷: 같은 방 멤버만 읽고 올린다 (경로 첫 폴더 = trip_id)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 10485760, array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do nothing;

create or replace function public.photo_trip(name text) returns uuid
language sql immutable set search_path = '' as $$
  select case when split_part(name, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(name, '/', 1)::uuid end;
$$;
create policy "trip photos read" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and public.is_trip_member(public.photo_trip(name)));
create policy "trip photos upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and public.is_trip_member(public.photo_trip(name)));
create policy "trip photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and owner_id = (select auth.uid())::text);

-- ───────────────────────── 4. 실시간 ─────────────────────────
alter publication supabase_realtime add table public.todos, public.todo_checks, public.expenses, public.photos;
