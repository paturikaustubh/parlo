import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string | symbol) {
    return (getClient() as any)[prop];
  },
});
