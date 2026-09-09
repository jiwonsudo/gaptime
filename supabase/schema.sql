-- gaptime / 에브리프리타임 Supabase 스키마

create table if not exists rooms (
  id text primary key,
  day_count int default 5,
  start_hour int not null,
  end_hour int not null,
  expected_size int default 4,
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  room_id text references rooms(id) on delete cascade,
  name text not null,
  occupancy jsonb not null,           -- boolean[][] (day x hour)
  created_at timestamptz default now()
);

create index if not exists submissions_room_id_idx on submissions (room_id);

-- 로그인 없음: 방 링크가 곧 접근 권한. anon 키로 읽기/쓰기 허용.
alter table rooms enable row level security;
alter table submissions enable row level security;

create policy "rooms read" on rooms for select using (true);
create policy "rooms insert" on rooms for insert with check (true);
create policy "submissions read" on submissions for select using (true);
create policy "submissions insert" on submissions for insert with check (true);

-- Realtime
alter publication supabase_realtime add table submissions;
