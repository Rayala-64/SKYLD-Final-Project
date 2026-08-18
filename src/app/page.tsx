import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { StaggerText } from "@/components/animations/StaggerText";
import { FloatingElement } from "@/components/animations/FloatingElement";
import { FadeIn } from "@/components/animations/FadeIn";
import Link from "next/link";
import { BrainCircuit, Mic, Sparkles, ArrowRight, ShieldCheck, Zap, PenTool, Flame, Target, Trophy, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already logged in, redirect to appropriate dashboard
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
      
    if (profile) {
      if (profile.role === "student") redirect("/vault/dashboard");
      if (profile.role === "mentor") redirect("/mentor/dashboard");
      if (profile.role === "admin") redirect("/admin/dashboard");
    }
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden selection:bg-primary/30 font-sans">
      
      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[150px] animate-pulse delay-1000" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 w-full px-6 py-6 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <BrainCircuit className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">SKYLD</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <PremiumButton variant="ghost" className="hidden sm:inline-flex" asChild>
            <Link href="/login">Log In</Link>
          </PremiumButton>
          <PremiumButton asChild>
            <Link href="/signup">Start Your Journey <ArrowRight className="w-4 h-4 ml-2" /></Link>
          </PremiumButton>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 md:pt-32 pb-24 text-center">
        <FadeIn delay={0.2} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary mb-8 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold tracking-wide">AI-Powered Communication Coach</span>
        </FadeIn>
        
        <StaggerText 
          text="Build Better Communication."
          className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter"
        />
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mt-2 text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
          One Day at a Time.
        </h1>
        
        <FadeIn delay={0.6}>
          <p className="mt-8 text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto font-medium">
            Learn. Reflect. Speak. Improve.
          </p>
          <p className="mt-4 text-lg text-muted-foreground/80 max-w-2xl mx-auto font-light leading-relaxed">
            SKYLD is an AI-driven platform that turns communication growth into a daily habit. We combine proven learning mechanics with advanced speech and reflection analysis.
          </p>
        </FadeIn>

        <FadeIn delay={0.8} className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
          <PremiumButton size="lg" className="w-full sm:w-auto text-lg px-10 h-14 rounded-full shadow-[0_0_30px_rgba(var(--primary),0.4)]" asChild>
            <Link href="/signup">Start Your Journey</Link>
          </PremiumButton>
          <PremiumButton variant="outline" size="lg" className="w-full sm:w-auto text-lg px-10 h-14 rounded-full bg-background/50 backdrop-blur-md">
            See How It Works
          </PremiumButton>
        </FadeIn>
      </main>

      {/* The Daily Rhythm */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 border-t border-border/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">The Daily Rhythm</h2>
          <p className="text-lg text-muted-foreground">15 minutes a day to transform how you speak and write.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { step: "01", title: "Learn & Practice", icon: Target, desc: "Discover a powerful new word and practice it in context.", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            { step: "02", title: "Reflect", icon: PenTool, desc: "Write a short personal reflection using the word to internalize it.", color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20" },
            { step: "03", title: "Speak", icon: Mic, desc: "Record a 60-second video speaking your thought to build confidence.", color: "text-primary", bg: "bg-primary/10", border: "border-primary/20" },
            { step: "04", title: "Improve", icon: Sparkles, desc: "Get instant AI feedback on vocabulary, grammar, and fluency.", color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
          ].map((s, i) => (
            <FloatingElement key={i} delay={i * 0.2} yOffset={10} duration={4 + i}>
              <PremiumCard className={`p-8 h-full bg-card/40 border ${s.border} relative overflow-hidden group hover:bg-card transition-colors`}>
                <div className="absolute top-4 right-4 text-4xl font-extrabold text-foreground/5">{s.step}</div>
                <div className={`w-12 h-12 rounded-xl ${s.bg} flex items-center justify-center mb-6`}>
                  <s.icon className={`w-6 h-6 ${s.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </PremiumCard>
            </FloatingElement>
          ))}
        </div>
      </section>

      {/* Feature Showcase: AI Coach */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="w-full lg:w-1/2 space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary">
              <BrainCircuit className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">AI Coach</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold font-heading leading-tight">
              Personalized feedback, <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">instantly.</span>
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              SKYLD doesn't just grade you. Our AI acts as a supportive coach, celebrating your strengths, identifying areas for growth, and providing concrete challenges for tomorrow.
            </p>
            <ul className="space-y-4">
              {["Grammar & Vocabulary Scoring", "Fluency & Confidence Analysis", "Constructive Rewrites", "Zero Human Bias"].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  </div>
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="w-full lg:w-1/2">
            <PremiumCard className="p-8 bg-gradient-to-br from-card to-primary/5 border-primary/20 shadow-2xl relative">
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 blur-2xl rounded-full" />
              <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between border-b border-border/50 pb-4">
                  <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Speech Analysis</h3>
                  <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">Score: 85/100</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-1">Feedback</h4>
                    <p className="font-medium">"Great job using 'resilient' naturally! Your vocabulary is getting stronger."</p>
                  </div>
                  <div>
                    <h4 className="text-sm text-muted-foreground mb-1">Area of Focus</h4>
                    <p className="font-medium text-warning">"Try combining two shorter sentences into one stronger sentence tomorrow."</p>
                  </div>
                  <div className="pt-4 flex gap-4">
                    <div className="flex-1 bg-muted/50 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-success">90%</div>
                      <div className="text-xs text-muted-foreground mt-1">Fluency</div>
                    </div>
                    <div className="flex-1 bg-muted/50 p-4 rounded-xl text-center">
                      <div className="text-2xl font-bold text-secondary">82%</div>
                      <div className="text-xs text-muted-foreground mt-1">Clarity</div>
                    </div>
                  </div>
                </div>
              </div>
            </PremiumCard>
          </div>
        </div>
      </section>

      {/* Gamification */}
      <section className="relative z-10 w-full max-w-7xl mx-auto px-6 py-24 border-t border-border/50">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-4">Stay Motivated</h2>
          <p className="text-lg text-muted-foreground">Built on proven learning mechanics to keep you growing daily.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <PremiumCard className="p-8 text-center bg-card/40">
            <Flame className="w-12 h-12 text-warning mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Streaks</h3>
            <p className="text-muted-foreground text-sm">Build a daily habit. Watch your streak grow as you complete your missions.</p>
          </PremiumCard>
          <PremiumCard className="p-8 text-center bg-card/40">
            <Zap className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">XP & Levels</h3>
            <p className="text-muted-foreground text-sm">Earn XP for practicing, speaking, and reflecting. Level up from Explorer to Master.</p>
          </PremiumCard>
          <PremiumCard className="p-8 text-center bg-card/40">
            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Leagues & Badges</h3>
            <p className="text-muted-foreground text-sm">Unlock achievements and climb the leaderboard alongside your Pod.</p>
          </PremiumCard>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 w-full max-w-4xl mx-auto px-6 py-24 text-center">
        <PremiumCard className="p-12 bg-gradient-to-b from-primary/10 to-transparent border-primary/20 shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-bold font-heading mb-6">Ready to improve your communication?</h2>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join the students using SKYLD to speak with confidence and write with clarity.
          </p>
          <PremiumButton size="lg" className="w-full sm:w-auto text-lg px-12 h-16 rounded-full shadow-[0_0_40px_rgba(var(--primary),0.5)]" asChild>
            <Link href="/signup">Start Your Journey Today</Link>
          </PremiumButton>
        </PremiumCard>
      </section>

      <footer className="w-full border-t border-border/40 py-12 text-center text-muted-foreground">
        <div className="flex items-center justify-center gap-2 mb-4">
          <BrainCircuit className="w-5 h-5" />
          <span className="font-bold text-foreground tracking-tight">SKYLD</span>
        </div>
        <p className="text-sm">© {new Date().getFullYear()} SKYLD Word Vault. All rights reserved.</p>
      </footer>
    </div>
  );
}
