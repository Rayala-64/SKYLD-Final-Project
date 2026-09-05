import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Optional secret check if configured
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminClient = getAdminClient();
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const notificationsCreated: any[] = [];

    // =========================================================================
    // 1. Check Student Daily Ritual Deadlines (Incomplete rituals today)
    // =========================================================================
    const { data: students } = await adminClient
      .from("users")
      .select("id, full_name, email, role")
      .eq("role", "student");

    if (students && students.length > 0) {
      // Find today's completed submissions
      const { data: completedToday } = await adminClient
        .from("submissions")
        .select("user_id")
        .eq("date", today);

      const completedUserIds = new Set((completedToday || []).map((s) => s.user_id));

      for (const student of students) {
        if (!completedUserIds.has(student.id)) {
          // Check if we already alerted this student today to avoid duplicate spam
          const { data: existingAlert } = await adminClient
            .from("notifications")
            .select("id")
            .eq("user_id", student.id)
            .eq("type", "DAILY_RITUAL_COMPLETED")
            .gte("created_at", `${today}T00:00:00.000Z`)
            .maybeSingle();

          if (!existingAlert) {
            const { data: notif } = await adminClient
              .from("notifications")
              .insert({
                user_id: student.id,
                type: "DAILY_RITUAL_COMPLETED",
                title: "🔥 Daily Ritual Deadline Approaching",
                message: "Don't break your streak! Complete your 10-step vocabulary ritual before midnight.",
                entity_type: "RITUAL",
                created_at: new Date().toISOString(),
              })
              .select()
              .single();

            if (notif) notificationsCreated.push(notif);
          }
        }
      }
    }

    // =========================================================================
    // 2. Check Pod Leader Weekly Challenge Deadlines (< 24 hours to lockout)
    // =========================================================================
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

    const { data: activeChallenges } = await adminClient
      .from("weekly_challenges")
      .select("id, title, end_date")
      .eq("status", "ACTIVE")
      .lte("end_date", next24Hours)
      .gte("end_date", now.toISOString());

    if (activeChallenges && activeChallenges.length > 0) {
      for (const challenge of activeChallenges) {
        const { data: pods } = await adminClient
          .from("pods")
          .select("id, name, admin_id");

        if (pods) {
          for (const pod of pods) {
            if (!pod.admin_id) continue;

            const { data: submission } = await adminClient
              .from("pod_challenge_submissions")
              .select("id")
              .eq("weekly_challenge_id", challenge.id)
              .eq("pod_id", pod.id)
              .maybeSingle();

            if (!submission) {
              const { data: existingLeaderAlert } = await adminClient
                .from("notifications")
                .select("id")
                .eq("user_id", pod.admin_id)
                .eq("type", "CHAMPIONSHIP_UPDATE")
                .gte("created_at", new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString())
                .maybeSingle();

              if (!existingLeaderAlert) {
                const { data: notif } = await adminClient
                  .from("notifications")
                  .insert({
                    user_id: pod.admin_id,
                    type: "CHAMPIONSHIP_UPDATE",
                    title: `🏆 Weekly Challenge Closing Soon (${pod.name})`,
                    message: `Only a few hours left to submit your Pod's 16-minute video for "${challenge.title}".`,
                    entity_type: "CHAMPIONSHIP",
                    created_at: new Date().toISOString(),
                  })
                  .select()
                  .single();

                if (notif) notificationsCreated.push(notif);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      dispatchedCount: notificationsCreated.length,
      notifications: notificationsCreated,
    });
  } catch (err: any) {
    console.error("Error in deadline reminders cron:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
