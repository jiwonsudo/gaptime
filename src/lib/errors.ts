// Supabase RPC 에러(PostgrestError)든 Error든 사용자에게 보여줄 문장으로.
export function errMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.trim() !== '') return m;
  }
  return fallback;
}
