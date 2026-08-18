import { NextResponse, NextRequest } from 'next/server';
import { createClient as createAdminClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const maxExecutionTimeMs = 10000; // 10 seconds max duration
  const startTime = Date.now();
  
  let totalDeletedCount = 0;
  let totalFailedCount = 0;
  let processedBatches = 0;

  while (Date.now() - startTime < maxExecutionTimeMs) {
    // 1. Find submissions older than 30 days that still have a video_url
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: submissionsToCleanup, error: fetchError } = await adminClient
      .from('submissions')
      .select('id, video_url')
      .not('video_url', 'is', null)
      .lt('created_at', thirtyDaysAgo)
      .limit(200); // Process in batches to avoid timeouts

    if (fetchError) {
      console.error("Failed to fetch videos for cleanup:", fetchError);
      return NextResponse.json({ success: false, message: 'Database error' }, { status: 500 });
    }

    if (!submissionsToCleanup || submissionsToCleanup.length === 0) {
      break; // No more videos to clean up
    }
    
    processedBatches++;
    let currentBatchDeleted = 0;

    for (const submission of submissionsToCleanup) {
      if (Date.now() - startTime >= maxExecutionTimeMs) {
        break; // Stop if we've exceeded the time limit even mid-batch
      }
      
      try {
        // 2. Delete the actual file from Supabase Storage
        let filePath = submission.video_url;
        if (filePath.startsWith('http')) {
          const urlParts = filePath.split('/videos/');
          if (urlParts.length > 1) {
            filePath = urlParts[1];
          }
        }

        const { error: storageError } = await adminClient.storage
          .from('videos')
          .remove([filePath]);

        if (storageError) {
          console.error(`Failed to delete file from storage: ${filePath}`, storageError);
          totalFailedCount++;
          continue; // Skip DB update if storage deletion failed
        }

        // 3. Update the database to remove the video reference
        const { error: dbError } = await adminClient
          .from('submissions')
          .update({ video_url: null })
          .eq('id', submission.id);

        if (dbError) {
          console.error(`Failed to update DB for submission: ${submission.id}`, dbError);
          totalFailedCount++;
        } else {
          currentBatchDeleted++;
          totalDeletedCount++;
        }
      } catch (error) {
        console.error(`Error cleaning up submission: ${submission.id}`, error);
        totalFailedCount++;
      }
    }
    
    // If we didn't delete any in this batch (all failed), break to avoid infinite loop
    if (currentBatchDeleted === 0) {
      break;
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `Cleanup complete. Processed ${processedBatches} batches. Deleted: ${totalDeletedCount}, Failed: ${totalFailedCount}` 
  });
}
