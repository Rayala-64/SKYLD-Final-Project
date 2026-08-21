"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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
  if (!profile || profile.role !== 'admin') throw new Error("Unauthorized");
  
  return user;
}

export async function getRosterData() {
  await verifyAdmin();
  const adminClient = getAdminClient();

  // Fetch all organizational data
  const { data: batches } = await adminClient.from('batches').select('*').order('created_at', { ascending: false });
  const { data: units } = await adminClient.from('units').select('*').order('created_at', { ascending: false });
  const { data: pods } = await adminClient.from('pods').select('*').order('name', { ascending: true });
  
  // Fetch users (students)
  const { data: students } = await adminClient.from('users').select('id, full_name, email, batch_id, unit_id, pod_id').eq('role', 'student').order('full_name', { ascending: true });
  
  // Fetch buddy pairs
  const { data: buddy_pairs } = await adminClient.from('buddy_pairs').select('id, pod_id, user1_id, user2_id, active').eq('active', true);

  return {
    batches: batches || [],
    units: units || [],
    pods: pods || [],
    students: students || [],
    buddy_pairs: buddy_pairs || []
  };
}

export async function createOrganization(type: 'batch' | 'unit' | 'pod', name: string, parentId?: string, startDate?: string) {
  await verifyAdmin();
  const adminClient = getAdminClient();
  
  if (type === 'batch') {
    const batchStartDate = startDate || new Date().toISOString().split('T')[0];
    const { data, error } = await adminClient.from('batches').insert({ 
      name,
      start_date: batchStartDate
    }).select().single();
    if (error) throw error;
    return data;
  } else if (type === 'unit') {
    if (!parentId) throw new Error("Unit requires a batch ID");
    const { data, error } = await adminClient.from('units').insert({ name, batch_id: parentId }).select().single();
    if (error) throw error;
    return data;
  } else if (type === 'pod') {
    if (!parentId) throw new Error("Pod requires a unit ID");
    const { data, error } = await adminClient.from('pods').insert({ name, unit_id: parentId }).select().single();
    if (error) throw error;
    return data;
  }
}

export async function assignStudent(studentId: string, type: 'batch_id' | 'unit_id' | 'pod_id', targetId: string | null) {
  await verifyAdmin();
  const adminClient = getAdminClient();
  const { error } = await adminClient.from('users').update({ [type]: targetId }).eq('id', studentId);
  if (error) throw error;
  return { success: true };
}

export async function createBuddyPair(podId: string, user1Id: string, user2Id: string) {
  const user = await verifyAdmin();
  const adminClient = getAdminClient();

  if (user1Id === user2Id) throw new Error("Cannot pair a student with themselves");
  
  // Ensure order user1 < user2
  const u1 = user1Id < user2Id ? user1Id : user2Id;
  const u2 = user1Id < user2Id ? user2Id : user1Id;

  // Insert the pair
  const { error } = await adminClient.from('buddy_pairs').insert({
    pod_id: podId,
    user1_id: u1,
    user2_id: u2,
    active: true,
    created_by: user.id
  });

  if (error) {
    if (error.code === '23505') { // Unique violation
      throw new Error("One or both students are already in an active buddy pair.");
    }
    throw error;
  }
  return { success: true };
}

