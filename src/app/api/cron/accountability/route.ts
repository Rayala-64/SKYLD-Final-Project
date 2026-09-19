import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Make sure this matches vercel.json cron schedule
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes

export async function GET(request: Request) {
  // Verify cron secret if configured
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      auth: { persistSession: false }
    }
  );

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  try {
    // 1. Get all active students with their pod_id
    const { data: students, error: studentErr } = await supabase
      .from('users')
      .select('id, pod_id')
      .eq('role', 'student');

    if (studentErr) throw studentErr;

    // 2. Get today's rituals
    const { data: rituals, error: ritualErr } = await supabase
      .from('daily_rituals')
      .select('student_id, status')
      .eq('ritual_date', today);

    if (ritualErr) throw ritualErr;

    const ritualMap = new Map(rituals?.map(r => [r.student_id, r.status]) || []);

    // 3. Get buddy pairs
    const { data: buddies, error: buddyErr } = await supabase
      .from('buddy_pairs')
      .select('user1_id, user2_id')
      .eq('active', true);

    if (buddyErr) throw buddyErr;

    const getBuddyId = (studentId: string) => {
      const pair = buddies?.find(b => b.user1_id === studentId || b.user2_id === studentId);
      if (!pair) return null;
      return pair.user1_id === studentId ? pair.user2_id : pair.user1_id;
    };

    let penaltiesApplied = 0;

    // 4. Evaluate each student
    for (const student of students || []) {
      const status = ritualMap.get(student.id);
      
      // If no ritual or not COMPLETED, they missed a step.
      if (status !== 'COMPLETED') {
        const buddyId = getBuddyId(student.id);
        const reason = `Accountability Penalty: Daily Ritual incomplete on ${today}`;

        // Deduct from Student
        await supabase.from('xp_transactions').insert({
          user_id: student.id,
          amount: -1,
          reason: reason + " (Self)",
          idempotency_key: `penalty_self_${student.id}_${today}`
        });

        // Deduct from Buddy (if exists)
        if (buddyId) {
          await supabase.from('xp_transactions').insert({
            user_id: buddyId,
            amount: -1,
            reason: reason + " (Buddy missed ritual)",
            idempotency_key: `penalty_buddy_${student.id}_${buddyId}_${today}`
          });
        }

        if (student.pod_id) {
           await supabase.from('xp_transactions').insert({
            user_id: student.id,
            amount: -1,
            reason: reason + " (Pod Penalty)",
            idempotency_key: `penalty_pod_${student.id}_${today}`
          });
        }
        
        penaltiesApplied++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      date: today,
      studentsEvaluated: students?.length || 0,
      penaltiesApplied 
    });

  } catch (error: any) {
    console.error("Accountability Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
