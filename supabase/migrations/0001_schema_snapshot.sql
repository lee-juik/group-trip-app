-- 0001_schema_snapshot.sql
-- Supabase 프로젝트 wtothatrncfccghnswny 의 DB 구조 백업 (2026-11-09, 0002 적용 후 pg_catalog 에서 뽑아 정리).
-- 데이터는 없고 구조(표, 정책, 함수, 트리거, 인덱스)만 담겨 있다.
-- 프로젝트가 날아갔을 때 새 프로젝트의 SQL 편집기에서 이 파일을 그대로 실행하면 같은 구조가 만들어진다.
-- (익명 로그인은 대시보드 Authentication → Providers → Anonymous 에서 따로 켜야 한다)

-- ───────────────────────── 표 ─────────────────────────
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  city text not null,
  start_date date not null,
  end_date date not null,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  join_locked boolean not null default false,
  constraint trips_check check (end_date >= start_date)
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  name text not null constraint members_name_check check (char_length(name) >= 1 and char_length(name) <= 20),
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);
create index if not exists members_user_id_idx on public.members(user_id);

create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  category text not null constraint places_category_check check (category in ('맛집','카페','관광지','숙소','교통','쇼핑')),
  summary text not null default '',
  area text not null default '',
  source_url text,
  emoji text,
  added_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  lat double precision,
  lng double precision
);
create index if not exists places_trip_id_idx on public.places(trip_id);
create index if not exists places_added_by_idx on public.places(added_by);

create table if not exists public.place_wants (
  place_id uuid not null references public.places(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  trip_id uuid not null references public.trips(id) on delete cascade,
  primary key (place_id, member_id)
);
create index if not exists place_wants_trip_id_idx on public.place_wants(trip_id);
create index if not exists place_wants_member_id_idx on public.place_wants(member_id);

create table if not exists public.votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  kind text not null constraint votes_kind_check check (kind in ('single','yesno')),
  option_ids uuid[] not null,
  deadline timestamptz not null,
  closed boolean not null default false,
  ballot_count integer not null default 0,
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists votes_trip_id_idx on public.votes(trip_id);
create index if not exists votes_created_by_idx on public.votes(created_by);

create table if not exists public.ballots (
  vote_id uuid not null references public.votes(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  choice text not null,
  updated_at timestamptz not null default now(),
  primary key (vote_id, member_id)
);
create index if not exists ballots_member_id_idx on public.ballots(member_id);

create table if not exists public.days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  date date not null,
  outbound jsonb,
  inbound jsonb,
  unique (trip_id, date)
);

create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  day_id uuid not null references public.days(id) on delete cascade,
  time text not null,
  title text not null,
  place_id uuid references public.places(id) on delete set null,
  transit_in jsonb,
  created_at timestamptz not null default now(),
  note text
);
create index if not exists plan_items_day_id_idx on public.plan_items(day_id);
create index if not exists plan_items_trip_id_idx on public.plan_items(trip_id);
create index if not exists plan_items_place_id_idx on public.plan_items(place_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  body text not null constraint messages_body_check check (char_length(body) >= 1 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists messages_trip_created on public.messages(trip_id, created_at desc);
create index if not exists messages_member_id_idx on public.messages(member_id);

create table if not exists public.chat_reads (
  trip_id uuid not null references public.trips(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (trip_id, member_id)
);
create index if not exists chat_reads_member_id_idx on public.chat_reads(member_id);

-- 휴지통 (지운 장소/일정 보관, 앱에서는 안 보임)
create table if not exists public.trash (
  id bigint generated always as identity primary key,
  trip_id uuid,
  kind text not null,
  row_id uuid,
  data jsonb not null,
  deleted_by uuid,
  deleted_at timestamptz not null default now()
);

-- ───────────────────────── RLS ─────────────────────────
alter table public.trips enable row level security;
alter table public.members enable row level security;
alter table public.places enable row level security;
alter table public.place_wants enable row level security;
alter table public.votes enable row level security;
alter table public.ballots enable row level security;
alter table public.days enable row level security;
alter table public.plan_items enable row level security;
alter table public.messages enable row level security;
alter table public.chat_reads enable row level security;
alter table public.trash enable row level security;   -- 정책 없음: 앱에서는 접근 불가

-- 도우미 (SECURITY DEFINER: members 표의 RLS 를 거치지 않고 "같은 방 멤버인지"만 답한다)
create or replace function public.is_trip_member(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members m where m.trip_id = t and m.user_id = auth.uid());
$$;
create or replace function public.my_member_id(t uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.members m where m.trip_id = t and m.user_id = auth.uid();
$$;

create policy "members read trip"   on public.trips for select to authenticated using (public.is_trip_member(id));
create policy "members update trip" on public.trips for update to authenticated using (public.is_trip_member(id));   -- 실제로는 trips_guard 트리거가 막는다

create policy "members read members" on public.members for select to authenticated using (public.is_trip_member(trip_id));
create policy "rename self"          on public.members for update to authenticated using (user_id = (select auth.uid()));   -- members_guard: 이름만

create policy "members all places" on public.places for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members all items"  on public.plan_items for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "members all days"   on public.days for all to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));   -- days_guard: 비행기 칸만

create policy "members read wants" on public.place_wants for select to authenticated using (public.is_trip_member(trip_id));
create policy "own wants insert"   on public.place_wants for insert to authenticated with check (member_id = public.my_member_id(trip_id));
create policy "own wants delete"   on public.place_wants for delete to authenticated using (member_id = public.my_member_id(trip_id));

create policy "members read votes"   on public.votes for select to authenticated using (public.is_trip_member(trip_id));
create policy "members create votes" on public.votes for insert to authenticated with check (public.is_trip_member(trip_id));
create policy "members update votes" on public.votes for update to authenticated using (public.is_trip_member(trip_id));   -- votes_guard: 마감만

create policy "read own ballot" on public.ballots for select to authenticated
  using (member_id in (select m.id from public.members m where m.user_id = (select auth.uid())));

create policy "members read chat"    on public.messages for select to authenticated using (public.is_trip_member(trip_id));
create policy "members send as self" on public.messages for insert to authenticated with check (public.is_trip_member(trip_id) and member_id = public.my_member_id(trip_id));
create policy "delete own message"   on public.messages for delete to authenticated using (member_id = public.my_member_id(trip_id));

create policy "members see reads" on public.chat_reads for select to authenticated using (public.is_trip_member(trip_id));
create policy "write own read"    on public.chat_reads for insert to authenticated with check (member_id = public.my_member_id(trip_id));
create policy "update own read"   on public.chat_reads for update to authenticated using (member_id = public.my_member_id(trip_id)) with check (member_id = public.my_member_id(trip_id));

-- ───────────────────────── RPC ─────────────────────────
create or replace function public.create_trip(p_title text, p_city text, p_start date, p_end date, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid; d date;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_end < p_start or p_end - p_start > 31 then raise exception 'bad dates'; end if;
  if length(trim(p_title)) < 1 or length(trim(p_title)) > 60 or length(trim(p_city)) < 1 or length(trim(p_city)) > 40 then raise exception 'bad input'; end if;
  if length(trim(p_name)) < 1 or length(trim(p_name)) > 20 then raise exception 'bad name'; end if;
  insert into public.trips(title, city, start_date, end_date, created_by) values (trim(p_title), trim(p_city), p_start, p_end, auth.uid()) returning id into t;
  insert into public.members(trip_id, user_id, name) values (t, auth.uid(), trim(p_name));
  d := p_start;
  while d <= p_end loop
    insert into public.days(trip_id, date) values (t, d);
    d := d + 1;
  end loop;
  return t;
end $$;

create or replace function public.join_trip(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid; existing uuid; old_uid uuid; locked boolean; nm text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  nm := trim(p_name);
  if length(nm) < 1 or length(nm) > 20 then raise exception 'bad name'; end if;
  select id, join_locked into t, locked from public.trips where invite_code = upper(trim(p_code));
  if t is null then raise exception 'invalid code'; end if;
  if exists (select 1 from public.members where trip_id = t and user_id = auth.uid()) then
    update public.members set name = nm where trip_id = t and user_id = auth.uid();
    return t;
  end if;
  select id, user_id into existing, old_uid from public.members
    where trip_id = t and lower(replace(name, ' ', '')) = lower(replace(nm, ' ', ''))
    order by joined_at limit 1;
  if existing is not null then
    update public.members set user_id = auth.uid() where id = existing;
    update public.trips set created_by = auth.uid() where id = t and created_by = old_uid;   -- 방장이 기기를 바꿔도 방장 자격 유지
    insert into public.messages(trip_id, member_id, body) values (t, existing, '📱 새 기기에서 다시 들어왔어요');
    return t;
  end if;
  if locked then raise exception 'invalid code'; end if;
  insert into public.members(trip_id, user_id, name) values (t, auth.uid(), nm);
  return t;
end $$;

-- set_join_locked: 방장만 입장을 막거나 연다.
-- 방장 = 방을 만든 사람. 그 사람이 멤버 목록에 없으면(기기를 바꿨거나 created_by 가 비어 있으면) 가장 먼저 들어온 사람 (앱·엣지 함수와 같은 규칙)
create or replace function public.set_join_locked(p_trip uuid, p_locked boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare host uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select coalesce(
    (select m.user_id from public.members m join public.trips t on t.id = m.trip_id where t.id = p_trip and m.user_id = t.created_by),
    (select m.user_id from public.members m where m.trip_id = p_trip order by m.joined_at limit 1)) into host;
  if host is null or host <> auth.uid() then raise exception 'not host'; end if;
  update public.trips set join_locked = p_locked where id = p_trip;
end $$;

create or replace function public.cast_ballot(p_vote uuid, p_choice text) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.votes; me uuid; total int; voted int;
begin
  select * into v from public.votes where id = p_vote;
  if v.id is null then raise exception 'no vote'; end if;
  if v.closed or v.deadline < now() then raise exception 'vote closed'; end if;
  me := public.my_member_id(v.trip_id);
  if me is null then raise exception 'not a member'; end if;
  select count(*) into total from public.members where trip_id = v.trip_id;
  select count(*) into voted from public.ballots where vote_id = p_vote;
  if voted >= total then raise exception 'vote closed'; end if;
  if not (p_choice = any(v.option_ids::text[]) or (v.kind = 'yesno' and p_choice in ('yes','no'))) then raise exception 'bad choice'; end if;
  insert into public.ballots(vote_id, member_id, choice) values (p_vote, me, p_choice)
    on conflict (vote_id, member_id) do update set choice = excluded.choice, updated_at = now();
  update public.votes set ballot_count = (select count(*) from public.ballots b where b.vote_id = p_vote) where id = p_vote;
end $$;

create or replace function public.vote_status(p_trip uuid)
returns table(vote_id uuid, voted_member_ids uuid[], my_choice text, counts jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare me uuid; total int;
begin
  if not public.is_trip_member(p_trip) then raise exception 'not a member'; end if;
  me := public.my_member_id(p_trip);
  select count(*) into total from public.members where trip_id = p_trip;
  return query
    select v.id,
      coalesce(array_agg(b.member_id) filter (where b.member_id is not null), '{}'),
      max(b.choice) filter (where b.member_id = me),
      case when v.closed or v.deadline < now() or count(b.member_id) >= total
        then coalesce(jsonb_object_agg(b.choice, 1) filter (where false), '{}'::jsonb) || coalesce((
          select jsonb_object_agg(x.choice, x.n) from (select b2.choice, count(*) n from public.ballots b2 where b2.vote_id = v.id group by b2.choice) x), '{}'::jsonb)
        else null end
    from public.votes v left join public.ballots b on b.vote_id = v.id
    where v.trip_id = p_trip
    group by v.id;
end $$;

grant execute on function public.is_trip_member(uuid), public.my_member_id(uuid), public.create_trip(text, text, date, date, text),
  public.join_trip(text, text), public.set_join_locked(uuid, boolean), public.cast_ballot(uuid, text), public.vote_status(uuid) to authenticated;

-- ───────────────────────── 트리거 가드 (자세한 설명은 0002_security_guards.sql) ─────────────────────────
create or replace function public.guard_votes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    new.created_by := public.my_member_id(new.trip_id);
    new.closed := false;
    new.ballot_count := 0;
    if new.deadline < now() then raise exception 'deadline passed'; end if;
    if cardinality(new.option_ids) = 0 then raise exception 'no options'; end if;
    return new;
  end if;
  if new.title is distinct from old.title or new.kind is distinct from old.kind or new.option_ids is distinct from old.option_ids
     or new.deadline is distinct from old.deadline or new.ballot_count is distinct from old.ballot_count
     or new.created_by is distinct from old.created_by or new.trip_id is distinct from old.trip_id
     or new.created_at is distinct from old.created_at or new.id is distinct from old.id
     or (old.closed and not new.closed) then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create or replace trigger votes_guard before insert or update on public.votes for each row execute function public.guard_votes();

create or replace function public.guard_members() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if new.id is distinct from old.id or new.trip_id is distinct from old.trip_id
     or new.user_id is distinct from old.user_id or new.joined_at is distinct from old.joined_at then
    raise exception 'not allowed';
  end if;
  if length(trim(new.name)) < 1 then raise exception 'bad name'; end if;
  return new;
end $$;
create or replace trigger members_guard before update on public.members for each row execute function public.guard_members();

create or replace function public.guard_trips() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  raise exception 'not allowed';
end $$;
create or replace trigger trips_guard before update on public.trips for each row execute function public.guard_trips();

create or replace function public.guard_days() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return coalesce(new, old); end if;
  if tg_op <> 'UPDATE' then raise exception 'not allowed'; end if;
  if new.id is distinct from old.id or new.trip_id is distinct from old.trip_id or new.date is distinct from old.date then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create or replace trigger days_guard before insert or update or delete on public.days for each row execute function public.guard_days();

create or replace function public.guard_places() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.added_by := public.my_member_id(new.trip_id);
    return new;
  end if;
  if new.id is distinct from old.id or new.trip_id is distinct from old.trip_id
     or new.added_by is distinct from old.added_by or new.created_at is distinct from old.created_at then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create or replace trigger places_guard before insert or update on public.places for each row execute function public.guard_places();

create or replace function public.guard_plan_items() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'UPDATE' and (new.id is distinct from old.id or new.trip_id is distinct from old.trip_id) then raise exception 'not allowed'; end if;
  if not exists (select 1 from public.days d where d.id = new.day_id and d.trip_id = new.trip_id) then raise exception 'day not in trip'; end if;
  if new.place_id is not null and not exists (select 1 from public.places p where p.id = new.place_id and p.trip_id = new.trip_id) then
    raise exception 'place not in trip';
  end if;
  return new;
end $$;
create or replace trigger plan_items_guard before insert or update on public.plan_items for each row execute function public.guard_plan_items();

create or replace function public.guard_place_wants() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if not exists (select 1 from public.places p where p.id = new.place_id and p.trip_id = new.trip_id) then raise exception 'place not in trip'; end if;
  return new;
end $$;
create or replace trigger place_wants_guard before insert on public.place_wants for each row execute function public.guard_place_wants();

create or replace function public.to_trash() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trash(trip_id, kind, row_id, data, deleted_by)
    values (old.trip_id, tg_table_name, old.id, to_jsonb(old), auth.uid());
  return old;
end $$;
create or replace trigger plan_items_trash before delete on public.plan_items for each row execute function public.to_trash();
create or replace trigger places_trash before delete on public.places for each row execute function public.to_trash();

-- ───────────────────────── 실시간 ─────────────────────────
-- 앱이 postgres_changes 로 구독하는 표 (ballots 는 비밀이라 빼놓음)
alter publication supabase_realtime add table public.trips, public.members, public.places, public.place_wants, public.votes, public.days, public.plan_items, public.messages, public.chat_reads;

-- ───────────────────────── 엣지 함수 ─────────────────────────
-- remove-member (supabase/functions/remove-member): service role 로 멤버를 지운다. 호출자가 방장인지 서버에서 확인.
-- 배포: npx supabase functions deploy remove-member
