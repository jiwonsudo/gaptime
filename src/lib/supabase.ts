import { createClient } from '@supabase/supabase-js';
import type { Occupancy, Room, Submission } from '@/types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'public-anon-key');

function shortId(len = 6): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export async function createRoom(input: {
  dayCount: number;
  startHour: number;
  endHour: number;
  expectedSize: number;
}): Promise<Room> {
  const id = shortId();
  const { data, error } = await supabase
    .from('rooms')
    .insert({
      id,
      day_count: input.dayCount,
      start_hour: input.startHour,
      end_hour: input.endHour,
      expected_size: input.expectedSize,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Room;
}

export async function getRoom(id: string): Promise<Room | null> {
  const { data, error } = await supabase.from('rooms').select().eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

export async function getSubmissions(roomId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select()
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Submission[]) ?? [];
}

export async function submitOccupancy(input: {
  roomId: string;
  name: string;
  occupancy: Occupancy;
}): Promise<void> {
  const { error } = await supabase.from('submissions').insert({
    room_id: input.roomId,
    name: input.name,
    occupancy: input.occupancy,
  });
  if (error) throw error;
}

export function subscribeSubmissions(roomId: string, onChange: () => void) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'submissions', filter: `room_id=eq.${roomId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
