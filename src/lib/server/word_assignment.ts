import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      global: {
        fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}

export interface QuarantineDiagnostics {
  studentId: string;
  learnedWordIds: string[];
  quarantinedWordIds: string[];
  quarantinedWords: { id: string; word: string; reviewType: string; reviewedAt: string }[];
  podCollisionWordIds: string[];
  eligibleWordsCount: number;
}

/**
 * Stage 1, 2, 3 Filtration Engine:
 * 1. 100-Day History Filter (Never repeat a word student has learned)
 * 2. 7-Day Reviewer Quarantine Filter (Freeze words student reviewed as Buddy or Peer in last 7 days)
 * 3. Same-Pod Collision Filter (No two students in same pod get same word today)
 */
export async function getEligibleWordsForStudent(
  studentId: string,
  targetDate?: string,
  quarantineDays = 7
): Promise<{ eligibleWords: any[]; diagnostics: QuarantineDiagnostics }> {
  const adminClient = getAdminClient();
  const today = targetDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // 1. Get student profile & pod
  const { data: student } = await adminClient
    .from('users')
    .select('id, full_name, pod_id')
    .eq('id', studentId)
    .single();

  const podId = student?.pod_id;

  // 2. Filter 1: 100-Day Lifetime Check (Words student has personally learned)
  const { data: pastRituals } = await adminClient
    .from('daily_rituals')
    .select('word_card_id')
    .eq('student_id', studentId);

  const learnedWordIds = Array.from(new Set(pastRituals?.map((r: any) => r.word_card_id).filter(Boolean) || []));

  // 3. Filter 2: 7-Day Reviewer Quarantine Check (Words reviewed as BUDDY or PEER in last 7 days)
  const quarantineCutoff = new Date(Date.now() - quarantineDays * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: recentReviews } = await adminClient
    .from('ritual_reviews')
    .select(`
      id,
      review_type,
      created_at,
      ritual:daily_rituals(
        word_card_id,
        word_card:word_cards(id, word)
      )
    `)
    .eq('reviewer_id', studentId)
    .gte('created_at', quarantineCutoff);

  const quarantinedWordIds: string[] = [];
  const quarantinedWords: { id: string; word: string; reviewType: string; reviewedAt: string }[] = [];

  if (recentReviews) {
    for (const rev of recentReviews as any[]) {
      const wId = rev.ritual?.word_card_id;
      const wName = rev.ritual?.word_card?.word || "Unknown";
      if (wId) {
        quarantinedWordIds.push(wId);
        quarantinedWords.push({
          id: wId,
          word: wName,
          reviewType: rev.review_type,
          reviewedAt: rev.created_at
        });
      }
    }
  }

  // 4. Filter 3: Same-Pod Daily Collision Check (Words assigned to pod members today)
  let podCollisionWordIds: string[] = [];
  if (podId) {
    const { data: podTodayRituals } = await adminClient
      .from('daily_rituals')
      .select(`
        word_card_id,
        student:users!daily_rituals_student_id_fkey(pod_id)
      `)
      .eq('ritual_date', today)
      .neq('student_id', studentId);

    if (podTodayRituals) {
      podCollisionWordIds = podTodayRituals
        .filter((r: any) => r.student?.pod_id === podId)
        .map((r: any) => r.word_card_id)
        .filter(Boolean);
    }
  }

  // Combine all blocked IDs
  const blockedIds = new Set([
    ...learnedWordIds,
    ...quarantinedWordIds,
    ...podCollisionWordIds
  ]);

  // 5. Fetch all candidate words from Word Vault
  const { data: allWords } = await adminClient
    .from('word_cards')
    .select('*')
    .order('created_at', { ascending: true });

  let eligibleWords = (allWords || []).filter((w: any) => !blockedIds.has(w.id));

  // Graceful fallback if pool is fully exhausted: allow non-learned words even if quarantined
  if (eligibleWords.length === 0) {
    eligibleWords = (allWords || []).filter((w: any) => !learnedWordIds.includes(w.id));
  }

  // Ultimate fallback if student learned all words in entire database: pick any word
  if (eligibleWords.length === 0 && (allWords || []).length > 0) {
    eligibleWords = allWords || [];
  }

  const diagnostics: QuarantineDiagnostics = {
    studentId,
    learnedWordIds,
    quarantinedWordIds,
    quarantinedWords,
    podCollisionWordIds,
    eligibleWordsCount: eligibleWords.length
  };

  return {
    eligibleWords,
    diagnostics
  };
}

/**
 * Assigns or retrieves the daily ritual for a student with quarantine enforcement.
 */
export async function assignDailyWordForStudent(studentId: string, targetDate?: string) {
  const adminClient = getAdminClient();
  const today = targetDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  // 1. Check if ritual already exists for today
  const { data: existingRitual } = await adminClient
    .from('daily_rituals')
    .select('*, steps:daily_ritual_steps(*), word_card:word_cards(*)')
    .eq('student_id', studentId)
    .eq('ritual_date', today)
    .maybeSingle();

  if (existingRitual) {
    return {
      ritual: existingRitual,
      wordCard: existingRitual.word_card,
      isNew: false
    };
  }

  // 2. Run Quarantine & Allocation Engine
  const { eligibleWords, diagnostics } = await getEligibleWordsForStudent(studentId, today);
  if (eligibleWords.length === 0) {
    throw new Error("No words available in the Word Vault. Please ask Admin to publish words.");
  }

  // Select optimal word (random from eligible pool for diversity)
  const selectedWord = eligibleWords[Math.floor(Math.random() * eligibleWords.length)];

  // 3. Create Daily Ritual
  const { data: newRitual, error: insertError } = await adminClient
    .from('daily_rituals')
    .insert({
      student_id: studentId,
      word_card_id: selectedWord.id,
      ritual_date: today,
      status: 'IN_PROGRESS'
    })
    .select('*, steps:daily_ritual_steps(*)')
    .single();

  if (insertError) {
    // If concurrent insert happened, fetch existing
    if (insertError.code === '23505') {
      const { data: recheck } = await adminClient
        .from('daily_rituals')
        .select('*, steps:daily_ritual_steps(*), word_card:word_cards(*)')
        .eq('student_id', studentId)
        .eq('ritual_date', today)
        .single();
      return { ritual: recheck, wordCard: recheck?.word_card, isNew: false };
    }
    throw insertError;
  }

  return {
    ritual: newRitual,
    wordCard: selectedWord,
    isNew: true,
    diagnostics
  };
}

/**
 * Batch Daily Cron Job Allocation (Runs at midnight across all active students)
 */
export async function runBatchDailyWordAssignments(targetDate?: string) {
  const adminClient = getAdminClient();
  const today = targetDate || new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const { data: students, error } = await adminClient
    .from('users')
    .select('id, full_name, email, pod_id, batch_id')
    .eq('role', 'student');

  if (error) throw error;

  const results: any[] = [];

  for (const student of students || []) {
    try {
      const res = await assignDailyWordForStudent(student.id, today);
      results.push({
        studentId: student.id,
        name: student.full_name,
        word: res.wordCard?.word,
        isNew: res.isNew,
        quarantinedCount: res.diagnostics?.quarantinedWordIds?.length || 0
      });
    } catch (err: any) {
      results.push({
        studentId: student.id,
        name: student.full_name,
        error: err.message
      });
    }
  }

  return {
    date: today,
    totalStudents: (students || []).length,
    processed: results.length,
    details: results
  };
}

/**
 * Quarantine Analytics for Admin Visualizer
 */
export async function getQuarantineAnalytics() {
  const adminClient = getAdminClient();
  const quarantineCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: words, count: totalWords } = await adminClient
    .from('word_cards')
    .select('id, word, status', { count: 'exact' });

  const { data: activeQuarantines } = await adminClient
    .from('ritual_reviews')
    .select(`
      id,
      reviewer_id,
      review_type,
      created_at,
      reviewer:users!ritual_reviews_reviewer_id_fkey(full_name),
      ritual:daily_rituals(
        word_card:word_cards(id, word)
      )
    `)
    .gte('created_at', quarantineCutoff);

  const { data: totalLearnedRituals } = await adminClient
    .from('daily_rituals')
    .select('id, student_id, word_card_id');

  return {
    totalWordsInVault: totalWords || words?.length || 0,
    activeQuarantinesCount: activeQuarantines?.length || 0,
    activeQuarantines: activeQuarantines?.map((q: any) => ({
      reviewerName: q.reviewer?.full_name || "Student",
      word: q.ritual?.word_card?.word || "Word",
      reviewType: q.review_type,
      expiresAt: new Date(new Date(q.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
    })) || [],
    totalCompletedRituals: totalLearnedRituals?.length || 0
  };
}
