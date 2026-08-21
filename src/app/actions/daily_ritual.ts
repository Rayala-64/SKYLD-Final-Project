"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export async function submitRitualStep(ritualId: string, stepNumber: number, stepType: string, points: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data, error } = await supabase.rpc('complete_ritual_step', {
    p_ritual_id: ritualId,
    p_step_number: stepNumber,
    p_step_type: stepType,
    p_points: points,
    p_user_id: user.id
  });

  if (error) {
    console.error("Error submitting ritual step:", error);
    throw new Error(error.message);
  }

  // When step 9 is completed, the full ritual is finished: award base 100 XP and update streak
  if (stepNumber === 9 || stepType === 'BUDDY_REFLECTION') {
    try {
      const adminClient = getAdminClient();
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      await adminClient.from('xp_transactions').insert({
        user_id: user.id,
        amount: 100,
        reason: 'Daily Ritual 10/10 Completed',
        idempotency_key: `ritual_complete_${ritualId}_${user.id}`
      });

      await adminClient.from('streaks').upsert({
        user_id: user.id,
        current_streak: 1,
        last_activity_date: today,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (streakErr) {
      console.error("Non-blocking streak/XP completion error:", streakErr);
    }
  }

  return data;
}

export async function getOrCreateDailyRitual(studentId: string, wordCardId: string, ritualDate: string) {
  const supabase = await createClient();

  // Try to find existing
  let ritual;
  const { data: foundRitual, error: findError } = await supabase
    .from('daily_rituals')
    .select('*, steps:daily_ritual_steps(*)')
    .eq('student_id', studentId)
    .eq('ritual_date', ritualDate)
    .maybeSingle();
    
  ritual = foundRitual;

  if (!ritual) {
    // Create new
    const { data: newRitual, error: insertError } = await supabase
      .from('daily_rituals')
      .insert({
        student_id: studentId,
        word_card_id: wordCardId,
        ritual_date: ritualDate,
        status: 'IN_PROGRESS'
      })
      .select('*, steps:daily_ritual_steps(*)')
      .single();
      
    if (insertError) throw insertError;
    ritual = newRitual;
  }
  
  return ritual;
}

export async function submitDailyMissionV2(
  userId: string,
  wordCardId: string,
  reflectionText: string,
  videoUrl: string,
  isCorrect: boolean,
  ritualId: string
) {
  const supabase = await createClient();
  const adminClient = getAdminClient();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // Use upsert to handle submissions table
  const { error } = await supabase
    .from('submissions')
    .upsert({
      user_id: userId,
      word_card_id: wordCardId,
      date: today,
      reflection_text: reflectionText,
      video_url: videoUrl,
      status: 'submitted',
      daily_ritual_id: ritualId
    }, { onConflict: 'user_id, word_card_id' });

  if (error) {
    throw new Error(error.message);
  }

  // 1. Assign Buddy Review (using admin client to safely write cross-user review queue)
  const { data: buddyPair } = await adminClient
    .from('buddy_pairs')
    .select('*')
    .eq('active', true)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();

  if (buddyPair) {
    const buddyId = buddyPair.user1_id === userId ? buddyPair.user2_id : buddyPair.user1_id;
    // Check if buddy review already exists
    const { data: existingBuddyRev } = await adminClient
      .from('ritual_reviews')
      .select('id')
      .eq('ritual_id', ritualId)
      .eq('reviewer_id', buddyId)
      .eq('review_type', 'BUDDY')
      .maybeSingle();

    if (!existingBuddyRev) {
      const { error: revErr } = await adminClient.from('ritual_reviews').insert({
        ritual_id: ritualId,
        reviewer_id: buddyId,
        reviewee_id: userId,
        review_type: 'BUDDY',
        status: 'pending'
      });
      if (revErr) console.error("Failed to assign buddy review:", revErr);
    }
  }

  // 2. Assign Peer Review
  let podId = buddyPair?.pod_id;
  if (!podId) {
    const { data: profile } = await adminClient.from('users').select('pod_id').eq('id', userId).single();
    podId = profile?.pod_id;
  }

  const buddyId = buddyPair ? (buddyPair.user1_id === userId ? buddyPair.user2_id : buddyPair.user1_id) : '00000000-0000-0000-0000-000000000000';
  
  // Find candidates in pod first
  let candidates: { id: string }[] = [];
  if (podId) {
    const { data: podPeers } = await adminClient
      .from('users')
      .select('id')
      .eq('pod_id', podId)
      .eq('role', 'student')
      .neq('id', userId)
      .neq('id', buddyId);
    if (podPeers && podPeers.length > 0) candidates = podPeers;
  }

  // If no other peer in same pod (e.g. 2-person pod), pick any other student in batch
  if (candidates.length === 0) {
    const { data: batchPeers } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'student')
      .neq('id', userId)
      .neq('id', buddyId);
    if (batchPeers && batchPeers.length > 0) candidates = batchPeers;
  }

  if (candidates.length > 0) {
    const randomPeer = candidates[Math.floor(Math.random() * candidates.length)];
    const { data: existingPeerRev } = await adminClient
      .from('ritual_reviews')
      .select('id')
      .eq('ritual_id', ritualId)
      .eq('reviewer_id', randomPeer.id)
      .eq('review_type', 'PEER')
      .maybeSingle();

    if (!existingPeerRev) {
      const { error: peerErr } = await adminClient.from('ritual_reviews').insert({
        ritual_id: ritualId,
        reviewer_id: randomPeer.id,
        reviewee_id: userId,
        review_type: 'PEER',
        status: 'pending'
      });
      if (peerErr) console.error("Failed to assign peer review:", peerErr);
    }
  }

  return { success: true };
}
