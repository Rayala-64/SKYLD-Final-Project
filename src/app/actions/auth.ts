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
  const isAllowed = await checkRateLimit(`signup_${ip}`, 5, 60000);
  if (!isAllowed) { // 5 attempts per minute
    redirect("/signup?error=" + encodeURIComponent("Too many signup attempts. Please try again later."));
  }

  const result = SignupSchema.safeParse({
    email: formData.get("email"),
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
  
  // 2. Sign up user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error || !data.user) {
    console.error("Signup failed", error);
    redirect("/signup?error=Failed to create account. Email may already be in use.");
  }
  
  // 3. Atomically consume the invite
  const { data: claimData, error: claimErr } = await adminClient.rpc("claim_invite", {
    p_code: inviteCode,
    p_user_id: data.user.id
  });

  if (claimErr || !claimData?.success) {
    console.error("Invite claimed simultaneously", claimErr);
    await adminClient.auth.admin.deleteUser(data.user.id);
    redirect("/signup?error=This invite code was just used by someone else");
  }

  // 4. Insert into public.users using Service Role
  const { error: profileErr } = await adminClient.from("users").insert({
    id: data.user.id,
    email,
    full_name: fullName,
    role: claimData.role,
    pod_id: claimData.pod_id,
    consent_given: true,
    consent_date: new Date().toISOString()
  });

  if (profileErr) {
    console.error("Failed to create public user profile", profileErr);
    // Rollback the invite consumption
    await adminClient.from("invites").update({ used_by: null }).eq("code", inviteCode);
    await adminClient.auth.admin.deleteUser(data.user.id);
    redirect("/signup?error=Account creation failed during profile setup");
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
