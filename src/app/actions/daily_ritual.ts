"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { analyzeReflectionInternal, analyzeSpeechInternal } from "@/lib/server/ai";
import { sendInAppNotification } from "./notifications";
import { sendEmailNotification } from "@/lib/server/email";

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

import { assignDailyWordForStudent } from "@/lib/server/word_assignment";

export async function getOrCreateDailyRitual(studentId: string, wordCardId?: string, ritualDate?: string) {
  const today = ritualDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // If no specific wordCardId is provided, run the automated quarantine engine
  if (!wordCardId) {
    const res = await assignDailyWordForStudent(studentId, today);
    return res.ritual;
  }

  const supabase = await createClient();

  // Try to find existing
  let ritual;
  const { data: foundRitual } = await supabase
    .from('daily_rituals')
    .select('*, steps:daily_ritual_steps(*), word_card:word_cards(*)')
    .eq('student_id', studentId)
    .eq('ritual_date', today)
    .maybeSingle();
    
  ritual = foundRitual;

  if (!ritual) {
    // Create new
    const { data: newRitual, error: insertError } = await supabase
      .from('daily_rituals')
      .insert({
        student_id: studentId,
        word_card_id: wordCardId,
        ritual_date: today,
        status: 'IN_PROGRESS'
      })
      .select('*, steps:daily_ritual_steps(*), word_card:word_cards(*)')
      .single();
      
    if (insertError) throw insertError;
    ritual = newRitual;
  }
  
  return ritual;
}

export async function getOrCreateTodayDailyRitual(studentId: string) {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return await assignDailyWordForStudent(studentId, today);
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

  // 0. Award 3 points for recording submission and mark ritual as fully completed
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.rpc('complete_ritual_step', {
      p_ritual_id: ritualId,
      p_step_number: 5,
      p_step_type: 'RECORD_AND_UPLOAD',
      p_points: 3,
      p_user_id: user.id
    });
    
    // Also trigger the final completion step to award 100 XP and update streak
    try {
      await adminClient.from('xp_transactions').insert({
        user_id: user.id,
        amount: 100,
        reason: 'Daily Ritual Completed',
        idempotency_key: `ritual_complete_${ritualId}_${user.id}`
      });

      // Update streak
      await adminClient.from('streaks').upsert({
        user_id: user.id,
        current_streak: 1, // simplified for demo, actual logic would increment
        last_activity_date: today,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      
      // Update ritual status to COMPLETED
      await adminClient.from('daily_rituals').update({ status: 'COMPLETED' }).eq('id', ritualId);
    } catch (e) {
      console.error("Failed to apply XP/streak rewards in V2:", e);
    }
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
      if (revErr) {
        console.error("Failed to assign buddy review:", revErr);
      } else {
        const { data: profile } = await adminClient.from('users').select('full_name').eq('id', userId).single();
        await sendInAppNotification({
          userId: buddyId,
          type: "BUDDY_REVIEW_ASSIGNED",
          title: "🤝 Buddy Review Assigned",
          message: `${profile?.full_name || 'Your buddy'} just submitted their 10-step ritual. Please review their submission!`,
          entityType: "RITUAL",
          entityId: ritualId
        });
      // Send email notification to buddy
      const { data: buddyProfile } = await adminClient
        .from('users')
        .select('email, full_name')
        .eq('id', buddyId)
        .single();
      if (buddyProfile?.email) {
        await sendEmailNotification({
          to: buddyProfile.email,
          subject: "Buddy Review Assigned",
          text: `${profile?.full_name || 'Your buddy'} just submitted their 10-step ritual. Please review their submission!`,
          html: `<p>${profile?.full_name || 'Your buddy'} just submitted their 10-step ritual. Please review their submission!</p>`
        });
      }
      }
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
    // Find candidate with the fewest pending peer reviews to avoid multiple assignments
    const candidateIds = candidates.map(c => c.id);
    const { data: pendingReviews } = await adminClient
      .from('ritual_reviews')
      .select('reviewer_id')
      .eq('review_type', 'PEER')
      .eq('status', 'pending')
      .in('reviewer_id', candidateIds);
      
    const reviewCounts: Record<string, number> = {};
    candidateIds.forEach(id => reviewCounts[id] = 0);
    if (pendingReviews) {
      pendingReviews.forEach(r => {
        reviewCounts[r.reviewer_id] = (reviewCounts[r.reviewer_id] || 0) + 1;
      });
    }
    
    const minCount = Math.min(...Object.values(reviewCounts));
    const bestCandidates = candidates.filter(c => reviewCounts[c.id] === minCount);
    
    // Randomly pick among the best candidates (those tied for the least reviews)
    const randomPeer = bestCandidates[Math.floor(Math.random() * bestCandidates.length)];

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
      if (peerErr) {
        console.error("Failed to assign cross-pod peer review:", peerErr);
      } else {
        await sendInAppNotification({
          userId: randomPeer.id,
          type: "PEER_REVIEW_ASSIGNED",
          title: "🌐 Cross-Pod Review Assigned",
          message: `You have been selected to provide an objective external review for a peer's 10-step ritual.`,
          entityType: "RITUAL",
          entityId: ritualId
        });
      // Send email notification to peer reviewer
      const { data: peerProfile } = await adminClient
        .from('users')
        .select('email, full_name')
        .eq('id', randomPeer.id)
        .single();
      if (peerProfile?.email) {
        await sendEmailNotification({
          to: peerProfile.email,
          subject: "Peer Review Assigned",
          text: `You have been selected to provide an objective external review for a peer's 10-step ritual.`,
          html: `<p>You have been selected to provide an objective external review for a peer's 10-step ritual.</p>`
        });
      }
      }
    }
  }

  // 3. Notify Pod Mentor(s) that a student completed their ritual
  try {
    const studentPodId = podId || (await (async () => {
      const { data: p } = await adminClient.from('users').select('pod_id').eq('id', userId).single();
      return p?.pod_id;
    })());

    if (studentPodId) {
      const { data: mentors } = await adminClient
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'mentor')
        .eq('pod_id', studentPodId);

      const { data: studentProfile } = await adminClient
        .from('users')
        .select('full_name')
        .eq('id', userId)
        .single();

      const { data: wordCard } = await adminClient
        .from('word_cards')
        .select('word')
        .eq('id', wordCardId)
        .single();

      const studentName = studentProfile?.full_name || 'A student';
      const wordText = wordCard?.word || 'today\'s word';

      if (mentors && mentors.length > 0) {
        for (const mentor of mentors) {
          // In-app notification
          await sendInAppNotification({
            userId: mentor.id,
            type: "STUDENT_RITUAL_COMPLETED",
            title: "📋 Student Ritual Completed",
            message: `${studentName} has completed their 10-step ritual for "${wordText}". Review their submission when ready.`,
            entityType: "RITUAL",
            entityId: ritualId
          });

          // Email notification
          if (mentor.email) {
            await sendEmailNotification({
              to: mentor.email,
              subject: `📋 ${studentName} completed their daily ritual`,
              text: `${studentName} has completed their 10-step ritual for "${wordText}". Review their submission when ready.`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px;">
                  <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #6366f1; margin: 0; font-size: 24px;">SKYLD</h1>
                    <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Mentor Dashboard</p>
                  </div>
                  <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
                    <h2 style="color: #22c55e; margin-top: 0; font-size: 18px;">📋 Ritual Completed</h2>
                    <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                      <strong>${studentName}</strong> has completed their 10-step ritual for <strong>"${wordText}"</strong>.
                    </p>
                    <p style="color: #94a3b8; font-size: 13px;">You can review their reflection, video, and provide feedback from the mentor dashboard.</p>
                    <div style="text-align: center; margin: 28px 0 12px 0;">
                      <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://skyld-pilot.netlify.app'}/mentor/dashboard" style="background-color: #6366f1; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                        Open Mentor Dashboard →
                      </a>
                    </div>
                  </div>
                  <p style="text-align: center; color: #64748b; font-size: 12px; margin-top: 24px;">
                    © ${new Date().getFullYear()} SKYLD. All rights reserved.
                  </p>
                </div>
              `,
            });
          }
        }
      }
    }
  } catch (mentorNotifErr) {
    console.error("Non-blocking mentor notification error:", mentorNotifErr);
  }

  return { success: true };
}
