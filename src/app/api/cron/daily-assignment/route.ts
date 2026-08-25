import { NextResponse } from "next/server";
import { runBatchDailyWordAssignments } from "@/lib/server/word_assignment";

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || 'skyld_secure_cron_secret_key_2026';
  
  if (authHeader && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const result = await runBatchDailyWordAssignments(today);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error("Cron Daily Word Assignment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
