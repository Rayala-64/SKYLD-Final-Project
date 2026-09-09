"use client";

import { useState, useEffect } from "react";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/animations/FadeIn";
import { AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // The createBrowserClient automatically parses the #access_token from the URL hash 
    // and establishes the session when using Supabase Implicit Flow.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // If there's no session and no hash in the URL, the link is invalid
        if (typeof window !== "undefined" && !window.location.hash.includes('type=recovery')) {
           router.push("/login?error=" + encodeURIComponent("Invalid or expired password reset session. Please request a new link."));
        }
      }
    });
  }, [router, supabase.auth]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Update the password using the client-side session established by the email link
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    });

    if (updateError) {
      console.error("Update password error:", updateError);
      setError(updateError.message);
      setLoading(false);
    } else {
      // Once updated, sign out of the recovery session and redirect to login
      await supabase.auth.signOut();
      router.push("/login?message=" + encodeURIComponent("Password updated successfully. Please log in with your new password."));
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden items-center justify-center p-6">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="absolute w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />

      <FadeIn delay={0.1} className="w-full max-w-md relative z-10">
        <PremiumCard className="p-8 md:p-10" glass>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.5)] mb-6">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-center">Set New Password</h1>
            <p className="text-muted-foreground text-center mt-3">
              Your identity has been verified. Enter a secure new password below.
            </p>
          </div>

          {error && (
            <FadeIn className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium leading-relaxed">{error}</p>
            </FadeIn>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">New Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} placeholder="At least 6 characters" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Confirm Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} placeholder="Repeat new password" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
            </div>
            
            <PremiumButton type="submit" disabled={loading} className="w-full h-12 mt-6 text-base shadow-lg glow-primary">
              <KeyRound className="w-4 h-4 mr-2" /> {loading ? "Updating..." : "Update Password"}
            </PremiumButton>
          </form>
        </PremiumCard>
      </FadeIn>
    </div>
  );
}
