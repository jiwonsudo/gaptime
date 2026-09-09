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
  host_name     text not null default '',
  day_count     int  not null default 5,
  start_hour    int  not null,
  end_hour      int  not null,
  slot_minutes  int  not null default 60,   -- 60(1시간) 또는 30(30분)
  expected_size int  not null default 4,
  locked        boolean not null default false,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '14 days'
);
alter table rooms add column if not exists slot_minutes int not null default 60;

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
  submission_id  uuid primary key references submissions(id) on delete cascade,
  room_id        text not null references rooms(id) on delete cascade,
  slug           text not null,
  editor_token   text not null,
  pin_hash       text,
  pin_salt       text,
  pin_fails      int not null default 0,
  pin_lock_until timestamptz,
  unique (room_id, slug)
);
alter table submission_editors add column if not exists pin_fails int not null default 0;
alter table submission_editors add column if not exists pin_lock_until timestamptz;

create table if not exists room_secrets (
  room_id        text primary key references rooms(id) on delete cascade,
  owner_token    text not null,
  owner_pin_hash text,
  owner_pin_salt text,
  pin_fails      int not null default 0,
  pin_lock_until timestamptz
);
alter table room_secrets add column if not exists owner_pin_hash text;
alter table room_secrets add column if not exists owner_pin_salt text;
alter table room_secrets add column if not exists pin_fails int not null default 0;
alter table room_secrets add column if not exists pin_lock_until timestamptz;

-- 익명 사용 통계 (방/제출이 삭제돼도 유지). 개인 식별 정보 없음.
create table if not exists usage_events (
  id           bigint generated always as identity primary key,
  kind         text not null,           -- 'room_created' | 'submission'
  room_id      text,                    -- FK 아님(삭제돼도 남김)
  day_count    int,
  expected_size int,
  weekend      boolean,
  at           timestamptz not null default now()
);

alter table rooms add column if not exists host_name text not null default '';

-- 방 생성 남용 방지용 카운터 (클라이언트 접근 불가)
create table if not exists create_throttle (
  bucket       text primary key,           -- 'global' 또는 'ip:<addr>'
  count        int not null default 0,
  window_start timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- RLS: 읽기만, 쓰기는 RPC 전용
-- ─────────────────────────────────────────────────────────────
alter table rooms              enable row level security;
alter table submissions        enable row level security;
alter table submission_editors enable row level security;
alter table room_secrets       enable row level security;
alter table usage_events       enable row level security;
alter table create_throttle    enable row level security;

drop policy if exists "rooms read" on rooms;
create policy "rooms read" on rooms for select using (expires_at > now());

drop policy if exists "submissions read" on submissions;
create policy "submissions read" on submissions for select using (true);
-- submission_editors / room_secrets: 정책 없음 → 클라이언트 접근 불가

revoke insert, update, delete on rooms              from anon, authenticated;
revoke insert, update, delete on submissions        from anon, authenticated;
revoke all                    on submission_editors from anon, authenticated;
revoke all                    on room_secrets       from anon, authenticated;
revoke all                    on usage_events       from anon, authenticated;
revoke all                    on create_throttle    from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 내부 헬퍼
-- ─────────────────────────────────────────────────────────────
create or replace function _hash_pin(p_pin text, p_salt text)
returns text language sql immutable set search_path = pg_catalog, extensions as $$
  select encode(extensions.digest(p_salt || ':' || p_pin, 'sha256'), 'hex')
$$;

create or replace function _reserved_slug(p_slug text)
returns boolean language sql immutable set search_path = pg_catalog as $$
  select lower(p_slug) = any (array[
    'admin','administrator','관리자','운영','운영자','방장','host','owner',
    'system','null','undefined','me','new','api','room','privacy'
  ])
$$;

-- PIN 무차별 대입 방지: 5회 실패 시 15분 잠금
create or replace function _pin_locked(p_lock_until timestamptz)
returns boolean language sql stable set search_path = pg_catalog as $$
  select p_lock_until is not null and p_lock_until > now()
$$;

-- 슬라이딩 카운터. 창(window) 안에서 limit 초과면 예외.
create or replace function _bump_throttle(p_bucket text, p_limit int, p_window interval)
returns void language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_count int;
begin
  insert into create_throttle (bucket, count, window_start)
    values (p_bucket, 1, now())
  on conflict (bucket) do update set
    count = case when create_throttle.window_start < now() - p_window then 1
                 else create_throttle.count + 1 end,
    window_start = case when create_throttle.window_start < now() - p_window then now()
                        else create_throttle.window_start end
  returning count into v_count;
  if v_count > p_limit then
    raise exception '잠시 후 다시 시도해주세요 (방 생성이 너무 많아요)';
  end if;
end $$;

-- PostgREST 가 전달하는 클라이언트 IP (best-effort)
create or replace function _client_ip()
returns text language sql stable set search_path = pg_catalog as $$
  select coalesce(
    nullif(current_setting('request.headers', true)::json ->> 'cf-connecting-ip', ''),
    nullif(current_setting('request.headers', true)::json ->> 'x-real-ip', ''),
    split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''), ',', 1),
    'unknown'
  )
$$;

-- ─────────────────────────────────────────────────────────────
-- 방 RPC
-- ─────────────────────────────────────────────────────────────
-- 예전 시그니처 정리 (있으면)
drop function if exists create_room(text,int,int,int,int);
drop function if exists create_room(int,int,int,int);
drop function if exists create_room(text,int,int,int,int,text);
drop function if exists create_room(text,text,int,int,int,int,text);

create or replace function create_room(
  p_title text, p_host_name text, p_day_count int, p_start_hour int, p_end_hour int,
  p_expected_size int, p_owner_pin text, p_slot_minutes int
) returns table (id text, owner_token text)
language plpgsql security definer set search_path = public, extensions as $$
declare v_id text; v_token text; v_try int := 0; v_salt text;
begin
  if p_start_hour < 8 or p_end_hour > 24 or p_start_hour >= p_end_hour then
    raise exception '시간 범위가 올바르지 않습니다 (8시~자정)';
  end if;
  if coalesce(p_expected_size, 4) < 2 or p_expected_size > 30 then
    raise exception '예상 인원수는 2~30명이어야 합니다';
  end if;
  if p_owner_pin is not null and p_owner_pin !~ '^\d{4}$' then
    raise exception 'PIN은 숫자 4자리여야 합니다';
  end if;
  if coalesce(p_day_count, 5) not in (5, 7) then
    raise exception '요일 수는 5 또는 7이어야 합니다';
  end if;
  if coalesce(p_slot_minutes, 60) not in (30, 60) then
    raise exception '시간 단위는 30분 또는 60분이어야 합니다';
  end if;

  -- 방 생성 남용 방지: IP당 시간당 20개, 전체 시간당 500개
  perform _bump_throttle('ip:' || _client_ip(), 20, interval '1 hour');
  perform _bump_throttle('global', 500, interval '1 hour');

  -- room id = 접근 자격이므로 추측 불가하게 8 hex (32비트)
  loop
    v_id := lower(substr(encode(gen_random_bytes(16), 'hex'), 1, 8));
    -- 문서/플레이스홀더에 쓰는 예시 코드는 실제로 발급하지 않는다
    if v_id not in ('ab3f9k', '7f3a9c2e') and not exists (select 1 from rooms r where r.id = v_id) then
      exit;
    end if;
    v_try := v_try + 1;
    if v_try > 10 then raise exception 'room id 발급 실패'; end if;
  end loop;

  v_token := encode(gen_random_bytes(18), 'hex');
  v_salt  := encode(gen_random_bytes(8), 'hex');

  insert into rooms (id, title, host_name, day_count, start_hour, end_hour, slot_minutes, expected_size)
    values (v_id, left(coalesce(btrim(p_title), ''), 60), left(coalesce(btrim(p_host_name), ''), 20),
            coalesce(p_day_count, 5), p_start_hour, p_end_hour,
            coalesce(p_slot_minutes, 60), p_expected_size);
  insert into room_secrets (room_id, owner_token, owner_pin_hash, owner_pin_salt)
    values (v_id, v_token,
            case when p_owner_pin is not null then _hash_pin(p_owner_pin, v_salt) end,
            v_salt);

  insert into usage_events (kind, room_id, day_count, expected_size, weekend)
    values ('room_created', v_id, coalesce(p_day_count, 5), p_expected_size, coalesce(p_day_count, 5) >= 7);

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
  if _pin_locked(v_sec.pin_lock_until) then
    raise exception 'PIN 시도가 너무 많아요. 잠시 후 다시 시도해주세요';
  end if;
  if p_pin is null or _hash_pin(p_pin, v_sec.owner_pin_salt) <> v_sec.owner_pin_hash then
    update room_secrets set
      pin_fails = pin_fails + 1,
      pin_lock_until = case when pin_fails + 1 >= 5 then now() + interval '15 minutes' else pin_lock_until end
      where room_id = p_room_id;
    raise exception 'PIN이 맞지 않습니다';
  end if;
  update room_secrets set pin_fails = 0, pin_lock_until = null where room_id = p_room_id;
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

  -- occupancy 구조/크기 검증 (저장 남용 방지)
  if jsonb_typeof(p_occupancy) <> 'array'
     or jsonb_array_length(p_occupancy) <> v_room.day_count
     or pg_column_size(p_occupancy) > 8000 then
    raise exception '시간표 데이터 형식이 올바르지 않습니다';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_occupancy) e
    where jsonb_typeof(e) <> 'array'
       or jsonb_array_length(e) <> ((v_room.end_hour - v_room.start_hour) * 60 / v_room.slot_minutes)
  ) then
    raise exception '시간표 데이터 형식이 올바르지 않습니다';
  end if;

  select * into v_ed from submission_editors where room_id = p_room_id and slug = p_slug;

  if found then
    -- 수정 권한 확인
    if p_editor_token is not null and p_editor_token = v_ed.editor_token then
      null; -- ok
    elsif v_ed.pin_hash is not null then
      if _pin_locked(v_ed.pin_lock_until) then
        raise exception 'PIN 시도가 너무 많아요. 잠시 후 다시 시도해주세요';
      end if;
      if p_pin is null or _hash_pin(p_pin, v_ed.pin_salt) <> v_ed.pin_hash then
        update submission_editors set
          pin_fails = pin_fails + 1,
          pin_lock_until = case when pin_fails + 1 >= 5 then now() + interval '15 minutes' else pin_lock_until end
          where submission_id = v_ed.submission_id;
        raise exception 'PIN이 맞지 않습니다';
      end if;
    end if;
    -- pin_hash 도 없고 토큰도 불일치면: 닉네임만으로 수정 허용(신뢰 모드)

    update submissions set display_name = btrim(p_display_name), occupancy = p_occupancy
      where id = v_ed.submission_id;

    -- PIN 을 새로/다시 설정하는 경우 salt 를 한 번만 계산 (해시-salt 불일치 방지)
    if p_set_pin is not null then
      v_salt := coalesce(v_ed.pin_salt, encode(gen_random_bytes(8), 'hex'));
    end if;

    v_token := encode(gen_random_bytes(18), 'hex');
    update submission_editors
      set editor_token = v_token,
          pin_fails = 0,
          pin_lock_until = null,
          pin_hash = case when p_set_pin is not null then _hash_pin(p_set_pin, v_salt) else pin_hash end,
          pin_salt = case when p_set_pin is not null then v_salt else pin_salt end
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

  insert into usage_events (kind, room_id) values ('submission', p_room_id);
  return v_token;
end $$;

-- 다른 기기에서 닉네임(+PIN)으로 수정 권한 되찾기. 반환: editor_token 또는 null
create or replace function claim_editor(p_room_id text, p_slug text, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_ed submission_editors; v_token text;
begin
  select * into v_ed from submission_editors where room_id = p_room_id and slug = p_slug;
  if not found then raise exception '그 이름으로 올린 시간표가 없어요'; end if;

  -- PIN 미설정(신뢰 모드): 토큰을 회전하지 않고 그대로 반환
  --   (회전하면 트롤이 반복 호출로 원 사용자의 로컬 토큰을 무효화할 수 있음)
  if v_ed.pin_hash is null then
    return v_ed.editor_token;
  end if;

  if _pin_locked(v_ed.pin_lock_until) then
    raise exception 'PIN 시도가 너무 많아요. 잠시 후 다시 시도해주세요';
  end if;
  if p_pin is null or _hash_pin(p_pin, v_ed.pin_salt) <> v_ed.pin_hash then
    update submission_editors set
      pin_fails = pin_fails + 1,
      pin_lock_until = case when pin_fails + 1 >= 5 then now() + interval '15 minutes' else pin_lock_until end
      where submission_id = v_ed.submission_id;
    raise exception 'PIN이 맞지 않습니다';
  end if;

  v_token := encode(gen_random_bytes(18), 'hex');
  update submission_editors set
    editor_token = v_token, pin_fails = 0, pin_lock_until = null
    where submission_id = v_ed.submission_id;
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

drop function if exists update_room_as_owner(text,text,int,boolean);
drop function if exists update_room_as_owner(text,text,int,boolean,text);
drop function if exists update_room_as_owner(text,text,int,boolean,text,int);
drop function if exists update_room_as_owner(text,text,int,boolean,text,int,int);
create or replace function update_room_as_owner(
  p_room_id text, p_owner_token text, p_expected_size int, p_locked boolean,
  p_title text, p_day_count int, p_slot_minutes int, p_start_hour int, p_end_hour int
) returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_has_subs boolean; v_grid_change boolean;
begin
  if not verify_owner(p_room_id, p_owner_token) then raise exception '권한이 없습니다'; end if;
  if p_expected_size is not null and (p_expected_size < 2 or p_expected_size > 30) then
    raise exception '인원수는 2~30명이어야 합니다';
  end if;
  if p_day_count is not null and p_day_count not in (5, 7) then
    raise exception '요일 수는 5(월~금) 또는 7(월~일)만 됩니다';
  end if;
  if p_slot_minutes is not null and p_slot_minutes not in (30, 60) then
    raise exception '시간 단위는 30분 또는 60분이어야 합니다';
  end if;
  if p_start_hour is not null and (p_start_hour < 8 or p_start_hour > 22) then
    raise exception '시작 시각이 올바르지 않습니다';
  end if;
  if p_end_hour is not null and (p_end_hour > 24 or p_end_hour < 9) then
    raise exception '종료 시각이 올바르지 않습니다';
  end if;
  if p_title is not null and btrim(p_title) = '' then
    raise exception '방 이름은 비울 수 없습니다';
  end if;

  -- 격자 모양(요일 수 / 시간 단위 / 시간 범위)을 바꾸면 기존 occupancy 가 깨진다
  v_grid_change := p_day_count is not null or p_slot_minutes is not null
                   or p_start_hour is not null or p_end_hour is not null;
  if v_grid_change then
    select exists (select 1 from submissions where room_id = p_room_id) into v_has_subs;
    if v_has_subs then
      raise exception '이미 올린 시간표가 있어 요일·시간 설정은 바꿀 수 없어요';
    end if;
  end if;

  update rooms set
    expected_size = coalesce(p_expected_size, expected_size),
    locked        = coalesce(p_locked, locked),
    title         = coalesce(left(btrim(p_title), 60), title),
    day_count     = coalesce(p_day_count, day_count),
    slot_minutes  = coalesce(p_slot_minutes, slot_minutes),
    start_hour    = coalesce(p_start_hour, start_hour),
    end_hour      = coalesce(p_end_hour, end_hour)
  where id = p_room_id;

  if (select start_hour >= end_hour from rooms where id = p_room_id) then
    raise exception '시작 시각이 종료 시각보다 빨라야 합니다';
  end if;
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
grant execute on function create_room(text,text,int,int,int,int,text,int)        to anon, authenticated;
grant execute on function claim_owner(text,text)                                 to anon, authenticated;
grant execute on function room_has_owner_pin(text)                               to anon, authenticated;
grant execute on function submit_occupancy(text,text,text,jsonb,text,text,text)  to anon, authenticated;
grant execute on function claim_editor(text,text,text)                           to anon, authenticated;
grant execute on function editor_has_pin(text,text)                              to anon, authenticated;
grant execute on function delete_own_submission(text,text,text)                  to anon, authenticated;
grant execute on function verify_owner(text,text)                                to anon, authenticated;
grant execute on function delete_submission_as_owner(uuid,text)                  to anon, authenticated;
grant execute on function update_room_as_owner(text,text,int,boolean,text,int,int,int,int) to anon, authenticated;
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

-- ─────────────────────────────────────────────────────────────
-- 자동 정리 (pg_cron) — 대시보드 Database > Extensions 에서 pg_cron 활성화 필요
-- ─────────────────────────────────────────────────────────────
create or replace function _gaptime_purge()
returns void language sql security definer set search_path = public, pg_catalog as $$
  delete from rooms where expires_at <= now();
  delete from usage_events where at < now() - interval '90 days';
  delete from create_throttle where window_start < now() - interval '2 hours';
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'gaptime-purge') then
      perform cron.unschedule('gaptime-purge');
    end if;
    perform cron.schedule('gaptime-purge', '17 * * * *', 'select _gaptime_purge()');
  else
    raise notice 'pg_cron 미설치 — 자동 정리 스킵. Extensions 에서 활성화 후 이 파일 재실행.';
  end if;
end $$;
