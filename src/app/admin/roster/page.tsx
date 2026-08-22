"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { useState, useEffect } from "react";
import { getRosterData, createOrganization, assignStudent, createBuddyPair, assignMentor, deleteOrganization } from "@/app/actions/admin_roster";
import { Loader2, Users, ArrowRight, UserPlus, Trash2 } from "lucide-react";

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
    try {
      const roster = await getRosterData();
      setData(roster);
    } catch (e: any) {
      alert("Failed to load roster data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (type: 'batch' | 'unit' | 'pod', name: string, parentId?: string) => {
    if (!name || !name.trim()) return alert("Name is required");
    if (type === 'unit' && !parentId) return alert("Please select a Batch for the new Unit.");
    if (type === 'pod' && !parentId) return alert("Please select a Unit for the new Pod.");

    try {
      const res = await createOrganization(type, name.trim(), parentId);
      if (res?.error) return alert("Error: " + res.error);
      
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      alert(`✅ ${label} "${name.trim()}" created successfully!`);
      
      setNewBatchName(""); 
      setNewUnitName(""); 
      setNewPodName("");
      setNewUnitBatch(""); 
      setNewPodUnit("");
      await loadData();
    } catch (e: any) {
      alert("Unexpected error: " + e.message);
    }
  };

  const handleAssign = async (studentId: string, type: 'batch_id' | 'unit_id' | 'pod_id', targetId: string) => {
    try {
      const res = await assignStudent(studentId, type, targetId || null);
      if (res?.error) return alert("Error: " + res.error);
      await loadData();
    } catch (e: any) {
      alert("Unexpected error: " + e.message);
    }
  };

  const handleCreateBuddyPair = async () => {
    if (!buddyPod || !buddy1 || !buddy2) return alert("Select a Pod and two distinct students.");
    try {
      const res = await createBuddyPair(buddyPod, buddy1, buddy2);
      if (res?.error) return alert("Error: " + res.error);
      
      alert("✅ Buddy pair created successfully!");
      setBuddy1(""); setBuddy2("");
      await loadData();
    } catch (e: any) {
      alert("Unexpected error: " + e.message);
    }
  };

  const handleMentorAssign = async (mentorId: string, orgType: 'unit' | 'pod', orgId: string, action: 'add' | 'remove') => {
    try {
      const res = await assignMentor(mentorId, orgType, orgId, action);
      if (res?.error) return alert("Error: " + res.error);
      await loadData();
    } catch (e: any) {
      alert("Unexpected error: " + e.message);
    }
  };

  const handleDeleteOrg = async (type: 'batch' | 'unit' | 'pod', id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${type} "${name}"? This will cascade and delete all nested items.`)) return;
    try {
      const res = await deleteOrganization(type, id);
      if (res?.error) return alert(res.error);
      loadData();
    } catch (e: any) {
      alert("Unexpected error: " + e.message);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;

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
                  <select value={newUnitBatch} onChange={e=>setNewUnitBatch(e.target.value)} className="w-full mb-2 bg-card text-foreground border border-border/60 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none">
                    <option value="" className="bg-card text-foreground">Select Batch...</option>
                    {data?.batches.map((b: any) => <option key={b.id} value={b.id} className="bg-card text-foreground">{b.name}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <input value={newUnitName} onChange={e=>setNewUnitName(e.target.value)} placeholder="Unit Name" className="w-full bg-background border border-border/50 rounded-lg p-2 text-sm" />
                    <PremiumButton onClick={() => handleCreateOrg('unit', newUnitName, newUnitBatch)} className="px-3 py-2 text-sm">Add</PremiumButton>
                  </div>
                </div>

                <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                  <label className="block text-xs font-bold uppercase mb-2">New Pod</label>
                  <select value={newPodUnit} onChange={e=>setNewPodUnit(e.target.value)} className="w-full mb-2 bg-card text-foreground border border-border/60 rounded-lg p-2 text-sm focus:ring-2 focus:ring-primary/50 outline-none">
                    <option value="" className="bg-card text-foreground">Select Unit...</option>
                    {data?.units.map((u: any) => <option key={u.id} value={u.id} className="bg-card text-foreground">{u.name}</option>)}
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
                <select value={buddyPod} onChange={e=>setBuddyPod(e.target.value)} className="w-full bg-card text-foreground border border-border/60 rounded-lg p-2 focus:ring-2 focus:ring-primary/50 outline-none">
                  <option value="" className="bg-card text-foreground">1. Select Pod...</option>
                  {data?.pods.map((p: any) => <option key={p.id} value={p.id} className="bg-card text-foreground">{p.name}</option>)}
                </select>
                <select value={buddy1} onChange={e=>setBuddy1(e.target.value)} className="w-full bg-card text-foreground border border-border/60 rounded-lg p-2 focus:ring-2 focus:ring-primary/50 outline-none">
                  <option value="" className="bg-card text-foreground">2. Select Student A...</option>
                  {data?.students.filter((s:any)=> s.pod_id === buddyPod).map((s: any) => <option key={s.id} value={s.id} className="bg-card text-foreground">{s.full_name}</option>)}
                </select>
                <select value={buddy2} onChange={e=>setBuddy2(e.target.value)} className="w-full bg-card text-foreground border border-border/60 rounded-lg p-2 focus:ring-2 focus:ring-primary/50 outline-none">
                  <option value="" className="bg-card text-foreground">3. Select Student B...</option>
                  {data?.students.filter((s:any)=> s.pod_id === buddyPod && s.id !== buddy1).map((s: any) => <option key={s.id} value={s.id} className="bg-card text-foreground">{s.full_name}</option>)}
                </select>
                <PremiumButton onClick={handleCreateBuddyPair} className="w-full mt-2">Pair Buddies</PremiumButton>
              </div>
            </PremiumCard>

            {/* Organization Tree */}
            <PremiumCard className="p-6">
              <h2 className="text-lg font-bold mb-4 border-b border-border/50 pb-2">Organization Tree</h2>
              {data?.batches.map((batch: any) => (
                <div key={batch.id} className="mb-4">
                  <div className="font-bold text-primary flex items-center gap-2">
                    {batch.name}
                    <button onClick={() => handleDeleteOrg('batch', batch.id, batch.name)} className="text-red-500/50 hover:text-red-500 cursor-pointer" title="Delete Batch"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  {data?.units.filter((u: any) => u.batch_id === batch.id).map((unit: any) => (
                    <div key={unit.id} className="ml-4 mt-2 border-l-2 border-border/50 pl-2">
                      <div className="font-semibold flex items-center gap-2">
                        {unit.name}
                        <button onClick={() => handleDeleteOrg('unit', unit.id, unit.name)} className="text-red-500/50 hover:text-red-500 cursor-pointer" title="Delete Unit"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                      {data?.pods.filter((p: any) => p.unit_id === unit.id).map((pod: any) => (
                        <div key={pod.id} className="ml-4 mt-1 text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                          {pod.name}
                          <button onClick={() => handleDeleteOrg('pod', pod.id, pod.name)} className="text-red-500/50 hover:text-red-500 ml-auto cursor-pointer" title="Delete Pod"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}

              {/* Unassigned / Floating Pods */}
              {data?.pods?.filter((p: any) => !p.unit_id || !data?.units?.some((u: any) => u.id === p.unit_id)).length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <div className="font-semibold text-xs uppercase tracking-wider text-amber-400 mb-2">Unassigned / Floating Pods</div>
                  {data?.pods?.filter((p: any) => !p.unit_id || !data?.units?.some((u: any) => u.id === p.unit_id)).map((pod: any) => (
                    <div key={pod.id} className="text-sm text-muted-foreground flex items-center gap-2 mb-1 pl-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      <span>{pod.name}</span>
                      <button onClick={() => handleDeleteOrg('pod', pod.id, pod.name)} className="text-red-500/50 hover:text-red-500 ml-auto cursor-pointer" title="Delete Pod"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
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
              <h2 className="text-lg font-bold mb-6 border-b border-border/50 pb-2">Mentor Assignments</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border/50 text-muted-foreground font-semibold">
                      <th className="px-4 py-3 rounded-tl-lg">Mentor</th>
                      <th className="px-4 py-3">Assigned Units</th>
                      <th className="px-4 py-3 rounded-tr-lg">Assigned Pods</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.mentors?.map((mentor: any) => (
                      <tr key={mentor.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{mentor.full_name}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {data?.unit_mentors?.filter((um:any) => um.mentor_id === mentor.id).map((um:any) => {
                              const unitName = data?.units?.find((u:any) => u.id === um.unit_id)?.name;
                              return (
                                <div key={um.id} className="flex items-center gap-2 text-xs bg-muted/50 px-2 py-1 rounded">
                                  {unitName} <button onClick={() => handleMentorAssign(mentor.id, 'unit', um.unit_id, 'remove')} className="text-red-500 hover:text-red-400 ml-auto"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              );
                            })}
                            <select 
                              value="" 
                              onChange={(e) => { if (e.target.value) handleMentorAssign(mentor.id, 'unit', e.target.value, 'add'); }}
                              className="bg-card text-foreground border border-border/60 rounded-lg p-1.5 w-full text-xs focus:ring-2 focus:ring-primary/50 outline-none"
                            >
                              <option value="" className="bg-card text-foreground">+ Add Unit</option>
                              {data?.units.map((u: any) => <option key={u.id} value={u.id} className="bg-card text-foreground">{u.name}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {data?.pod_mentors?.filter((pm:any) => pm.mentor_id === mentor.id).map((pm:any) => {
                              const podName = data?.pods?.find((p:any) => p.id === pm.pod_id)?.name;
                              return (
                                <div key={pm.id} className="flex items-center gap-2 text-xs bg-muted/50 px-2 py-1 rounded">
                                  {podName} <button onClick={() => handleMentorAssign(mentor.id, 'pod', pm.pod_id, 'remove')} className="text-red-500 hover:text-red-400 ml-auto"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              );
                            })}
                            <select 
                              value="" 
                              onChange={(e) => { if (e.target.value) handleMentorAssign(mentor.id, 'pod', e.target.value, 'add'); }}
                              className="bg-card text-foreground border border-border/60 rounded-lg p-1.5 w-full text-xs focus:ring-2 focus:ring-primary/50 outline-none"
                            >
                              <option value="" className="bg-card text-foreground">+ Add Pod</option>
                              {data?.pods.map((p: any) => <option key={p.id} value={p.id} className="bg-card text-foreground">{p.name}</option>)}
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!data?.mentors || data.mentors.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">No mentors found.</td>
                      </tr>
                    )}
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
