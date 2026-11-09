-- 0002_security_guards.sql  (2026-11-09, 보고서 TOP 5의 '보안' 항목)
-- 원칙: 지우는 문장(DROP/DELETE/REVOKE) 없이 CREATE / ALTER / CREATE OR REPLACE 만 쓴다.
-- 기존 RLS 정책은 그대로 두고, 열려 있던 구멍은 BEFORE 트리거로 막는다.
--   * 트리거는 current_user 가 authenticated/anon 일 때만 검사한다.
--     SECURITY DEFINER RPC(소유자 postgres)와 service_role(엣지 함수), 대시보드는 자동으로 통과한다.

-- ───────────────────────── 1. 새 칸 ─────────────────────────
alter table public.trips add column if not exists join_locked boolean not null default false;   -- 방장이 새 멤버 입장을 막는 스위치
alter table public.plan_items add column if not exists note text;                                -- 일정 메모 (예약번호 등)

-- ───────────────────────── 2. votes: 비밀투표 조작 방지 ─────────────────────────
-- 전에는 멤버 누구나 option_ids/deadline/ballot_count/closed 를 아무렇게나 UPDATE 할 수 있었다.
create or replace function public.guard_votes() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return coalesce(new, old); end if;
  if tg_op = 'INSERT' then
    new.created_by := public.my_member_id(new.trip_id);   -- 만든 사람은 항상 나
    new.closed := false;
    new.ballot_count := 0;
    if new.deadline < now() then raise exception 'deadline passed'; end if;
    if cardinality(new.option_ids) = 0 then raise exception 'no options'; end if;
    return new;
  end if;
  -- UPDATE: 마감(closed false→true)만 허용. 나머지 칸은 못 바꾼다
  if new.title is distinct from old.title or new.kind is distinct from old.kind or new.option_ids is distinct from old.option_ids
     or new.deadline is distinct from old.deadline or new.ballot_count is distinct from old.ballot_count
     or new.created_by is distinct from old.created_by or new.trip_id is distinct from old.trip_id
     or new.created_at is distinct from old.created_at or new.id is distinct from old.id
     or (old.closed and not new.closed) then
    raise exception 'not allowed';
  end if;
  return new;
end $$;
create or replace trigger votes_guard before insert or update on public.votes
  for each row execute function public.guard_votes();

-- ───────────────────────── 3. members: 이름만 바꿀 수 있다 ─────────────────────────
-- 전에는 "rename self" 정책에 WITH CHECK 가 없어서 user_id/trip_id 까지 바꿀 수 있었다.
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
create or replace trigger members_guard before update on public.members
  for each row execute function public.guard_members();

-- ───────────────────────── 4. trips: 앱에서 직접 UPDATE 금지 ─────────────────────────
-- 제목/도시/초대코드/방장 등은 RPC(set_join_locked 등)로만 바뀐다.
create or replace function public.guard_trips() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  raise exception 'not allowed';
end $$;
create or replace trigger trips_guard before update on public.trips
  for each row execute function public.guard_trips();

-- ───────────────────────── 5. days: 비행기 칸만 바꿀 수 있다 ─────────────────────────
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
create or replace trigger days_guard before insert or update or delete on public.days
  for each row execute function public.guard_days();

-- ───────────────────────── 6. places / plan_items / place_wants: 다른 방 데이터와 섞이지 않게 ─────────────────────────
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
create or replace trigger places_guard before insert or update on public.places
  for each row execute function public.guard_places();

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
create or replace trigger plan_items_guard before insert or update on public.plan_items
  for each row execute function public.guard_plan_items();

create or replace function public.guard_place_wants() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if not exists (select 1 from public.places p where p.id = new.place_id and p.trip_id = new.trip_id) then raise exception 'place not in trip'; end if;
  return new;
end $$;
create or replace trigger place_wants_guard before insert on public.place_wants
  for each row execute function public.guard_place_wants();

-- ───────────────────────── 7. 휴지통: 지운 장소/일정을 30일쯤 되살릴 수 있게 보관 ─────────────────────────
-- (앱에서는 안 보인다. 실수로 지웠을 때 대시보드에서 꺼내 준다)
create table if not exists public.trash (
  id bigint generated always as identity primary key,
  trip_id uuid,
  kind text not null,
  row_id uuid,
  data jsonb not null,
  deleted_by uuid,
  deleted_at timestamptz not null default now()
);
alter table public.trash enable row level security;   -- 정책 없음 = 앱(anon/authenticated)에서는 못 읽고 못 쓴다

create or replace function public.to_trash() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.trash(trip_id, kind, row_id, data, deleted_by)
    values (old.trip_id, tg_table_name, old.id, to_jsonb(old), auth.uid());
  return old;
end $$;
create or replace trigger plan_items_trash before delete on public.plan_items for each row execute function public.to_trash();
create or replace trigger places_trash before delete on public.places for each row execute function public.to_trash();

-- ───────────────────────── 8. RPC 보강 ─────────────────────────
-- cast_ballot: 전원이 투표해서 결과가 열린 뒤에는 표를 못 바꾼다
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
  if voted >= total then raise exception 'vote closed'; end if;   -- 결과가 이미 열림
  if not (p_choice = any(v.option_ids::text[]) or (v.kind = 'yesno' and p_choice in ('yes','no'))) then raise exception 'bad choice'; end if;
  insert into public.ballots(vote_id, member_id, choice) values (p_vote, me, p_choice)
    on conflict (vote_id, member_id) do update set choice = excluded.choice, updated_at = now();
  update public.votes set ballot_count = (select count(*) from public.ballots b where b.vote_id = p_vote) where id = p_vote;
end $$;

-- join_trip: 입장 잠금(join_locked) 존중 + 다른 기기에서 같은 이름으로 들어와 자리를 가져가면 수다방에 알린다
create or replace function public.join_trip(p_code text, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare t uuid; existing uuid; old_uid uuid; locked boolean; nm text;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  nm := trim(p_name);
  if length(nm) < 1 or length(nm) > 20 then raise exception 'bad name'; end if;
  select id, join_locked into t, locked from public.trips where invite_code = upper(trim(p_code));
  if t is null then raise exception 'invalid code'; end if;
  -- 이 기기로 이미 들어온 적이 있으면 이름만 바꾼다
  if exists (select 1 from public.members where trip_id = t and user_id = auth.uid()) then
    update public.members set name = nm where trip_id = t and user_id = auth.uid();
    return t;
  end if;
  -- 같은 이름이 있으면 그 자리를 이어받는다 (아이폰 홈 화면 앱은 사파리와 저장 공간이 달라서 다시 들어오게 된다)
  select id, user_id into existing, old_uid from public.members
    where trip_id = t and lower(replace(name, ' ', '')) = lower(replace(nm, ' ', ''))
    order by joined_at limit 1;
  if existing is not null then
    update public.members set user_id = auth.uid() where id = existing;
    update public.trips set created_by = auth.uid() where id = t and created_by = old_uid;   -- 방장이 기기를 바꿔도 방장 자격 유지
    insert into public.messages(trip_id, member_id, body) values (t, existing, '📱 새 기기에서 다시 들어왔어요');
    return t;
  end if;
  if locked then raise exception 'invalid code'; end if;   -- 막힌 방: 새 멤버는 못 들어온다
  insert into public.members(trip_id, user_id, name) values (t, auth.uid(), nm);
  return t;
end $$;

-- create_trip: 터무니없는 입력 제한 (31일 초과, 긴 제목)
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
grant execute on function public.set_join_locked(uuid, boolean) to authenticated;

-- ───────────────────────── 9. 성능: 외래키 인덱스 ─────────────────────────
create index if not exists ballots_member_id_idx on public.ballots(member_id);
create index if not exists chat_reads_member_id_idx on public.chat_reads(member_id);
create index if not exists messages_member_id_idx on public.messages(member_id);
create index if not exists place_wants_member_id_idx on public.place_wants(member_id);
create index if not exists places_added_by_idx on public.places(added_by);
create index if not exists plan_items_place_id_idx on public.plan_items(place_id);
create index if not exists votes_created_by_idx on public.votes(created_by);
