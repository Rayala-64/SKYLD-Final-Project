"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Users, LayoutDashboard, KeyRound, Shield, AlertTriangle, Activity, BookOpen, Plus, Loader2, Edit2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getAdminDashboardData, AdminDashboardData, addWordCard, updateWordCard, deleteWordCard, generateInviteCode } from "@/app/actions/admin";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [newWord, setNewWord] = useState("");
  const [newDefinition, setNewDefinition] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Invite Code State
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<string>("student");
  const [invitePodId, setInvitePodId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      if (editingId) {
        await updateWordCard(editingId, newWord, newDefinition, newExample, newDate);
        setMessage({ type: 'success', text: 'Word updated successfully!' });
      } else {
        await addWordCard(newWord, newDefinition, newExample, newDate);
        setMessage({ type: 'success', text: 'Word added successfully!' });
      }
      setEditingId(null);
      setNewWord("");
      setNewDefinition("");
      setNewExample("");
      setNewDate("");
      loadData(); // Reload data
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Failed to save word.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (word: any) => {
    setEditingId(word.id);
    setNewWord(word.word);
    setNewDefinition(word.definition || "");
    setNewExample(word.example || "");
    setNewDate(word.rawDate || "");
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

  const stats = {
    totalUsers: data?.platformStats.totalStudents || 0,
    activePods: data?.platformStats.activePods || 0,
    completionRate: `${data?.platformStats.avgCompletionRate || 0}%`,
    pendingInvites: data?.platformStats.pendingInvites || 0,
    pendingAiJobs: data?.platformStats.pendingAiJobs || 0,
    failedAiJobs: data?.platformStats.failedAiJobs || 0
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
                    className="w-full bg-muted/50 border border-border/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="student">Student</option>
                    <option value="mentor">Mentor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Assign to Pod (Optional)</label>
                  <select 
                    value={invitePodId} 
                    onChange={(e) => setInvitePodId(e.target.value)}
                    className="w-full bg-muted/50 border border-border/50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">None (Floating User)</option>
                    {data?.pods?.map(pod => (
                      <option key={pod.id} value={pod.id}>{pod.name}</option>
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

        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "overview" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab("content")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "content" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
          >
            Content Management
          </button>
          <button 
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === "users" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
          >
            User Directory
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
                  <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completion Rate</p>
                    <p className="text-2xl font-bold">{stats.completionRate}</p>
                  </div>
                </div>
              </PremiumCard>
              
              <PremiumCard className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                    <AlertTriangle className="w-6 h-6" />
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
            
            <PremiumCard className="p-6">
              <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {data.recentActivity.length > 0 ? data.recentActivity.map((activity) => (
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
                  {data.upcomingWords.map((word) => (
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
              <PremiumCard className="p-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-secondary" /> {editingId ? "Edit Word" : "Add New Word"}
                </h2>
                
                {message && (
                  <div className={`p-4 mb-6 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-destructive/10 text-destructive border border-destructive/20'}`}>
                    {message.text}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Word</label>
                    <input 
                      type="text" 
                      required
                      value={newWord}
                      onChange={(e) => setNewWord(e.target.value)}
                      className="w-full bg-muted/50 border border-border/50 rounded-xl p-3 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                      placeholder="e.g. Ubiquitous"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Definition</label>
                    <input 
                      type="text" 
                      required
                      value={newDefinition}
                      onChange={(e) => setNewDefinition(e.target.value)}
                      className="w-full bg-muted/50 border border-border/50 rounded-xl p-3 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                      placeholder="e.g. Present everywhere"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Example Sentence</label>
                    <textarea 
                      required
                      value={newExample}
                      onChange={(e) => setNewExample(e.target.value)}
                      className="w-full bg-muted/50 border border-border/50 rounded-xl p-3 focus:ring-2 focus:ring-primary/50 transition-all outline-none min-h-[100px] resize-none"
                      placeholder="e.g. His ubiquitous influence was felt by all."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Active Date</label>
                    <input 
                      type="date" 
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-muted/50 border border-border/50 rounded-xl p-3 focus:ring-2 focus:ring-primary/50 transition-all outline-none"
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <PremiumButton type="submit" disabled={isSubmitting} className="w-full">
                      {isSubmitting ? "Saving..." : editingId ? "Update Word" : "Add Word of the Day"}
                    </PremiumButton>
                    {editingId && (
                      <button 
                        type="button" 
                        onClick={() => {
                          setEditingId(null);
                          setNewWord("");
                          setNewDefinition("");
                          setNewExample("");
                          setNewDate("");
                        }}
                        className="px-4 py-2 border border-border/50 rounded-xl hover:bg-muted/50 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
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
                  {data.allUsers.map((user) => (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4 font-medium">{user.full_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                          user.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' :
                          user.role === 'mentor' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                          'bg-muted text-muted-foreground border-border/50'
                        }`}>
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
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
      </div>
    </DashboardLayout>
  );
}
