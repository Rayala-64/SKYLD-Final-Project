import { login } from "@/app/actions/auth";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/animations/FadeIn";
import Link from "next/link";
import { ArrowRight, Lock, AlertTriangle } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { QuickDemoAccounts } from "@/components/auth/QuickDemoAccounts";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      {/* Decorative Left Side */}
      <div className="hidden lg:flex w-1/2 relative bg-card items-center justify-center border-r border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent" />
        <div className="absolute w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] -left-64 -bottom-64 animate-pulse" />
        <FadeIn delay={0.2} className="relative z-10 p-12 max-w-xl text-center">
          <Lock className="w-16 h-16 text-primary mx-auto mb-8 opacity-80" />
          <h2 className="text-4xl font-extrabold text-glow mb-4">Secure Access</h2>
          <p className="text-muted-foreground text-lg">Enter the Vault to master your vocabulary with real-time AI feedback and private speech evaluation.</p>
        </FadeIn>
      </div>

      {/* Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] -mr-64 -mt-64 animate-pulse" />
        
        <FadeIn delay={0.1} className="w-full max-w-md relative z-10">
          <PremiumCard className="p-8 md:p-10" glass>
            <div className="flex flex-col items-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.5)] mb-6">
                <Lock className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Welcome Back</h1>
              <p className="text-muted-foreground text-center mt-3">Sign in to your SKYLD account</p>
            </div>

            {resolvedSearchParams.error && (
              <FadeIn className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium leading-relaxed">{resolvedSearchParams.error}</p>
              </FadeIn>
            )}

            <form action={login} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email Address</Label>
                <Input id="email" name="email" type="email" required placeholder="name@skyld.com" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Password</Label>
                </div>
                <Input id="password" name="password" type="password" required placeholder="Enter your password" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
              </div>
              <PremiumButton type="submit" className="w-full h-12 mt-8 text-base shadow-lg glow-primary">
                Access Vault <ArrowRight className="w-5 h-5 ml-2" />
              </PremiumButton>
            </form>

            <QuickDemoAccounts />

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Have an invite code? <Link href="/signup" className="text-primary hover:text-white transition-colors hover:underline font-medium">Create an account</Link>
            </div>
          </PremiumCard>
        </FadeIn>
      </div>
    </div>
  );
}
