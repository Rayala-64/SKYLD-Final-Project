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

export async function getUserProfileData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const adminClient = getAdminClient();

  const { data: profile, error } = await adminClient
    .from('users')
    .select('id, email, full_name, role, level, total_xp, pod_id, unit_id, batch_id')
    .eq('id', user.id)
    .single();

  if (error) throw error;

  let batchName = null;
  let unitName = null;
  let podName = null;

  if (profile.batch_id) {
    const { data: b } = await adminClient.from('batches').select('name').eq('id', profile.batch_id).maybeSingle();
    batchName = b?.name;
  }
  if (profile.unit_id) {
    const { data: u } = await adminClient.from('units').select('name').eq('id', profile.unit_id).maybeSingle();
    unitName = u?.name;
  }
  if (profile.pod_id) {
    const { data: p } = await adminClient.from('pods').select('name').eq('id', profile.pod_id).maybeSingle();
    podName = p?.name;
  }

  return {
    user,
    profile: {
      ...profile,
      batches: batchName ? { name: batchName } : null,
      units: unitName ? { name: unitName } : null,
      pods: podName ? { name: podName } : null,
    }
  };
}

export async function updateProfileName(fullName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!fullName || fullName.trim().length < 2) {
    return { error: "Name must be at least 2 characters" };
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient
    .from('users')
    .update({ full_name: fullName.trim() })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/settings');
  revalidatePath('/vault/dashboard');
  return { success: true };
}

export async function updateAccountEmail(newEmail: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const trimmedEmail = newEmail.trim().toLowerCase();
  if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
    return { error: "Invalid email address format" };
  }

  const adminClient = getAdminClient();

  // Update in auth and public.users
  const { error: authErr } = await adminClient.auth.admin.updateUserById(user.id, {
    email: trimmedEmail,
    email_confirm: true
  });

  if (authErr) return { error: authErr.message };

  const { error: profileErr } = await adminClient
    .from('users')
    .update({ email: trimmedEmail })
    .eq('id', user.id);

  if (profileErr) return { error: profileErr.message };

  revalidatePath('/settings');
  return { success: true };
}

export async function updateAccountPassword(newPassword: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  const adminClient = getAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(user.id, {
    password: newPassword
  });

  if (error) return { error: error.message };

  return { success: true };
}
