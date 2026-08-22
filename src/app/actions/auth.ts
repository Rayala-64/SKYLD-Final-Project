"use server";

import { createClient } from "@/utils/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { checkRateLimit } from "@/utils/rateLimit";

import { LoginSchema, SignupSchema } from "@/utils/validation";

export async function login(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for") || "unknown-ip";
  
  // Rate limit: Enforced in production, relaxed in development for rapid testing
  if (process.env.NODE_ENV === "production") {
    const isAllowed = await checkRateLimit(`login_${ip}`, 10, 60000);
    if (!isAllowed) { // 10 attempts per minute
      redirect("/login?error=" + encodeURIComponent("Too many login attempts. Please try again later."));
    }
  }

  const rawEmail = (formData.get("email") as string || "").trim().toLowerCase();
  const rawPassword = formData.get("password") as string || "";

  const result = LoginSchema.safeParse({
    email: rawEmail,
    password: rawPassword
  });
  
  if (!result.success) {
    redirect("/login?error=" + encodeURIComponent(result.error.issues[0]?.message || "Validation Error"));
  }
  
  const { email, password } = result.data;
  
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  
  if (error) {
    console.error("Login failed", error);
    redirect("/login?error=Invalid email or password");
  }
  
  redirect("/");
}

export async function signup(formData: FormData) {
  const ip = (await headers()).get("x-forwarded-for") || "unknown-ip";
  
  if (process.env.NODE_ENV === "production") {
    const isAllowed = await checkRateLimit(`signup_${ip}`, 5, 60000);
    if (!isAllowed) {
      redirect("/signup?error=" + encodeURIComponent("Too many signup attempts. Please try again later."));
    }
  }

  const result = SignupSchema.safeParse({
    email: (formData.get("email") as string || "").trim().toLowerCase(),
    password: formData.get("password"),
    full_name: formData.get("full_name"),
    invite_code: formData.get("invite_code"),
    consent_given: formData.get("consent_given") === "on"
  });
  
  if (!result.success) {
    redirect("/signup?error=" + encodeURIComponent(result.error.issues[0]?.message || "Validation Error"));
  }
  
  const { email, password, full_name: fullName, invite_code: inviteCode } = result.data;
  
  const supabase = await createClient();
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
  
  // 1. Validate invite without consuming it yet
  const { data: inviteRows, error: inviteErr } = await adminClient
    .from("invites")
    .select("id, pod_id, role")
    .eq("code", inviteCode)
    .is("used_by", null)
    .gt("expires_at", new Date().toISOString());
    
  if (inviteErr || !inviteRows || inviteRows.length === 0) {
    redirect("/signup?error=Invalid or expired invite code");
  }
  
  // 2. Sign up user using Admin API to bypass the 3-emails-per-hour rate limit
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  
  if (error || !data.user) {
    console.error("Signup failed", error);
    redirect("/signup?error=Auth Error: " + encodeURIComponent(error?.message || "Failed to create account"));
  }

  // Immediately sign them in to establish the session
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (signInError) {
    console.error("Auto-signin failed", signInError);
  }
  
  // 3. Insert into public.users using Service Role
  const { error: profileErr } = await adminClient.from("users").insert({
    id: data.user.id,
    email,
    full_name: fullName,
    role: inviteRows[0].role,
    pod_id: inviteRows[0].pod_id,
    consent_given: true,
    consent_date: new Date().toISOString()
  });

  if (profileErr) {
    console.error("Failed to create public user profile", profileErr);
    await adminClient.auth.admin.deleteUser(data.user.id);
    redirect("/signup?error=Profile Creation Error: " + profileErr.message);
  }

  // 4. Atomically consume the invite
  const { data: updateData, error: updateErr } = await adminClient
    .from("invites")
    .update({ used_by: data.user.id })
    .eq("code", inviteCode)
    .is("used_by", null)
    .select();

  if (updateErr || !updateData || updateData.length === 0) {
    console.error("Invite claimed simultaneously or expired", updateErr);
    await adminClient.from("users").delete().eq("id", data.user.id);
    await adminClient.auth.admin.deleteUser(data.user.id);
    const detailedError = updateErr ? updateErr.message : "No rows updated for code " + inviteCode;
    redirect("/signup?error=Invite Claim Error: " + detailedError);
  }
  
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  try {
    const cookieStore = await cookies();
    cookieStore.getAll().forEach((c) => {
      if (c.name.startsWith("sb-") || c.name.includes("auth-token")) {
        cookieStore.delete(c.name);
      }
    });
  } catch {
    // Ignore cookie store errors in non-mutable contexts
  }

  redirect("/login");
}
