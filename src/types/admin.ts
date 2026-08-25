export interface AdminDashboardData {
  platformStats: {
    totalStudents: number;
    activePods: number;
    wordsLearned: number;
    avgCompletionRate: number;
    pendingInvites: number;
    pendingAiJobs: number;
    failedAiJobs: number;
  };
  recentReflections: Array<{
    id: string;
    student_name: string;
    word: string;
    ai_quality: number;
    created_at: string;
  }>;
  upcomingWords: Array<{
    id: string;
    date: string;
    word: string;
    definition: string;
    example: string;
    rawDate: string;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    description: string;
    time: string;
  }>;
  allUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
  }>;
  pods: Array<{
    id: string;
    name: string;
  }>;
  reviewTracker?: Array<{
    ritualId: string;
    studentName: string;
    studentEmail: string;
    podName: string;
    word: string;
    buddyReviewer: { name: string; email: string; status: string } | null;
    peerReviewer: { name: string; email: string; status: string } | null;
    submittedAt: string;
  }>;
  quarantineStats?: {
    totalWordsInVault: number;
    activeQuarantinesCount: number;
    activeQuarantines: Array<{
      reviewerName: string;
      word: string;
      reviewType: string;
      expiresAt: string;
    }>;
    totalCompletedRituals: number;
  };
}
