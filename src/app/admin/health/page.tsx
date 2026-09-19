"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Activity, Brain, Server, Target, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AdminHealthDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHealthData() {
      const supabase = createClient();
      
      // In a real application, these counts would come from the database.
      // For this prototype, we're mocking the response to demonstrate the UI.
      const mockData = {
        ai_jobs: {
          pending: 12,
          processing: 4,
          completed: 1245,
          failed: 2,
          retrying: 1
        },
        reviews: {
          pending: 45,
          completed: 890,
          overdue: 14
        },
        championship: {
          active_id: "CHAMP-001",
          week: 3,
          submissions: 42,
          evaluations_pending: 18
        },
        system: {
          failed_notifications: 0,
          recent_errors: 3,
          stuck_jobs: 1
        }
      };

      setData(mockData);
      setLoading(false);
    }
    fetchHealthData();
  }, []);

  if (loading || !data) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <Activity className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-24">
        
        <div>
          <h1 className="text-3xl font-bold font-heading">System Health</h1>
          <p className="text-muted-foreground mt-2">Monitor SKYLD-LDOS performance, queues, and background jobs.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* AI Jobs Health */}
          <PremiumCard className="p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" /> AI Job Pipeline
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Pending</span>
                <span className="font-bold">{data.ai_jobs.pending}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/10 text-primary rounded-lg border border-primary/20">
                <span>Processing</span>
                <span className="font-bold">{data.ai_jobs.processing}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Completed (24h)</span>
                <span className="font-bold text-success">{data.ai_jobs.completed}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <span>Failed</span>
                <span className="font-bold">{data.ai_jobs.failed}</span>
              </div>
            </div>
          </PremiumCard>

          {/* Review Queues */}
          <PremiumCard className="p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500" /> Review Queues
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Pending Reviews</span>
                <span className="font-bold">{data.reviews.pending}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Completed (24h)</span>
                <span className="font-bold text-success">{data.reviews.completed}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-warning/10 text-warning rounded-lg border border-warning/20">
                <span>Overdue (›48h)</span>
                <span className="font-bold">{data.reviews.overdue}</span>
              </div>
            </div>
          </PremiumCard>

          {/* Championship Status */}
          <PremiumCard className="p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-success" /> Active Championship
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-sm">{data.championship.active_id}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Current Week</span>
                <span className="font-bold">Week {data.championship.week}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Pod Submissions</span>
                <span className="font-bold">{data.championship.submissions}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Pending Evaluations</span>
                <span className="font-bold">{data.championship.evaluations_pending}</span>
              </div>
            </div>
          </PremiumCard>

          {/* System Alerts */}
          <PremiumCard className="p-6 border-l-4 border-l-destructive">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> System Alerts
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted/20 rounded-lg">
                <span className="text-muted-foreground">Failed Notifications</span>
                <span className="font-bold text-success">{data.system.failed_notifications}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                <span>Recent Server Errors</span>
                <span className="font-bold">{data.system.recent_errors}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-warning/10 text-warning rounded-lg border border-warning/20">
                <span>Stuck Jobs (›1h)</span>
                <span className="font-bold">{data.system.stuck_jobs}</span>
              </div>
            </div>
          </PremiumCard>

        </div>
      </div>
    </DashboardLayout>
  );
}
