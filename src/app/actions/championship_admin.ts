"use server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export async function launchGlobalWeeklyChallenge(theme: string, title: string, task: string, rules: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { data: profile } = await adminClient.from('users').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') throw new Error("Unauthorized");

  // 1. Get or create a Global Championship
  let championshipId;
  const { data: existingChampionship } = await adminClient
    .from('championships')
    .select('id')
    .eq('name', 'Global MVP Championship')
    .eq('status', 'ACTIVE')
    .limit(1)
    .maybeSingle();

  if (existingChampionship) {
    championshipId = existingChampionship.id;
  } else {
    const { data: newChampionship, error: cErr } = await adminClient
      .from('championships')
      .insert({
        name: 'Global MVP Championship',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
        status: 'ACTIVE'
      })
      .select('id')
      .single();
    if (cErr) throw new Error(`Failed to create championship: ${cErr.message}`);
    championshipId = newChampionship.id;
  }

  // 2. Get current week number or create a new week
  const { data: existingWeeks } = await adminClient
    .from('championship_weeks')
    .select('id, week_number')
    .eq('championship_id', championshipId)
    .order('week_number', { ascending: false });

  let weekNumber = 1;
  if (existingWeeks && existingWeeks.length > 0) {
    // Check if there is an active challenge for the latest week. If so, increment week number.
    const latestWeek = existingWeeks[0];
    const { data: latestChallenge } = await adminClient
      .from('weekly_challenges')
      .select('id, active')
      .eq('championship_week_id', latestWeek.id)
      .eq('active', true)
      .maybeSingle();
      
    if (latestChallenge) {
      // Deactivate the old challenge
      await adminClient.from('weekly_challenges').update({ active: false }).eq('id', latestChallenge.id);
      weekNumber = latestWeek.week_number + 1;
    } else {
      weekNumber = latestWeek.week_number;
    }
  }

  // Create new week if we incremented or if it's the first
  let weekId;
  const { data: existingCurrentWeek } = await adminClient
    .from('championship_weeks')
    .select('id')
    .eq('championship_id', championshipId)
    .eq('week_number', weekNumber)
    .maybeSingle();
    
  if (existingCurrentWeek) {
    weekId = existingCurrentWeek.id;
  } else {
    const { data: newWeek, error: wErr } = await adminClient
      .from('championship_weeks')
      .insert({
        championship_id: championshipId,
        week_number: weekNumber,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0],
        status: 'ACTIVE'
      })
      .select('id')
      .single();
    if (wErr) throw new Error(`Failed to create week: ${wErr.message}`);
    weekId = newWeek.id;
  }

  // 3. Create the challenge
  const { data: newChallenge, error: chErr } = await adminClient
    .from('weekly_challenges')
    .insert({
      championship_week_id: weekId,
      theme: theme,
      title: title,
      description: task,
      instructions: rules,
      max_points: 10,
      active: true
    })
    .select('id')
    .single();

  if (chErr) throw new Error(`Failed to create challenge: ${chErr.message}`);

  return { success: true, challengeId: newChallenge.id };
}

export async function getActiveChallenge() {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );

  const { data: activeChallenge } = await adminClient
    .from('weekly_challenges')
    .select(`
      id,
      theme,
      title,
      description,
      instructions,
      championship_week_id,
      championship_weeks ( week_number )
    `)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return activeChallenge;
}
