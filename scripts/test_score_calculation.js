require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testScoreCalculation() {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: submissions } = await adminClient
    .from('submissions')
    .select('*');

  console.log("Found submissions count:", submissions.length);
  
  submissions.forEach((sub, i) => {
    const textFb = sub.reflection_ai_feedback;
    const videoFb = sub.video_ai_feedback;

    let textScore = 0;
    let hasText = false;
    if (textFb && textFb.score !== undefined) {
      textScore = textFb.score * 10;
      hasText = true;
    }

    let videoScore = 0;
    let hasVideo = false;
    if (videoFb && videoFb.fluency !== undefined) {
      videoScore = videoFb.fluency;
      hasVideo = true;
    }

    let submissionScore = 0;
    if (hasText && hasVideo) {
      submissionScore = (textScore * 0.4) + (videoScore * 0.6);
    } else if (hasText) {
      submissionScore = textScore;
    } else if (hasVideo) {
      submissionScore = videoScore;
    }

    console.log(`\nSubmission ${i+1}:`);
    console.log(`  Text Score: ${textScore}/100 (from reflection score: ${textFb?.score})`);
    console.log(`  Video Fluency Score: ${videoScore}/100`);
    console.log(`  Combined Communication Score: ${Math.round(submissionScore)}%`);
    console.log(`  Reflection Comment: "${textFb?.comment}"`);
    console.log(`  Speech Feedback Suggestion: "${videoFb?.suggestion}"`);
  });
}

testScoreCalculation();
