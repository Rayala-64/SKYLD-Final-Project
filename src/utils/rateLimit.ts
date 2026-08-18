import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function checkRateLimit(ipOrKey: string, maxRequests: number, windowMs: number): Promise<boolean> {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const windowSeconds = Math.floor(windowMs / 1000);

  const { data, error } = await adminClient.rpc('check_rate_limit', {
    p_ip_key: ipOrKey,
    p_limit: maxRequests,
    p_window_seconds: windowSeconds
  });

  if (error) {
    console.error("Rate limit check failed:", error);
    return false; // Fail closed for security to prevent brute force if DB is down
  }

  return !data; // The RPC returns true if limit EXCEEDED, so we return true if ALLOWED.
}
