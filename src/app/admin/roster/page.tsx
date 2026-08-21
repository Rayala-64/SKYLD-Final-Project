"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { useState, useEffect } from "react";
import { getRosterData, createOrganization, assignStudent, createBuddyPair } from "@/app/actions/admin_roster";
import { Loader2, Users, ArrowRight, UserPlus } from "lucide-react";

export default function RosterPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Organization form state
  const [newBatchName, setNewBatchName] = useState("");
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitBatch, setNewUnitBatch] = useState("");
  const [newPodName, setNewPodName] = useState("");
  const [newPodUnit, setNewPodUnit] = useState("");

  // Buddy pairing form state
  const [buddyPod, setBuddyPod] = useState("");
  const [buddy1, setBuddy1] = useState("");
  const [buddy2, setBuddy2] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const roster = await getRosterData();
      setData(roster);
    } catch (e: any) {
      alert("Failed to load roster data: " + e.message);
    }
    setLoading(false);
  };

  const handleCreateOrg = async (type: 'batch' | 'unit' | 'pod', name: string, parentId?: string) => {
    if (!name) return alert("Name is required");
    try {
      await createOrganization(type, name, parentId);
      setNewBatchName(""); setNewUnitName(""); setNewPodName("");
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAssign = async (studentId: string, type: 'batch_id' | 'unit_id' | 'pod_id', targetId: string) => {
    try {
      await assignStudent(studentId, type, targetId || null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCreateBuddyPair = async () => {
    if (!buddyPod || !buddy1 || !buddy2) return alert("Select a Pod and two distinct students.");
    try {
      await createBuddyPair(buddyPod, buddy1, buddy2);
      setBuddy1(""); setBuddy2("");
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-24">
        
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div>
            <h1 className="text-3xl font-bold font-heading">Roster Management</h1>
            <p className="text-muted-foreground mt-1">Manage Batches, Units, Pods, and Buddy Pairs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Create Orgs */}
          <div className="md:col-span-1 space-y-6">
            <PremiumCard className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border/50 pb-2">
                <Users className="w-5 h-5 text-primary" /> Create Hierarchy
              </h2>
              
              <div className="space-y-4">
                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <label className="block text-xs font-bold uppercase mb-2">New Batch</label>
                  <div className="flex gap-2">
                    <input value={newBatchName} onChange={e=>setNewBatchName(e.target.value)} placeholder="Batch Name" className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm" />
                    <PremiumButton onClick={() => handleCreateOrg('batch', newBatchName)} className="px-3 py-2 text-sm">Add</PremiumButton>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <label className="block text-xs font-bold uppercase mb-2">New Unit</label>
                  <select value={newUnitBatch} onChange={e=>setNewUnitBatch(e.target.value)} className="w-full mb-2 bg-background border border-border/50 rounded-lg p-2 text-sm">
                    <option value="">Select Batch...</option>
                    {data?.batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input value={newUnitName} onChange={e=>setNewUnitName(e.target.value)} placeholder="Unit Name" className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm" />
                    <PremiumButton onClick={() => handleCreateOrg('unit', newUnitName, newUnitBatch)} className="px-3 py-2 text-sm">Add</PremiumButton>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <label className="block text-xs font-bold uppercase mb-2">New Pod</label>
                  <select value={newPodUnit} onChange={e=>setNewPodUnit(e.target.value)} className="w-full mb-2 bg-background border border-border/50 rounded-lg p-2 text-sm">
                    <option value="">Select Unit...</option>
                    {data?.units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input value={newPodName} onChange={e=>setNewPodName(e.target.value)} placeholder="Pod Name" className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm" />
                    <PremiumButton onClick={() => handleCreateOrg('pod', newPodName, newPodUnit)} className="px-3 py-2 text-sm">Add</PremiumButton>
                  </div>
                </div>
              </div>
            </PremiumCard>
            
            <PremiumCard className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-border/50 pb-2">
                <UserPlus className="w-5 h-5 text-secondary" /> Create Buddy Pair
              </h2>
              <div className="space-y-3 text-sm">
                <select value={buddyPod} onChange={e=>setBuddyPod(e.target.value)} className="w-full bg-muted border border-border/50 rounded-lg p-2">
                  <option value="">1. Select Pod...</option>
                  {data?.pods.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={buddy1} onChange={e=>setBuddy1(e.target.value)} className="w-full bg-muted border border-border/50 rounded-lg p-2">
                  <option value="">2. Select Student A...</option>
                  {data?.students.filter((s:any)=> s.pod_id === buddyPod).map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                <select value={buddy2} onChange={e=>setBuddy2(e.target.value)} className="w-full bg-muted border border-border/50 rounded-lg p-2">
                  <option value="">3. Select Student B...</option>
                  {data?.students.filter((s:any)=> s.pod_id === buddyPod && s.id !== buddy1).map((s: any) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                <PremiumButton onClick={handleCreateBuddyPair} className="w-full mt-2">Pair Buddies</PremiumButton>
              </div>
            </PremiumCard>
          </div>

          {/* Manage Students */}
          <div className="md:col-span-2 space-y-6">
            <PremiumCard className="p-6">
              <h2 className="text-lg font-bold mb-6 border-b border-border/50 pb-2">Student Assignments</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-lg">Student</th>
                      <th className="px-4 py-3">Batch</th>
                      <th className="px-4 py-3">Unit</th>
                      <th className="px-4 py-3 rounded-tr-lg">Pod</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.students.map((student: any) => (
                      <tr key={student.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{student.full_name}</td>
                        <td className="px-4 py-3">
                          <select 
                            value={student.batch_id || ""} 
                            onChange={(e) => handleAssign(student.id, 'batch_id', e.target.value)}
                            className="bg-transparent border border-border/50 rounded p-1 w-32"
                          >
                            <option value="">None</option>
                            {data?.batches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={student.unit_id || ""} 
                            onChange={(e) => handleAssign(student.id, 'unit_id', e.target.value)}
                            className="bg-transparent border border-border/50 rounded p-1 w-32"
                          >
                            <option value="">None</option>
                            {data?.units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={student.pod_id || ""} 
                            onChange={(e) => handleAssign(student.id, 'pod_id', e.target.value)}
                            className="bg-transparent border border-border/50 rounded p-1 w-32"
                          >
                            <option value="">None</option>
                            {data?.pods.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PremiumCard>

            <PremiumCard className="p-6">
              <h2 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">Active Buddy Pairs</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.buddy_pairs.map((pair: any) => {
                  const s1 = data.students.find((s:any)=>s.id === pair.user1_id)?.full_name || 'Unknown';
                  const s2 = data.students.find((s:any)=>s.id === pair.user2_id)?.full_name || 'Unknown';
                  const pod = data.pods.find((p:any)=>p.id === pair.pod_id)?.name || 'Unknown Pod';
                  return (
                    <div key={pair.id} className="p-4 bg-muted/20 border border-border/50 rounded-xl flex items-center justify-between">
                      <div className="text-sm font-medium">{s1} <ArrowRight className="inline w-3 h-3 text-muted-foreground mx-1" /> {s2}</div>
                      <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border border-border/50">{pod}</div>
                    </div>
                  );
                })}
                {data?.buddy_pairs.length === 0 && <div className="text-sm text-muted-foreground">No active buddy pairs.</div>}
              </div>
            </PremiumCard>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
