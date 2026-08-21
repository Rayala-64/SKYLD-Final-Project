import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Users, Video, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

export default async function MentorDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );

  // Fetch mentor profile
  const { data: mentorProfile } = await adminClient
    .from("users")
    .select("pod_id")
    .eq("id", user.id)
    .single();

  if (!mentorProfile?.pod_id) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold font-heading">Mentor Dashboard</h1>
          <PremiumCard className="p-6">
            <p className="text-muted-foreground">You are not assigned to a Pod yet. Contact an administrator.</p>
          </PremiumCard>
        </div>
      </DashboardLayout>
    );
  }

  // Fetch students in this pod
  const { data: studentsData } = await adminClient
    .from("users")
    .select("id, full_name, email, role")
    .eq("pod_id", mentorProfile.pod_id)
    .eq("role", "student");

  // Fetch submissions using admin client
  const { data: submissions } = await adminClient
    .from("submissions")
    .select("user_id, status, date");

  // Since we don't have a mentor_reviewed flag, we'll assume 'submitted' means it needs review for the UI prototype
  const pendingReviewsCount = submissions?.filter(s => s.status === 'submitted').length || 0;
  
  const students = (studentsData || []).map(student => {
    const studentSubs = submissions?.filter(s => s.user_id === student.id) || [];
    const needsReview = studentSubs.some(s => s.status === 'submitted');
    const streak = studentSubs.length; // Simplified streak
    const lastActive = studentSubs.length > 0 
      ? new Date(Math.max(...studentSubs.map(s => new Date(s.date).getTime()))).toLocaleDateString()
      : "Never";
      
    return {
      id: student.id,
      name: student.full_name,
      status: streak > 0 ? "active" : "inactive",
      streak,
      needsReview,
      lastActive,
    };
  });

  const inactiveCount = students.filter(s => s.status === 'inactive').length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold font-heading">Mentor Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage your pod and review student submissions.</p>
          </div>
          <PremiumButton asChild>
            <Link href="/mentor/evaluations">Master Evaluations</Link>
          </PremiumButton>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PremiumCard className="p-6 bg-gradient-to-br from-card to-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">My Students</p>
                <p className="text-2xl font-bold">{students.length}</p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="p-6 bg-gradient-to-br from-card to-secondary/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold">{pendingReviewsCount}</p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard className="p-6 border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">At Risk (Inactive)</p>
                <p className="text-2xl font-bold">{inactiveCount}</p>
              </div>
            </div>
          </PremiumCard>
        </div>

        <PremiumCard className="p-6 overflow-hidden">
          <h2 className="text-xl font-bold mb-6">Pod Roster</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 rounded-tl-lg">Student</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Submissions</th>
                  <th className="px-6 py-4">Last Active</th>
                  <th className="px-6 py-4 rounded-tr-lg text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">No students in your pod yet.</td></tr>
                ) : students.map((student) => (
                  <tr key={student.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-4 font-medium flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {student.name.charAt(0)}
                      </div>
                      {student.name}
                    </td>
                    <td className="px-6 py-4">
                      {student.needsReview ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/20 text-secondary">
                          Needs Review
                        </span>
                      ) : student.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-500">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-orange-500 font-bold">{student.streak} 🔥</span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {student.lastActive}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <PremiumButton variant={student.needsReview ? "default" : "outline"} size="sm" asChild>
                        <Link href={`/mentor/student/${student.id}`}>View Details</Link>
                      </PremiumButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PremiumCard>
      </div>
    </DashboardLayout>
  );
}
