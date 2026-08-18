import { createClient as createAdminClient } from "@supabase/supabase-js";

type LogLevel = 'info' | 'warn' | 'error';

class SystemLogger {
  // We use SupabaseClient's any type for flexibility since we don't strictly type the DB here.
  private adminClient: any;

  constructor() {
    this.adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || ""
    );
  }

  private async log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    if (process.env.NODE_ENV === 'development') {
      console[level](`[${level.toUpperCase()}] ${message}`, metadata || '');
    }

    try {
      await this.adminClient.from('system_logs').insert({
        level,
        message,
        metadata: metadata || {}
      });
    } catch (e) {
      console.error("Failed to write to system_logs:", e);
    }
  }

  async info(message: string, metadata?: Record<string, unknown>) {
    return this.log('info', message, metadata);
  }

  async warn(message: string, metadata?: Record<string, unknown>) {
    return this.log('warn', message, metadata);
  }

  async error(message: string, metadata?: Record<string, unknown>) {
    return this.log('error', message, metadata);
  }
}

export const logger = new SystemLogger();
