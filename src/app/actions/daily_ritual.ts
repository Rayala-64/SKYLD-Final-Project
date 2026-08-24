"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { analyzeReflectionInternal, analyzeSpeechInternal } from "@/lib/server/ai";

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

export async function getWordCardByText(wordText: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('word_cards')
    .select('*')
    .ilike('word', wordText)
    .maybeSingle();

  if (error) {
    console.error("Error fetching word card:", error);
    return null;
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

  // Trigger immediate AI evaluation in background
  (async () => {
    try {
      const { data: wordRow } = await adminClient.from('word_cards').select('word').eq('id', wordCardId).single();
      const wordText = wordRow?.word || 'candid';
      
      const [reflectionRes, speechRes] = await Promise.all([
        analyzeReflectionInternal(userId, wordText, reflectionText),
        videoUrl ? analyzeSpeechInternal(userId, wordText, videoUrl) : Promise.resolve({ status: 'completed', data: null, error: undefined })
      ]);

      const updatePayload: any = {};
      if (reflectionRes?.data) {
        const fb: any = reflectionRes.data;
        fb.comment = fb.improvement_suggestions?.[0] || 'Great work!';
        updatePayload.reflection_ai_feedback = fb;
      }
      if (speechRes?.data) {
        updatePayload.video_ai_feedback = speechRes.data;
      }

      if (Object.keys(updatePayload).length > 0) {
        await adminClient.from('submissions').update(updatePayload).match({ user_id: userId, word_card_id: wordCardId });
      }
    } catch (aiErr) {
      console.error("Non-blocking immediate AI evaluation error:", aiErr);
    }
  })();

  // 0. Award 3 points for recording submission
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.rpc('complete_ritual_step', {
      p_ritual_id: ritualId,
      p_step_number: 5,
      p_step_type: 'RECORD_AND_UPLOAD',
      p_points: 3,
      p_user_id: user.id
    });
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

  // 2. Assign Cross-Pod Peer Review (External across Pods)
  let podId = buddyPair?.pod_id;
  if (!podId) {
    const { data: profile } = await adminClient.from('users').select('pod_id').eq('id', userId).single();
    podId = profile?.pod_id;
  }

  const buddyId = buddyPair ? (buddyPair.user1_id === userId ? buddyPair.user2_id : buddyPair.user1_id) : '00000000-0000-0000-0000-000000000000';
  
  // Cross-Pod Pivot Algorithm:
  // Priority 1: Pick a student from a DIFFERENT Pod (unbiased external grading)
  let candidates: { id: string }[] = [];
  if (podId) {
    const { data: crossPodPeers } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'student')
      .neq('pod_id', podId)
      .neq('id', userId)
      .neq('id', buddyId);

    if (crossPodPeers && crossPodPeers.length > 0) {
      candidates = crossPodPeers;
    }
  }

  // Priority 2: Fallback to any other student in cohort if only 1 Pod exists
  if (candidates.length === 0) {
    const { data: cohortPeers } = await adminClient
      .from('users')
      .select('id')
      .eq('role', 'student')
      .neq('id', userId)
      .neq('id', buddyId);
    if (cohortPeers && cohortPeers.length > 0) {
      candidates = cohortPeers;
    }
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
      if (peerErr) console.error("Failed to assign cross-pod peer review:", peerErr);
    }
  }

  return { success: true };
}
