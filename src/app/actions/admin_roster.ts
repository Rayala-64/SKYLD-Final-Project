"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized: Admin access required");
  
  return user;
}

export async function getRosterData() {
  await verifyAdmin();
  const adminClient = getAdminClient();

  // Fetch batches, units, pods
  const { data: batches } = await adminClient.from('batches').select('*').order('name', { ascending: true });
  const { data: units } = await adminClient.from('units').select('*').order('name', { ascending: true });
  const { data: pods, error: podErr } = await adminClient.from('pods').select('*').order('name', { ascending: true });
  if (podErr) console.error("Pod error:", podErr);
  
  // Fetch users (students and mentors)
  const { data: students } = await adminClient.from('users').select('id, full_name, email, batch_id, unit_id, pod_id').eq('role', 'student').order('full_name', { ascending: true });
  const { data: mentors } = await adminClient.from('users').select('id, full_name, email').eq('role', 'mentor').order('full_name', { ascending: true });
  
  // Fetch mentor assignments
  const { data: unit_mentors } = await adminClient.from('unit_mentors').select('*');
  const { data: pod_mentors } = await adminClient.from('pod_mentors').select('*');

  // Fetch buddy pairs
  const { data: buddy_pairs } = await adminClient.from('buddy_pairs').select('id, pod_id, user1_id, user2_id, active').eq('active', true);

  return {
    batches: batches || [],
    units: units || [],
    pods: pods || [],
    students: students || [],
    mentors: mentors || [],
    unit_mentors: unit_mentors || [],
    pod_mentors: pod_mentors || [],
    buddy_pairs: buddy_pairs || [],
  };
}

export async function createOrganization(type: 'batch' | 'unit' | 'pod', name: string, parentId?: string, startDate?: string) {
  try {
    await verifyAdmin();
    const adminClient = getAdminClient();
    
    if (type === 'batch') {
      const batchStartDate = startDate || new Date().toISOString().split('T')[0];
      const { data, error } = await adminClient.from('batches').insert({ 
        name,
        start_date: batchStartDate,
        active: true
      }).select().single();
      if (error) return { error: error.message };
      revalidatePath('/admin/roster');
      return { data };
    } else if (type === 'unit') {
      if (!parentId) return { error: "Unit requires a batch ID" };
      const { data, error } = await adminClient.from('units').insert({ name, batch_id: parentId, active: true }).select().single();
      if (error) return { error: error.message };
      revalidatePath('/admin/roster');
      return { data };
    } else if (type === 'pod') {
      if (!parentId) return { error: "Pod requires a unit ID" };
      const { data, error } = await adminClient.from('pods').insert({ name, unit_id: parentId }).select().single();
      if (error) return { error: error.message };
      revalidatePath('/admin/roster');
      return { data };
    }
  } catch (err: any) {
    return { error: err.message || "Failed to create organization" };
  }
}

export async function assignStudent(studentId: string, type: 'batch_id' | 'unit_id' | 'pod_id', targetId: string | null) {
  try {
    await verifyAdmin();
    const adminClient = getAdminClient();
    const { error } = await adminClient.from('users').update({ [type]: targetId }).eq('id', studentId);
    if (error) return { error: error.message };
    revalidatePath('/admin/roster');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to assign student" };
  }
}

export async function createBuddyPair(podId: string, user1Id: string, user2Id: string) {
  try {
    const user = await verifyAdmin();
    const adminClient = getAdminClient();

    if (user1Id === user2Id) return { error: "Cannot pair a student with themselves" };
    
    const u1 = user1Id < user2Id ? user1Id : user2Id;
    const u2 = user1Id < user2Id ? user2Id : user1Id;

    const { error } = await adminClient.from('buddy_pairs').insert({
      pod_id: podId,
      user1_id: u1,
      user2_id: u2,
      active: true,
      created_by: user?.id
    });

    if (error) {
      if (error.code === '23505') {
        return { error: "One or both students are already in an active buddy pair." };
      }
      return { error: error.message };
    }
    
    revalidatePath('/admin/roster');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to create buddy pair" };
  }
}

export async function assignMentor(mentorId: string, orgType: 'unit' | 'pod', orgId: string, action: 'add' | 'remove') {
  try {
    await verifyAdmin();
    const adminClient = getAdminClient();

    const table = orgType === 'unit' ? 'unit_mentors' : 'pod_mentors';
    const field = orgType === 'unit' ? 'unit_id' : 'pod_id';

    if (action === 'add') {
      const { error } = await adminClient.from(table).insert({ [field]: orgId, mentor_id: mentorId });
      if (error && error.code !== '23505') return { error: error.message }; // Ignore duplicate
    } else {
      const { error } = await adminClient.from(table).delete().match({ [field]: orgId, mentor_id: mentorId });
      if (error) return { error: error.message };
    }

    revalidatePath('/admin/roster');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function assignPodLeader(podId: string, studentId: string | null) {
  try {
    await verifyAdmin();
    const adminClient = getAdminClient();

    const { error } = await adminClient
      .from('pods')
      .update({ admin_id: studentId || null })
      .eq('id', podId);

    if (error) return { error: error.message };
    revalidatePath('/admin/roster');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteOrganization(type: 'batch' | 'unit' | 'pod', id: string) {
  try {
    await verifyAdmin();
    const adminClient = getAdminClient();
    const table = type === 'batch' ? 'batches' : type === 'unit' ? 'units' : 'pods';
    
    const { error } = await adminClient.from(table).delete().eq('id', id);
    if (error) return { error: error.message };

    revalidatePath('/admin/roster');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Failed to delete organization" };
  }
}
