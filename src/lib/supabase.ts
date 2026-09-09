import { createClient } from '@supabase/supabase-js';
import type { Occupancy, Room, Submission } from '@/types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (import.meta.env.DEV && !(url && anonKey)) {
  // 개발자용 콘솔 경고 (사용자 화면에는 노출하지 않음)
  console.warn('[everyFreeTime] Supabase env not set: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key');

// ── 방 ────────────────────────────────────────────────────────
export async function createRoom(input: {
  title: string;
  hostName: string;
  dayCount: number;
  startHour: number;
  endHour: number;
  slotMinutes: number;
  expectedSize: number;
  ownerPin?: string | null;
}): Promise<{ room: Room; ownerToken: string }> {
  const { data, error } = await supabase.rpc('create_room', {
    p_title: input.title,
    p_host_name: input.hostName,
    p_day_count: input.dayCount,
    p_start_hour: input.startHour,
    p_end_hour: input.endHour,
    p_slot_minutes: input.slotMinutes,
    p_expected_size: input.expectedSize,
    p_owner_pin: input.ownerPin ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  const room = await getRoom(row.id);
  if (!room) throw new Error('방 생성 직후 조회에 실패했어요');
  return { room, ownerToken: row.owner_token as string };
}

export async function getRoom(id: string): Promise<Room | null> {
  const { data, error } = await supabase.from('rooms').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

// ── 제출 ──────────────────────────────────────────────────────
export async function getSubmissions(roomId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, room_id, display_name, slug, occupancy, created_at')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Submission[]) ?? [];
}

// 신규 제출/수정. 성공 시 새 editor_token 반환.
export async function submitOccupancy(input: {
  roomId: string;
  displayName: string;
  slug: string;
  occupancy: Occupancy;
  editorToken?: string | null;
  pin?: string | null; // 다른 기기 수정 시 확인용
  setPin?: string | null; // 이번에 새로 설정할 PIN
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_occupancy', {
    p_room_id: input.roomId,
    p_display_name: input.displayName,
    p_slug: input.slug,
    p_occupancy: input.occupancy,
    p_editor_token: input.editorToken ?? null,
    p_pin: input.pin ?? null,
    p_set_pin: input.setPin ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function claimEditor(
  roomId: string,
  slug: string,
  pin: string | null
): Promise<string> {
  const { data, error } = await supabase.rpc('claim_editor', {
    p_room_id: roomId,
    p_slug: slug,
    p_pin: pin,
  });
  if (error) throw error;
  return data as string;
}

export async function editorHasPin(roomId: string, slug: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('editor_has_pin', {
    p_room_id: roomId,
    p_slug: slug,
  });
  if (error) throw error;
  return data as boolean | null;
}

export async function deleteOwnSubmission(
  roomId: string,
  slug: string,
  editorToken: string
): Promise<void> {
  const { error } = await supabase.rpc('delete_own_submission', {
    p_room_id: roomId,
    p_slug: slug,
    p_editor_token: editorToken,
  });
  if (error) throw error;
}

// ── 방장 관리 ─────────────────────────────────────────────────
export async function verifyOwner(roomId: string, ownerToken: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('verify_owner', {
    p_room_id: roomId,
    p_owner_token: ownerToken,
  });
  if (error) throw error;
  return data === true;
}

export async function roomHasOwnerPin(roomId: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc('room_has_owner_pin', { p_room_id: roomId });
  if (error) throw error;
  return data as boolean | null;
}

export async function claimOwner(roomId: string, pin: string): Promise<string> {
  const { data, error } = await supabase.rpc('claim_owner', { p_room_id: roomId, p_pin: pin });
  if (error) throw error;
  return data as string;
}

export async function updateRoomAsOwner(input: {
  roomId: string;
  ownerToken: string;
  expectedSize?: number;
  locked?: boolean;
  title?: string;
  dayCount?: number;
  slotMinutes?: number;
}): Promise<void> {
  const { error } = await supabase.rpc('update_room_as_owner', {
    p_room_id: input.roomId,
    p_owner_token: input.ownerToken,
    p_expected_size: input.expectedSize ?? null,
    p_locked: input.locked ?? null,
    p_title: input.title ?? null,
    p_day_count: input.dayCount ?? null,
    p_slot_minutes: input.slotMinutes ?? null,
  });
  if (error) throw error;
}

export async function deleteSubmissionAsOwner(
  submissionId: string,
  ownerToken: string
): Promise<void> {
  const { error } = await supabase.rpc('delete_submission_as_owner', {
    p_submission_id: submissionId,
    p_owner_token: ownerToken,
  });
  if (error) throw error;
}

export async function deleteRoomAsOwner(roomId: string, ownerToken: string): Promise<void> {
  const { error } = await supabase.rpc('delete_room_as_owner', {
    p_room_id: roomId,
    p_owner_token: ownerToken,
  });
  if (error) throw error;
}

// ── Realtime ──────────────────────────────────────────────────
export function subscribeRoom(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submissions', filter: `room_id=eq.${roomId}` },
      () => onChange()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
