-- 에브리프리타임 Supabase 스키마 (v2) — 자세한 설계는 DESIGN.md
-- 로그인 없음. 방 링크 = 참여 권한, owner_token = 방장 권한, 닉네임+PIN(선택) = 제출 수정 권한.
-- 모든 쓰기는 security definer RPC로만.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────────────────────
create table if not exists rooms (
  id            text primary key,
  title         text not null default '',
  day_count     int  not null default 5,
  start_hour    int  not null,
  end_hour      int  not null,
  expected_size int  not null default 4,
  locked        boolean not null default false,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '30 days'
);

create table if not exists submissions (
  id           uuid primary key default gen_random_uuid(),
  room_id      text not null references rooms(id) on delete cascade,
  display_name text not null,
  slug         text not null,
  occupancy    jsonb not null,
  created_at   timestamptz not null default now(),
  unique (room_id, slug)
);
create index if not exists submissions_room_id_idx on submissions (room_id);

-- 제출자 수정 권한. 클라이언트가 직접 못 읽음 (RPC 검증 전용).
create table if not exists submission_editors (
  submission_id uuid primary key references submissions(id) on delete cascade,
  room_id       text not null references rooms(id) on delete cascade,
  slug          text not null,
  editor_token  text not null,
  pin_hash      text,
  pin_salt      text,
  unique (room_id, slug)
);

create table if not exists room_secrets (
  room_id       text primary key references rooms(id) on delete cascade,
  owner_token   text not null,
  owner_pin_hash text,
  owner_pin_salt text
);
alter table room_secrets add column if not exists owner_pin_hash text;
alter table room_secrets add column if not exists owner_pin_salt text;

-- ─────────────────────────────────────────────────────────────
-- RLS: 읽기만, 쓰기는 RPC 전용
-- ─────────────────────────────────────────────────────────────
alter table rooms              enable row level security;
alter table submissions        enable row level security;
alter table submission_editors enable row level security;
alter table room_secrets       enable row level security;

drop policy if exists "rooms read" on rooms;
create policy "rooms read" on rooms for select using (expires_at > now());

drop policy if exists "submissions read" on submissions;
create policy "submissions read" on submissions for select using (true);
-- submission_editors / room_secrets: 정책 없음 → 클라이언트 접근 불가

revoke insert, update, delete on rooms              from anon, authenticated;
revoke insert, update, delete on submissions        from anon, authenticated;
revoke all                    on submission_editors from anon, authenticated;
revoke all                    on room_secrets       from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 내부 헬퍼
-- ─────────────────────────────────────────────────────────────
create or replace function _hash_pin(p_pin text, p_salt text)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(extensions.digest(p_salt || ':' || p_pin, 'sha256'), 'hex')
$$;

create or replace function _reserved_slug(p_slug text)
returns boolean language sql immutable as $$
  select lower(p_slug) = any (array[
    'admin','administrator','관리자','운영','운영자','방장','host','owner',
    'system','null','undefined','me','new','api','r'
  ])
$$;

-- ─────────────────────────────────────────────────────────────
-- 방 RPC
-- ─────────────────────────────────────────────────────────────
-- 예전 시그니처 정리 (있으면)
drop function if exists create_room(text,int,int,int,int);
drop function if exists create_room(int,int,int,int);

create or replace function create_room(
  p_title text, p_day_count int, p_start_hour int, p_end_hour int, p_expected_size int,
  p_owner_pin text
) returns table (id text, owner_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_id text; v_token text; v_try int := 0; v_salt text;
begin
  if p_start_hour < 6 or p_end_hour > 24 or p_start_hour >= p_end_hour then
    raise exception '시간 범위가 올바르지 않습니다 (6시~자정)';
  end if;
  if coalesce(p_expected_size, 4) < 2 or p_expected_size > 30 then
    raise exception '예상 인원수는 2~30명이어야 합니다';
  end if;
  if p_owner_pin is not null and p_owner_pin !~ '^\d{4}$' then
    raise exception 'PIN은 숫자 4자리여야 합니다';
  end if;

  loop
    v_id := lower(substr(encode(gen_random_bytes(8), 'hex'), 1, 6));
    exit when not exists (select 1 from rooms r where r.id = v_id);
    v_try := v_try + 1;
    if v_try > 10 then raise exception 'room id 발급 실패'; end if;
  end loop;

  v_token := encode(gen_random_bytes(18), 'hex');
  v_salt  := encode(gen_random_bytes(8), 'hex');

  insert into rooms (id, title, day_count, start_hour, end_hour, expected_size)
    values (v_id, left(coalesce(btrim(p_title), ''), 60),
            coalesce(p_day_count, 5), p_start_hour, p_end_hour, p_expected_size);
  insert into room_secrets (room_id, owner_token, owner_pin_hash, owner_pin_salt)
    values (v_id, v_token,
            case when p_owner_pin is not null then _hash_pin(p_owner_pin, v_salt) end,
            v_salt);

  return query select v_id, v_token;
end $$;

-- 방장이 다른 기기에서 PIN으로 관리 권한 되찾기. 반환: 새 owner_token
create or replace function claim_owner(p_room_id text, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_sec room_secrets;
begin
  select * into v_sec from room_secrets where room_id = p_room_id;
  if not found then raise exception '없는 방입니다'; end if;
  if v_sec.owner_pin_hash is null then
    raise exception '이 방은 방장 PIN이 설정되지 않았어요';
  end if;
  if p_pin is null or _hash_pin(p_pin, v_sec.owner_pin_salt) <> v_sec.owner_pin_hash then
    raise exception 'PIN이 맞지 않습니다';
  end if;
  return v_sec.owner_token;  -- 회전하지 않음: 기존 기기도 계속 방장
end $$;

create or replace function room_has_owner_pin(p_room_id text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select owner_pin_hash is not null from room_secrets where room_id = p_room_id
$$;

-- ─────────────────────────────────────────────────────────────
-- 제출 RPC
-- ─────────────────────────────────────────────────────────────
-- 신규 제출 또는 수정. 다음 중 하나면 수정 허용:
--   * p_editor_token 이 기존 editor_token 과 일치
--   * 기존 제출에 PIN 이 설정돼 있고 p_pin 이 일치
--   * 기존 제출에 PIN 이 없음 (닉네임만으로 수정 — 신뢰 모드)
-- 반환: editor_token (신규/재확인)
create or replace function submit_occupancy(
  p_room_id text, p_display_name text, p_slug text, p_occupancy jsonb,
  p_editor_token text, p_pin text, p_set_pin text
) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_room   rooms;
  v_ed     submission_editors;
  v_sub_id uuid;
  v_token  text;
  v_salt   text;
begin
  select * into v_room from rooms where id = p_room_id;
  if not found then raise exception '존재하지 않는 방입니다'; end if;
  if v_room.expires_at <= now() then raise exception '만료된 방입니다'; end if;
  if v_room.locked then raise exception '방장이 제출을 마감했습니다'; end if;

  if length(coalesce(btrim(p_display_name), '')) < 2 then
    raise exception '이름을 2자 이상 입력해주세요';
  end if;
  if p_slug !~ '^[a-z0-9가-힣_-]{2,20}$' or _reserved_slug(p_slug) then
    raise exception '쓸 수 없는 이름이에요';
  end if;
  if p_set_pin is not null and p_set_pin !~ '^\d{4}$' then
    raise exception 'PIN은 숫자 4자리여야 합니다';
  end if;

  select * into v_ed from submission_editors where room_id = p_room_id and slug = p_slug;

  if found then
    -- 수정 권한 확인
    if p_editor_token is not null and p_editor_token = v_ed.editor_token then
      null; -- ok
    elsif v_ed.pin_hash is not null then
      if p_pin is null or _hash_pin(p_pin, v_ed.pin_salt) <> v_ed.pin_hash then
        raise exception 'PIN이 맞지 않습니다';
      end if;
    end if;
    -- pin_hash 도 없고 토큰도 불일치면: 닉네임만으로 수정 허용(신뢰 모드)

    update submissions set display_name = btrim(p_display_name), occupancy = p_occupancy
      where id = v_ed.submission_id;

    v_token := encode(gen_random_bytes(18), 'hex');
    update submission_editors
      set editor_token = v_token,
          pin_hash = case
            when p_set_pin is not null then _hash_pin(p_set_pin, coalesce(pin_salt, encode(gen_random_bytes(8),'hex')))
            else pin_hash end,
          pin_salt = case
            when p_set_pin is not null then coalesce(pin_salt, encode(gen_random_bytes(8),'hex'))
            else pin_salt end
      where submission_id = v_ed.submission_id;
    return v_token;
  end if;

  -- 신규 제출
  insert into submissions (room_id, display_name, slug, occupancy)
    values (p_room_id, btrim(p_display_name), p_slug, p_occupancy)
    returning id into v_sub_id;

  v_token := encode(gen_random_bytes(18), 'hex');
  v_salt  := encode(gen_random_bytes(8), 'hex');
  insert into submission_editors (submission_id, room_id, slug, editor_token, pin_hash, pin_salt)
    values (v_sub_id, p_room_id, p_slug, v_token,
            case when p_set_pin is not null then _hash_pin(p_set_pin, v_salt) end,
            v_salt);
  return v_token;
end $$;

-- 다른 기기에서 닉네임(+PIN)으로 수정 권한 되찾기. 반환: editor_token 또는 null
create or replace function claim_editor(p_room_id text, p_slug text, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_ed submission_editors; v_token text;
begin
  select * into v_ed from submission_editors where room_id = p_room_id and slug = p_slug;
  if not found then raise exception '그 이름으로 올린 시간표가 없어요'; end if;
  if v_ed.pin_hash is not null then
    if p_pin is null or _hash_pin(p_pin, v_ed.pin_salt) <> v_ed.pin_hash then
      raise exception 'PIN이 맞지 않습니다';
    end if;
  end if;
  v_token := encode(gen_random_bytes(18), 'hex');
  update submission_editors set editor_token = v_token where submission_id = v_ed.submission_id;
  return v_token;
end $$;

-- 이 닉네임에 PIN이 걸려 있는지 (다른 기기 수정 UI 분기용)
create or replace function editor_has_pin(p_room_id text, p_slug text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select pin_hash is not null from submission_editors
   where room_id = p_room_id and slug = p_slug
$$;

create or replace function delete_own_submission(p_room_id text, p_slug text, p_editor_token text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_ed submission_editors;
begin
  select * into v_ed from submission_editors where room_id = p_room_id and slug = p_slug;
  if not found then return; end if;
  if p_editor_token is null or p_editor_token <> v_ed.editor_token then
    raise exception '본인 확인이 안 됩니다';
  end if;
  delete from submissions where id = v_ed.submission_id;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 방장 RPC
-- ─────────────────────────────────────────────────────────────
create or replace function verify_owner(p_room_id text, p_owner_token text)
returns boolean language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from room_secrets where room_id = p_room_id and owner_token = p_owner_token)
$$;

create or replace function delete_submission_as_owner(p_submission_id uuid, p_owner_token text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_room text;
begin
  select room_id into v_room from submissions where id = p_submission_id;
  if not found then return; end if;
  if not verify_owner(v_room, p_owner_token) then raise exception '권한이 없습니다'; end if;
  delete from submissions where id = p_submission_id;
end $$;

create or replace function update_room_as_owner(
  p_room_id text, p_owner_token text, p_expected_size int, p_locked boolean
) returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not verify_owner(p_room_id, p_owner_token) then raise exception '권한이 없습니다'; end if;
  if p_expected_size is not null and (p_expected_size < 2 or p_expected_size > 30) then
    raise exception '예상 인원수는 2~30명이어야 합니다';
  end if;
  update rooms set
    expected_size = coalesce(p_expected_size, expected_size),
    locked        = coalesce(p_locked, locked)
  where id = p_room_id;
end $$;

create or replace function delete_room_as_owner(p_room_id text, p_owner_token text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not verify_owner(p_room_id, p_owner_token) then raise exception '권한이 없습니다'; end if;
  delete from rooms where id = p_room_id;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 실행 권한
-- ─────────────────────────────────────────────────────────────
grant execute on function create_room(text,int,int,int,int,text)                 to anon, authenticated;
grant execute on function claim_owner(text,text)                                 to anon, authenticated;
grant execute on function room_has_owner_pin(text)                               to anon, authenticated;
grant execute on function submit_occupancy(text,text,text,jsonb,text,text,text)  to anon, authenticated;
grant execute on function claim_editor(text,text,text)                           to anon, authenticated;
grant execute on function editor_has_pin(text,text)                              to anon, authenticated;
grant execute on function delete_own_submission(text,text,text)                  to anon, authenticated;
grant execute on function verify_owner(text,text)                                to anon, authenticated;
grant execute on function delete_submission_as_owner(uuid,text)                  to anon, authenticated;
grant execute on function update_room_as_owner(text,text,int,boolean)            to anon, authenticated;
grant execute on function delete_room_as_owner(text,text)                        to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'submissions'
  ) then
    alter publication supabase_realtime add table submissions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table rooms;
  end if;
end $$;

-- (선택) 만료된 방 정리 — pg_cron 필요
-- select cron.schedule('gaptime-purge', '0 4 * * *', $$delete from rooms where expires_at <= now()$$);
