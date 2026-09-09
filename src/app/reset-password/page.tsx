import { updatePassword } from "@/app/actions/auth";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/animations/FadeIn";
import { AlertTriangle, KeyRound, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Protect the route: Only users who arrived via a valid recovery link (and are thus authenticated) can see this page.
  if (!user) {
    redirect("/login?error=" + encodeURIComponent("Invalid or expired password reset session. Please request a new link."));
  }

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

          {resolvedSearchParams.error && (
            <FadeIn className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium leading-relaxed">{resolvedSearchParams.error}</p>
            </FadeIn>
          )}

          <form action={updatePassword} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">New Password</Label>
              <Input id="password" name="password" type="password" required minLength={6} placeholder="At least 6 characters" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Confirm Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={6} placeholder="Repeat new password" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
            </div>
            
            <PremiumButton type="submit" className="w-full h-12 mt-6 text-base shadow-lg glow-primary">
              <KeyRound className="w-4 h-4 mr-2" /> Update Password
            </PremiumButton>
          </form>
        </PremiumCard>
      </FadeIn>
    </div>
  );
}
