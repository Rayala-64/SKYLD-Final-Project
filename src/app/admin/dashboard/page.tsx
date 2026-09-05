"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Users, LayoutDashboard, KeyRound, Shield, AlertTriangle, Activity, BookOpen, Plus, Loader2, Edit2, Trash2, Trophy, CheckCircle2, Clock, Eye, Megaphone, Send } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminDashboardData, deleteWordCard, generateInviteCode, createAnnouncement } from "@/app/actions/admin";
import { launchGlobalWeeklyChallenge } from "@/app/actions/championship_admin";
import type { AdminDashboardData } from "@/types/admin";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Invite Code State
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("student");
  const [invitePodId, setInvitePodId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Championship State
  const [cTheme, setCTheme] = useState("Innovation & Technology");
  const [cTitle, setCTitle] = useState("Week 3 Challenge");
  const [cDeadline, setCDeadline] = useState(new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]);
  const [cTask, setCTask] = useState("Present a 16-minute seamless story as a Pod. Each member must speak for 2 minutes on how emerging AI tools impact your local community. Ensure smooth transitions between speakers.");
  const [cRules, setCRules] = useState("Only one submission per Pod.\nAll members must participate.\nEvaluated by Peer Pods, Mentors, and Faculty.");
  const [isLaunching, setIsLaunching] = useState(false);

  // Announcement Broadcast State
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastScope, setBroadcastScope] = useState<"global" | "pod">("global");
  const [broadcastPodId, setBroadcastPodId] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  const handlePostBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      alert("Please provide both a title and message for the announcement.");
      return;
    }
    setIsBroadcasting(true);
    setBroadcastSuccess(false);
    try {
      await createAnnouncement(broadcastTitle, broadcastMessage, broadcastScope, broadcastPodId || undefined);
      setBroadcastSuccess(true);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setTimeout(() => setBroadcastSuccess(false), 5000);
      alert("Broadcast announcement successfully sent to all target users!");
    } catch (err: any) {
      alert(err.message || "Failed to post broadcast");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const loadData = () => {
    setLoading(true);
    getAdminDashboardData().then(d => {
      setData(d);
      setLoading(false);
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const handleEditClick = (word: any) => {
    router.push(`/admin/words?id=${word.id}`);
  };

  const handleDeleteClick = async (id: string) => {
    if (!confirm("Are you sure you want to delete this word?")) return;
    try {
      await deleteWordCard(id);
      loadData();
    } catch (e) {
      alert("Failed to delete word");
    }
  };

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    try {
      const result = await generateInviteCode(inviteRole, invitePodId || null);
      setGeneratedCode(result.code);
      loadData(); // Refresh pending invites stat
    } catch (e) {
      alert("Failed to generate invite code.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading && !data) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-8 pb-12 flex justify-center items-center h-[50vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!data) {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-8 pb-12 flex flex-col justify-center items-center h-[50vh] text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-2xl font-bold">Failed to load dashboard</h2>
          <p className="text-muted-foreground mt-2">You may not be authorized, or there was a database error.</p>
        </div>
      </DashboardLayout>
    );
  }

  const stats = {
    totalUsers: data?.platformStats?.totalStudents || 0,
    activePods: data?.platformStats?.activePods || 0,
    completionRate: `${data?.platformStats?.avgCompletionRate || 0}%`,
    pendingInvites: data?.platformStats?.pendingInvites || 0,
    pendingAiJobs: data?.platformStats?.pendingAiJobs || 0,
    failedAiJobs: data?.platformStats?.failedAiJobs || 0
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex justify-between items-end border-b border-border/50 pb-6">
          <div>
            <h1 className="text-3xl font-bold font-heading flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" /> Admin Control Center
            </h1>
            <p className="text-muted-foreground mt-2">Manage pods, users, and platform settings globally.</p>
          </div>
          <PremiumButton onClick={() => setShowInviteModal(true)}>
            <KeyRound className="w-4 h-4 mr-2" /> Generate Invite Code
          </PremiumButton>
        </div>

        {/* Simple Invite Code Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <PremiumCard className="w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-4">Generate Invite Code</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Role</label>
                  <select 
                    value={inviteRole} 
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-card text-foreground border border-border/60 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="student" className="bg-card text-foreground">Student</option>
                    <option value="mentor" className="bg-card text-foreground">Mentor</option>
                    <option value="admin" className="bg-card text-foreground">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Assign to Pod (Optional)</label>
                  <select 
                    value={invitePodId} 
                    onChange={(e) => setInvitePodId(e.target.value)}
                    className="w-full bg-card text-foreground border border-border/60 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="" className="bg-card text-foreground">None (Floating User)</option>
                    {data?.pods?.map(pod => (
                      <option key={pod.id} value={pod.id} className="bg-card text-foreground">{pod.name}</option>
                    ))}
                  </select>
                </div>
                
                {generatedCode ? (
                  <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Code Generated Successfully!</p>
                    <p className="text-2xl font-bold font-mono tracking-widest text-primary">{generatedCode}</p>
                    <button 
                      onClick={() => navigator.clipboard.writeText(generatedCode)}
                      className="text-sm text-primary hover:underline"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                ) : (
                  <PremiumButton onClick={handleGenerateInvite} disabled={isGenerating} className="w-full">
                    {isGenerating ? "Generating..." : "Generate"}
                  </PremiumButton>
                )}
                
                <button 
                  onClick={() => {
                    setShowInviteModal(false);
                    setGeneratedCode(null);
                    setInvitePodId("");
                  }}
                  className="w-full px-4 py-2 mt-2 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  Close
                </button>
              </div>
            </PremiumCard>
          </div>
        )}

        {/* Dynamic Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-border/50 pb-px">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === "overview" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === "content" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Curriculum
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === "users" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Users & Roster
          </button>
          <button
            onClick={() => setActiveTab("championships")}
            className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${activeTab === "championships" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Championships
          </button>
        </div>

        {activeTab === "overview" && data && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <PremiumCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Pods</p>
                    <p className="text-2xl font-bold">{stats.activePods}</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center text-success">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg. Completion Rate</p>
                    <p className="text-2xl font-bold">{stats.completionRate}</p>
                  </div>
                </div>
              </PremiumCard>
              
              <PremiumCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Invites</p>
                    <p className="text-2xl font-bold">{stats.pendingInvites}</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending AI Jobs</p>
                    <p className="text-2xl font-bold">{stats.pendingAiJobs}</p>
                  </div>
                </div>
              </PremiumCard>

              <PremiumCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failed AI Jobs</p>
                    <p className="text-2xl font-bold">{stats.failedAiJobs}</p>
                  </div>
                </div>
              </PremiumCard>
            </div>
            
            {/* Announcements & Broadcasts Composer */}
            <PremiumCard className="p-6 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 via-card to-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4 border-b border-border/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-xl">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Announcements & Broadcasts</h2>
                    <p className="text-xs text-muted-foreground">Send real-time alerts to all students and mentors or target a specific pod</p>
                  </div>
                </div>
                {broadcastSuccess && (
                  <span className="text-xs bg-success/20 text-success font-bold px-3 py-1 rounded-full border border-success/30 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Broadcast Sent Successfully!
                  </span>
                )}
              </div>

              <form onSubmit={handlePostBroadcast} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Announcement Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Championship Finals This Sunday!"
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full bg-background/60 border border-border/70 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Target Audience</label>
                    <select
                      value={broadcastScope}
                      onChange={(e) => setBroadcastScope(e.target.value as "global" | "pod")}
                      className="w-full bg-background/60 border border-border/70 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                      <option value="global">Global (All Students & Mentors)</option>
                      <option value="pod">Specific Pod Only</option>
                    </select>
                  </div>
                </div>

                {broadcastScope === "pod" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Select Target Pod</label>
                    <select
                      value={broadcastPodId}
                      onChange={(e) => setBroadcastPodId(e.target.value)}
                      className="w-full bg-background/60 border border-border/70 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 outline-none"
                    >
                      <option value="">Select a Pod...</option>
                      {data?.pods?.map((pod) => (
                        <option key={pod.id} value={pod.id}>
                          {pod.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Broadcast Message</label>
                  <textarea
                    placeholder="e.g. Make sure all pod presentations are uploaded by 8 PM IST."
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    rows={2}
                    className="w-full bg-background/60 border border-border/70 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                  />
                </div>

                <div className="flex justify-end">
                  <PremiumButton
                    type="submit"
                    disabled={isBroadcasting}
                    className="px-6 font-semibold flex items-center gap-2"
                  >
                    {isBroadcasting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Post Broadcast Announcement
                      </>
                    )}
                  </PremiumButton>
                </div>
              </form>
            </PremiumCard>

            {/* Unified Live Review & Anti-Copying Tracker Card */}
            <PremiumCard className="p-6">
              <div className="flex items-center justify-between mb-6 border-b border-border/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Live Review Queue & Anti-Copying Tracker</h2>
                    <p className="text-xs text-muted-foreground">Real-time status of Buddy reviews, Peer reviews, and active 7-day anti-echo holds</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  {data?.reviewTracker?.length || 0} Active Missions
                </span>
              </div>

              {/* 3 Core Overview Metric Pills */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center">
                  <div className="text-2xl font-bold text-primary">{data?.quarantineStats?.totalWordsInVault || 100}</div>
                  <div className="text-sm font-semibold text-foreground mt-1">Total Vault Words</div>
                  <div className="text-[11px] text-muted-foreground">100-Day Semester Curriculum</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center">
                  <div className="text-2xl font-bold text-amber-400">{data?.reviewTracker?.length || 0}</div>
                  <div className="text-sm font-semibold text-foreground mt-1">Active Missions in Queue</div>
                  <div className="text-[11px] text-muted-foreground">Awaiting peer feedback</div>
                </div>
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center">
                  <div className="text-2xl font-bold text-emerald-400">{data?.quarantineStats?.totalCompletedRituals || 0}</div>
                  <div className="text-sm font-semibold text-foreground mt-1">Completed Daily Missions</div>
                  <div className="text-[11px] text-muted-foreground">Across all student histories</div>
                </div>
              </div>

              {/* Unified Table */}
              <div className="overflow-x-auto rounded-xl border border-border/50 bg-muted/10">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider bg-muted/20">
                      <th className="py-3 px-4 font-semibold">Student (Speaker)</th>
                      <th className="py-3 px-4 font-semibold">Pod / Word</th>
                      <th className="py-3 px-4 font-semibold">Buddy Reviewer</th>
                      <th className="py-3 px-4 font-semibold">Peer Reviewer</th>
                      <th className="py-3 px-4 font-semibold">🛡️ 7-Day Anti-Echo Hold</th>
                      <th className="py-3 px-4 font-semibold text-right">Submitted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {data?.reviewTracker && data.reviewTracker.length > 0 ? (
                      data.reviewTracker.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">{item.studentName}</div>
                            <div className="text-xs text-muted-foreground">{item.studentEmail}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2 py-0.5 text-xs rounded bg-muted font-medium text-foreground mr-1.5">
                              {item.podName}
                            </span>
                            <span className="text-xs text-primary font-bold">{item.word}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {item.buddyReviewer ? (
                              item.buddyReviewer.status === 'completed' ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> {item.buddyReviewer.name}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                                  <Clock className="w-3.5 h-3.5" /> {item.buddyReviewer.name} (Pending)
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            {item.peerReviewer ? (
                              item.peerReviewer.status === 'completed' ? (
                                <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> {item.peerReviewer.name}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                                  <Clock className="w-3.5 h-3.5" /> {item.peerReviewer.name} (Pending)
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-xs">
                            {item.holdDate ? (
                              <div className="space-y-0.5">
                                <div className="text-muted-foreground">
                                  🔒 <strong className="text-foreground">{item.word}</strong> frozen
                                </div>
                                <div className="text-[11px] text-amber-400 font-medium">
                                  Holds until {item.holdDate}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right text-xs text-muted-foreground">
                            {item.submittedAt}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                          No active daily missions in the review queue yet today.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </PremiumCard>
            
            <PremiumCard className="p-6">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {data?.recentActivity?.length > 0 ? data.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                )) : (
                  <p className="text-muted-foreground">No recent activity.</p>
                )}
              </div>
            </PremiumCard>
          </div>
        )}

        {activeTab === "content" && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <PremiumCard className="p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Upcoming Words
                </h2>
                <div className="space-y-4">
                  {data?.upcomingWords?.map((word) => (
                    <div key={word.id} className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50 group hover:border-primary/50 transition-colors">
                      <div>
                        <p className="font-bold text-lg">{word.word}</p>
                        <p className="text-sm text-muted-foreground">Scheduled for: {word.date}</p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClick(word)} className="p-2 text-muted-foreground hover:text-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteClick(word.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {data.upcomingWords.length === 0 && (
                    <p className="text-muted-foreground">No upcoming words scheduled.</p>
                  )}
                </div>
              </PremiumCard>
            </div>

            <div>
              <PremiumCard className="p-6 h-full flex flex-col">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-secondary" /> Word Vault Manager
                </h2>
                
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  Use the advanced 16-field AI Word Editor to create new words, generate missing fields, and manage publishing statuses.
                </p>
                
                <PremiumButton onClick={() => router.push('/admin/words')} className="w-full">
                  Launch AI Word Editor
                </PremiumButton>
              </PremiumCard>
            </div>
            <div>
              <PremiumCard className="p-6 h-full flex flex-col">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Roster Management
                </h2>
                
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  Manage the SKYLD-LDOS Hierarchy. Assign students to Batches, Units, Pods, and configure Buddy Pairs manually.
                </p>
                
                <PremiumButton onClick={() => router.push('/admin/roster')} className="w-full">
                  Manage Social Hierarchy
                </PremiumButton>
              </PremiumCard>
            </div>
          </div>
        )}
        
        {activeTab === "users" && data && (
          <PremiumCard className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border/50">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Global User Directory
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/50">
                    <th className="px-6 py-4 font-semibold text-sm text-muted-foreground">Name</th>
                    <th className="px-6 py-4 font-semibold text-sm text-muted-foreground">Email</th>
                    <th className="px-6 py-4 font-semibold text-sm text-muted-foreground">Role</th>
                    <th className="px-6 py-4 font-semibold text-sm text-muted-foreground">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.allUsers?.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-medium">{user.full_name || "Unknown"}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email || "No Email"}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' :
                          user.role === 'mentor' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                          'bg-muted text-muted-foreground border-border/50'
                        }`}>
                          {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "Student"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{user.created_at}</td>
                    </tr>
                  ))}
                  {data.allUsers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PremiumCard>
        )}

        {activeTab === "championships" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <PremiumCard className="p-8 border-l-4 border-l-purple-500">
              <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-warning" /> Launch Weekly Challenge
              </h2>
              <p className="text-muted-foreground mb-8">Deploy a new Weekly Challenge globally to all active Pods. This will automatically close any previous challenge and start a new championship week.</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2">Theme</label>
                  <input type="text" value={cTheme} onChange={e => setCTheme(e.target.value)} className="w-full bg-background/50 border border-border rounded-xl p-4 focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2">Title</label>
                  <input type="text" value={cTitle} onChange={e => setCTitle(e.target.value)} className="w-full bg-background/50 border border-border rounded-xl p-4 focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2 flex items-center justify-between">
                    <span>Submission Deadline (End Date)</span>
                    <span className="text-xs text-primary font-normal">All pod submissions lock automatically after this date</span>
                  </label>
                  <input type="date" value={cDeadline} onChange={e => setCDeadline(e.target.value)} className="w-full bg-background/50 border border-border rounded-xl p-4 focus:ring-2 focus:ring-primary/50 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2">Task Description</label>
                  <textarea value={cTask} onChange={e => setCTask(e.target.value)} className="w-full bg-background/50 border border-border rounded-xl p-4 min-h-[120px] focus:ring-2 focus:ring-primary/50 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-muted-foreground mb-2">Rules (Line separated)</label>
                  <textarea value={cRules} onChange={e => setCRules(e.target.value)} className="w-full bg-background/50 border border-border rounded-xl p-4 min-h-[100px] focus:ring-2 focus:ring-primary/50 outline-none resize-none" />
                </div>
                
                <PremiumButton 
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white py-4"
                  disabled={isLaunching}
                  onClick={async () => {
                    setIsLaunching(true);
                    try {
                      await launchGlobalWeeklyChallenge(cTheme, cTitle, cTask, cRules, cDeadline);
                      alert("Challenge successfully launched to all Pods!");
                    } catch (e: any) {
                      alert(e.message);
                    } finally {
                      setIsLaunching(false);
                    }
                  }}
                >
                  {isLaunching ? "Launching Challenge..." : "Launch Global Challenge Now"}
                </PremiumButton>
              </div>
            </PremiumCard>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
