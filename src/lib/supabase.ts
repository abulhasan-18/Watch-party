import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ✅ anon key, not service_role
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
