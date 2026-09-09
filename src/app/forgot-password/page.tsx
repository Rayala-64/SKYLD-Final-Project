import { resetPassword } from "@/app/actions/auth";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/animations/FadeIn";
import Link from "next/link";
import { ArrowLeft, KeyRound, AlertTriangle, CheckCircle2 } from "lucide-react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string, success?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const isSuccess = resolvedSearchParams.success === "true";

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden items-center justify-center p-6">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {/* Decorative Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
      <div className="absolute w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />

      <FadeIn delay={0.1} className="w-full max-w-md relative z-10">
        <PremiumCard className="p-8 md:p-10" glass>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.5)] mb-6">
              <KeyRound className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Reset Password</h1>
            <p className="text-muted-foreground text-center mt-3">
              {isSuccess 
                ? "Check your email for the recovery link."
                : "Enter your email and we'll send you a link to reset your password."}
            </p>
          </div>

          {resolvedSearchParams.error && (
            <FadeIn className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium leading-relaxed">{resolvedSearchParams.error}</p>
            </FadeIn>
          )}

          {isSuccess ? (
            <FadeIn className="space-y-6 text-center">
              <div className="p-6 rounded-xl bg-success/10 border border-success/20">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-bold text-success mb-2">Email Sent</h3>
                <p className="text-sm text-muted-foreground">
                  If an account exists for that email, we have sent a secure link to reset your password.
                </p>
              </div>
              <Link href="/login" className="inline-flex items-center text-sm font-medium text-primary hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Return to Login
              </Link>
            </FadeIn>
          ) : (
            <form action={resetPassword} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email Address</Label>
                <Input id="email" name="email" type="email" required placeholder="name@skyld.com" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
              </div>
              
              <PremiumButton type="submit" className="w-full h-12 mt-6 text-base shadow-lg glow-primary">
                Send Reset Link
              </PremiumButton>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-white transition-colors font-medium">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </PremiumCard>
      </FadeIn>
    </div>
  );
}
