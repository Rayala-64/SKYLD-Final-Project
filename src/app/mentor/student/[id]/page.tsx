import { getStudentDetails } from "@/app/actions/mentor";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { MentorNotePanel } from "./MentorNotePanel";
import { MarkReviewedButton } from "./MarkReviewedButton";
import { ArrowLeft, BookOpen, Star, Calendar, Video, PenTool } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

export default async function StudentProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  const { student, latestSubmission, note } = await getStudentDetails(resolvedParams.id);

  // Fetch all historic submissions
  const { data: submissions } = await adminClient
    .from("submissions")
    .select(`
      id,
      date,
      points_earned,
      status,
      reflection_ai_feedback,
      video_ai_feedback,
      reflection_text,
      video_url,
      word_cards ( word, definition )
    `)
    .eq("user_id", student.id)
    .order("date", { ascending: false });

  const history = submissions || [];
  
  // Sign video URLs
  for (const sub of history) {
    if (sub.video_url) {
      if (sub.video_url.startsWith('http')) {
        // already full URL
      } else {
        const { data: signed } = await adminClient.storage.from("videos").createSignedUrl(sub.video_url, 60 * 60);
        if (signed?.signedUrl) {
          sub.video_url = signed.signedUrl;
        }
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto pb-12 space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/mentor/dashboard" className="p-2 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold font-heading text-foreground">
              {student.name}'s Profile
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {student.totalXp} XP</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary" /> {student.streak} Day Streak</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column: Submission History */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
              <BookOpen className="w-5 h-5 text-primary" /> Submission History
            </h2>
            
            {history.length === 0 ? (
              <PremiumCard glass className="p-12 text-center border-dashed">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-semibold text-muted-foreground">No submissions yet</h3>
              </PremiumCard>
            ) : (
              history.map((sub: any) => (
                <PremiumCard key={sub.id} glass className="p-6">
                  <div className="flex justify-between items-start mb-4 border-b border-border/50 pb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-sm">
                          Daily Mission
                        </span>
                        <span className="text-sm text-muted-foreground">{new Date(sub.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                      </div>
                      <h4 className="text-2xl font-bold font-heading text-glow-primary">{sub.word_cards?.word}</h4>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.status === 'submitted' ? (
                        <MarkReviewedButton submissionId={sub.id} studentId={student.id} />
                      ) : (
                        <div className="flex items-center gap-2 text-success bg-success/10 px-3 py-1.5 rounded-full text-sm font-bold border border-success/20">
                          Reviewed
                        </div>
                      )}
                      <div className="bg-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-full">
                        {sub.points_earned} XP
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Written Reflection */}
                    {sub.reflection_text && (
                      <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <PenTool className="w-3.5 h-3.5" /> Written Reflection
                          </h4>
                          <div className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded">
                            {sub.reflection_ai_feedback ? `Score: ${(sub.reflection_ai_feedback as any).score}/10` : "Pending"}
                          </div>
                        </div>
                        <p className="text-lg font-medium mb-3">"{sub.reflection_text}"</p>
                        <div className="bg-background/50 p-3 rounded-lg border border-border/30">
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-semibold not-italic text-foreground mr-1">AI Feedback:</span> 
                            {(sub.reflection_ai_feedback as any)?.comment || (sub.reflection_ai_feedback as any)?.improvement_suggestions?.[0] || "Pending AI review."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Spoken Fluency */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5" /> Spoken Fluency
                        </h4>
                        <div className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded">
                          {!sub.video_url ? "N/A" : sub.video_ai_feedback ? `Fluency: ${(sub.video_ai_feedback as any).fluency}/100` : "Pending"}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sub.video_url ? (
                          <video 
                            src={sub.video_url} 
                            controls 
                            className="w-full rounded-lg border border-border bg-black"
                          />
                        ) : (
                          <div className="w-full aspect-video rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/20 text-muted-foreground text-sm">
                            No video recorded
                          </div>
                        )}
                        
                        <div className="bg-background/50 p-3 rounded-lg border border-border/30 h-fit">
                          <p className="text-sm text-muted-foreground mt-2">
                            <span className="font-semibold not-italic text-foreground mr-1">AI Feedback:</span> 
                            {!sub.video_url ? "No video recorded." : (sub.video_ai_feedback as any)?.suggestion || "Pending AI review."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </PremiumCard>
              ))
            )}
          </div>

          {/* Sidebar: Mentor Notes */}
          <div className="space-y-6">
            <MentorNotePanel 
              studentId={student.id} 
              initialNote={note?.note || ""} 
              initialFlagged={note?.flagged || false} 
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
