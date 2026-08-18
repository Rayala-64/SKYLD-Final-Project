"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  Trophy,
  Users,
  Settings,
  LogOut,
  Menu,
  Archive,
  BookMarked,
  Map,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FadeIn } from "@/components/animations/FadeIn";
import { motion } from "framer-motion";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

import { createClient } from "@/utils/supabase/client";

// Dynamic links will be generated inside the component based on the pathname
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string, level: number } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('full_name, level').eq('id', user.id).single();
        if (data) {
          setUserProfile({
            full_name: data.full_name,
            level: data.level || 1
          });
        }
      }
    }
    fetchProfile();
  }, []);

  let sidebarLinks = [];
  if (pathname.startsWith("/admin")) {
    sidebarLinks = [
      { name: "Admin Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    ];
  } else if (pathname.startsWith("/mentor")) {
    sidebarLinks = [
      { name: "Mentor Dashboard", href: "/mentor/dashboard", icon: LayoutDashboard },
      { name: "My Pod", href: "/mentor/pod", icon: Users },
    ];
  } else {
    sidebarLinks = [
      { name: "Dashboard", href: "/vault/dashboard", icon: LayoutDashboard },
      { name: "Learning Path", href: "/vault/path", icon: Map },
      { name: "Word Vault", href: "/vault/library", icon: BookMarked },
      { name: "My Pod", href: "/vault/pod", icon: Users },
      { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    ];
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.25, 0, 1] }}
        className="hidden md:flex flex-col w-64 border-r border-border/40 bg-card/50 backdrop-blur-xl"
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border/40">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-heading font-bold text-lg shadow-lg">
              S
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">SKYLD</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="mb-6 px-2">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Menu
            </h2>
          </div>
          <nav className="space-y-1">
            {sidebarLinks.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all group ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isActive ? "scale-110" : "group-hover:scale-110"
                      }`}
                    />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <Avatar className="w-10 h-10 border border-border/50 ring-2 ring-primary/20">
              <AvatarFallback>{userProfile ? userProfile.full_name.substring(0, 2).toUpperCase() : "..."}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{userProfile ? userProfile.full_name : "Loading..."}</span>
              <span className="text-xs text-muted-foreground">Level {userProfile ? userProfile.level : "..."}</span>
            </div>
          </div>
          <nav className="space-y-1">
            <Link href="/settings">
              <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
                <Settings className="w-5 h-5" />
                <span className="text-sm">Settings</span>
              </div>
            </Link>
            <form action={logout} className="w-full">
              <button type="submit" className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all text-left">
                <LogOut className="w-5 h-5" />
                <span className="text-sm">Log out</span>
              </button>
            </form>
          </nav>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 md:hidden flex items-center justify-between px-4 border-b border-border/40 bg-background/80 backdrop-blur-lg sticky top-0 z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-heading font-bold text-lg shadow-lg">
              S
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-6 h-6" />
            </Button>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <FadeIn className="h-full p-4 md:p-8" delay={0.1}>
            {children}
          </FadeIn>
        </main>
      </div>
    </div>
  );
}
