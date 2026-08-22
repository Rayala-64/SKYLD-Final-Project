"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

export async function getPendingReviews() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminClient = getAdminClient();

  // Fetch pending reviews assigned to this user
  const { data, error } = await adminClient
    .from('ritual_reviews')
    .select(`
      *,
      reviewee:users!ritual_reviews_reviewee_id_fkey(id, full_name, email),
      ritual:daily_rituals(
        *,
        word_card:word_cards(*),
        submission:submissions(*)
      )
    `)
    .eq('reviewer_id', user.id)
    .eq('status', 'pending');

  if (error) {
    console.error("Error fetching pending reviews:", error);
    throw error;
  }

  // Create signed URLs for video playback if stored in private Supabase Storage
  if (data) {
    for (const review of data) {
      const sub = review.ritual?.submission?.[0];
      if (sub && sub.video_url && !sub.video_url.startsWith("http")) {
        const { data: signed } = await adminClient.storage
          .from("videos")
          .createSignedUrl(sub.video_url, 3600);
        if (signed?.signedUrl) {
          sub.video_url = signed.signedUrl;
        }
      }
    }
  }

  return data || [];
}

export async function submitReview(
  reviewId: string, 
  feedbackText: string, 
  strengthText: string, 
  improvementText: string, 
  score: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminClient = getAdminClient();

  // 1. Verify review belongs to this user and update it
  const { data: review, error } = await adminClient
    .from('ritual_reviews')
    .update({
      status: 'completed',
      feedback_text: feedbackText,
      strength_text: strengthText,
      improvement_text: improvementText,
      score: score,
      completed_at: new Date().toISOString()
    })
    .eq('id', reviewId)
    .eq('reviewer_id', user.id)
    .select()
    .single();

  if (error || !review) {
    console.error("Failed to update review:", error);
    throw new Error(error?.message || "Review not found or not authorized.");
  }

  // 2. Advance the reviewee's ritual state machine
  // Buddy Review = Step 6 (+2 pts)
  // Peer Review = Step 7 (+2 pts)
  const stepNumber = review.review_type === 'BUDDY' ? 6 : 7;
  const stepType = review.review_type === 'BUDDY' ? 'BUDDY_REVIEW' : 'PEER_REVIEW';

  const { error: rpcError } = await adminClient.rpc('complete_review_step_trigger', {
    p_ritual_id: review.ritual_id,
    p_step_number: stepNumber,
    p_step_type: stepType,
    p_points: 2,
    p_reviewer_id: user.id
  });

  if (rpcError) {
    console.error("RPC complete_review_step_trigger error, falling back to direct update:", rpcError);
    await adminClient.from('daily_ritual_steps').upsert({
      ritual_id: review.ritual_id,
      step_number: stepNumber,
      step_type: stepType,
      status: 'completed',
      points_awarded: 2,
      completed_at: new Date().toISOString()
    }, { onConflict: 'ritual_id, step_number' });

    const { data: currentRitual } = await adminClient
      .from('daily_rituals')
      .select('total_points')
      .eq('id', review.ritual_id)
      .single();

    if (currentRitual) {
      await adminClient.from('daily_rituals').update({
        total_points: (currentRitual.total_points || 0) + 2,
        updated_at: new Date().toISOString()
      }).eq('id', review.ritual_id);
    }
  }

  // 3. Award XP to the Reviewer for completing peer evaluation (+20 XP)
  try {
    await adminClient.from('xp_transactions').insert({
      user_id: user.id,
      amount: 20,
      reason: `Completed ${review.review_type.toLowerCase()} review`,
      idempotency_key: `review_${review.id}_${user.id}`
    });
  } catch (xpErr) {
    console.error("Non-blocking XP transaction error for reviewer:", xpErr);
  }

  return { success: true };
}

export async function getReceivedReviews() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminClient = getAdminClient();

  // Fetch completed reviews where I am the reviewee
  const { data, error } = await adminClient
    .from('ritual_reviews')
    .select(`
      *,
      reviewer:users!ritual_reviews_reviewer_id_fkey(full_name),
      ritual:daily_rituals(
        *,
        word_card:word_cards(*)
      )
    `)
    .eq('reviewee_id', user.id)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false });

  if (error) throw error;
  
  // Also need to know if step 8 (Acknowledge) and step 9 (Reflection) are done for these rituals
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const { data: myRitual } = await adminClient
    .from('daily_rituals')
    .select('id, status, steps:daily_ritual_steps(*)')
    .eq('student_id', user.id)
    .eq('ritual_date', today)
    .maybeSingle();

  const hasAcknowledged = myRitual?.steps?.some((s: any) => s.step_number === 8 && s.status === 'completed') || false;
  const hasReflected = myRitual?.steps?.some((s: any) => s.step_number === 9 && s.status === 'completed') || false;

  return { reviews: data || [], hasAcknowledged, hasReflected, ritualId: myRitual?.id };
}

export async function acknowledgeReviews(ritualId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Step 8: Acknowledge & Appreciate (+1 pt)
  await supabase.rpc('complete_ritual_step', {
    p_user_id: user.id,
    p_ritual_id: ritualId,
    p_step_number: 8,
    p_step_type: 'ACKNOWLEDGE',
    p_points: 1
  });
  return { success: true };
}

export async function reflectWithBuddy(ritualId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Step 9: Buddy Reflection (+2 pts)
  await supabase.rpc('complete_ritual_step', {
    p_user_id: user.id,
    p_ritual_id: ritualId,
    p_step_number: 9,
    p_step_type: 'BUDDY_REFLECTION',
    p_points: 2
  });
  return { success: true };
}
