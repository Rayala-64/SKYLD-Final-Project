import { signup } from "@/app/actions/auth";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/animations/FadeIn";
import Link from "next/link";
import { ArrowRight, UserPlus, ShieldCheck, AlertTriangle } from "lucide-react";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedSearchParams = await searchParams;
  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Decorative Left Side */}
      <div className="hidden lg:flex w-1/2 relative bg-card items-center justify-center border-r border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-transparent" />
        <div className="absolute w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[100px] -left-64 -bottom-64 animate-pulse" />
        <FadeIn delay={0.2} className="relative z-10 p-12 max-w-xl text-center">
          <ShieldCheck className="w-16 h-16 text-secondary mx-auto mb-8 opacity-80" />
          <h2 className="text-4xl font-extrabold text-glow mb-4">Join Your Pod</h2>
          <p className="text-muted-foreground text-lg">Use your unique invite code to join your mentor's pod and begin your Daily Missions.</p>
        </FadeIn>
      </div>

      {/* Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] -mr-64 -mt-64 animate-pulse" />
        
        <FadeIn delay={0.1} className="w-full max-w-md relative z-10">
          <PremiumCard className="p-8 md:p-10" glass>
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-[0_0_30px_rgba(var(--secondary),0.5)] mb-6">
                <UserPlus className="w-7 h-7 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Create Account</h1>
            </div>

            {resolvedSearchParams.error && (
              <FadeIn className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium leading-relaxed">{resolvedSearchParams.error}</p>
              </FadeIn>
            )}

            <form action={signup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite_code" className="text-xs uppercase tracking-wider text-secondary font-semibold">Invite Code</Label>
                <Input id="invite_code" name="invite_code" required placeholder="POD-XXXX-XXXX" className="h-12 bg-background/50 border-white/10 focus-visible:ring-secondary focus-visible:border-secondary transition-all" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Full Name</Label>
                <Input id="full_name" name="full_name" required placeholder="John Doe" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Email Address</Label>
                <Input id="email" name="email" type="email" required placeholder="john@example.com" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Password</Label>
                <Input id="password" name="password" type="password" required placeholder="••••••••" className="h-12 bg-background/50 border-white/10 focus-visible:ring-primary focus-visible:border-primary transition-all" />
              </div>
              
              <div className="flex items-start space-x-3 mt-6 p-4 rounded-lg bg-black/20 border border-white/5">
                <input 
                  type="checkbox" 
                  id="consent" 
                  name="consent_given" 
                  required 
                  className="mt-1 w-4 h-4 rounded border-white/20 bg-background accent-primary" 
                />
                <Label htmlFor="consent" className="text-xs leading-relaxed text-muted-foreground">
                  I consent to SKYLD Word Vault™ storing my webcam video and audio recordings securely in a private vault. I understand my assigned mentor will review these recordings.
                </Label>
              </div>

              <PremiumButton type="submit" className="w-full h-12 mt-6 text-base shadow-lg glow-secondary" variant="secondary">
                Join Pod <ArrowRight className="w-5 h-5 ml-2" />
              </PremiumButton>
            </form>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="text-primary hover:text-white transition-colors hover:underline font-medium">Log in</Link>
            </div>
          </PremiumCard>
        </FadeIn>
      </div>
    </div>
  );
}
