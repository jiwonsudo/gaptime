-- 개발 중 스키마를 갈아엎을 때만 사용. 모든 방/제출 데이터가 사라진다.
-- 이 파일을 먼저 실행한 뒤 schema.sql 을 실행하세요.

-- pg_cron 잡 정리 (있으면)
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from cron.job where jobname = 'gaptime-purge') then
    perform cron.unschedule('gaptime-purge');
  end if;
end $$;

drop table if exists submission_editors cascade;
drop table if exists room_secrets cascade;
drop table if exists submissions cascade;
drop table if exists rooms cascade;
drop table if exists usage_events cascade;
drop table if exists usage_daily cascade;
drop table if exists create_throttle cascade;

drop function if exists create_room(text,text,int,int,int,int,text,int) cascade;
drop function if exists create_room(text,text,int,int,int,int,text) cascade;
drop function if exists create_room(text,int,int,int,int,text) cascade;
drop function if exists create_room(text,int,int,int,int) cascade;
drop function if exists create_room(int,int,int,int) cascade;
drop function if exists claim_owner(text,text) cascade;
drop function if exists room_has_owner_pin(text) cascade;
drop function if exists submit_occupancy(text,text,text,jsonb,text,text,text) cascade;
drop function if exists submit_occupancy(text,text,jsonb,text) cascade;
drop function if exists claim_editor(text,text,text) cascade;
drop function if exists editor_has_pin(text,text) cascade;
drop function if exists delete_own_submission(text,text,text) cascade;
drop function if exists delete_own_submission(text,text) cascade;
drop function if exists verify_owner(text,text) cascade;
drop function if exists delete_submission_as_owner(uuid,text) cascade;
drop function if exists update_room_as_owner(text,text,int,boolean) cascade;
drop function if exists update_room_as_owner(text,text,int,boolean,text) cascade;
drop function if exists update_room_as_owner(text,text,int,boolean,text,int) cascade;
drop function if exists update_room_as_owner(text,text,int,boolean,text,int,int) cascade;
drop function if exists update_room_as_owner(text,text,int,boolean,text,int,int,int,int) cascade;
drop function if exists delete_room_as_owner(text,text) cascade;
drop function if exists _hash_pin(text,text) cascade;
drop function if exists _reserved_slug(text) cascade;
drop function if exists _pin_locked(timestamptz) cascade;
drop function if exists _bump_throttle(text,int,interval) cascade;
drop function if exists _client_ip() cascade;
drop function if exists _tally(text) cascade;
drop function if exists _gaptime_purge() cascade;
