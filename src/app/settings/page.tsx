"use client";

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PremiumCard } from "@/components/ui/custom/PremiumCard";
import { PremiumButton } from "@/components/ui/custom/PremiumButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme/ThemeProvider";
import { 
  User, 
  KeyRound, 
  Mail, 
  Shield, 
  Sun, 
  Moon, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building, 
  Sparkles,
  Zap
} from "lucide-react";
import { 
  getUserProfileData, 
  updateProfileName, 
  updateAccountEmail, 
  updateAccountPassword 
} from "@/app/actions/settings";

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status feedback
  const [nameStatus, setNameStatus] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{ msg: string; isError?: boolean } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [savingName, setSavingName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await getUserProfileData();
      setUserData(data);
      setFullName(data.profile?.full_name || "");
      setEmail(data.profile?.email || data.user?.email || "");
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveName = async () => {
    setNameStatus(null);
    setSavingName(true);
    try {
      const res = await updateProfileName(fullName);
      if (res?.error) {
        setNameStatus({ msg: res.error, isError: true });
      } else {
        setNameStatus({ msg: "Full name updated successfully!" });
        loadProfile();
      }
    } catch (err: any) {
      setNameStatus({ msg: err.message, isError: true });
    } finally {
      setSavingName(false);
    }
  };

  const handleSaveEmail = async () => {
    setEmailStatus(null);
    setSavingEmail(true);
    try {
      const res = await updateAccountEmail(email);
      if (res?.error) {
        setEmailStatus({ msg: res.error, isError: true });
      } else {
        setEmailStatus({ msg: "Email address updated successfully!" });
        loadProfile();
      }
    } catch (err: any) {
      setEmailStatus({ msg: err.message, isError: true });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleSavePassword = async () => {
    setPasswordStatus(null);
    if (newPassword.length < 6) {
      setPasswordStatus({ msg: "Password must be at least 6 characters.", isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ msg: "Passwords do not match.", isError: true });
      return;
    }

    setSavingPassword(true);
    try {
      const res = await updateAccountPassword(newPassword);
      if (res?.error) {
        setPasswordStatus({ msg: res.error, isError: true });
      } else {
        setPasswordStatus({ msg: "Password changed successfully!" });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err: any) {
      setPasswordStatus({ msg: err.message, isError: true });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full min-h-[400px]">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const profile = userData?.profile;

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-6">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 border-2 border-primary/40 ring-4 ring-primary/10">
              <AvatarFallback className="text-xl font-bold bg-primary/20 text-primary">
                {(profile?.full_name || "User").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight font-heading flex items-center gap-2">
                Account Settings
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your profile, credentials, and application preferences.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold uppercase tracking-wider text-primary">
            <Shield className="w-3.5 h-3.5" /> {profile?.role || "Student"}
          </div>
        </div>

        {/* Organization Info Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PremiumCard className="p-4 flex items-center gap-3 glass">
            <Building className="w-5 h-5 text-primary opacity-80" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Batch</p>
              <p className="font-bold text-sm">{profile?.batches?.name || "Global"}</p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4 flex items-center gap-3 glass">
            <Building className="w-5 h-5 text-indigo-400 opacity-80" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Unit</p>
              <p className="font-bold text-sm">{profile?.units?.name || "General"}</p>
            </div>
          </PremiumCard>

          <PremiumCard className="p-4 flex items-center gap-3 glass">
            <Building className="w-5 h-5 text-purple-400 opacity-80" />
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Pod</p>
              <p className="font-bold text-sm">{profile?.pods?.name || "Unassigned"}</p>
            </div>
          </PremiumCard>
        </div>

        {/* Profile Details Card */}
        <PremiumCard className="p-6 md:p-8 glass-card space-y-6">
          <div className="flex items-center gap-2.5 text-lg font-bold border-b border-border/40 pb-4">
            <User className="w-5 h-5 text-primary" /> Profile Information
          </div>

          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Display Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="h-11 bg-background/50 border-white/10 focus-visible:ring-primary"
              />
            </div>

            {nameStatus && (
              <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${nameStatus.isError ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-success/10 text-success border border-success/20"}`}>
                {nameStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{nameStatus.msg}</span>
              </div>
            )}

            <PremiumButton onClick={handleSaveName} disabled={savingName || !fullName} className="mt-2">
              {savingName ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </PremiumButton>
          </div>
        </PremiumCard>

        {/* Email Management Card */}
        <PremiumCard className="p-6 md:p-8 glass-card space-y-6">
          <div className="flex items-center gap-2.5 text-lg font-bold border-b border-border/40 pb-4">
            <Mail className="w-5 h-5 text-indigo-400" /> Email Address
          </div>

          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Registered Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@skyld.com"
                className="h-11 bg-background/50 border-white/10 focus-visible:ring-primary"
              />
            </div>

            {emailStatus && (
              <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${emailStatus.isError ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-success/10 text-success border border-success/20"}`}>
                {emailStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{emailStatus.msg}</span>
              </div>
            )}

            <PremiumButton onClick={handleSaveEmail} disabled={savingEmail || !email} className="mt-2">
              {savingEmail ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Update Email
            </PremiumButton>
          </div>
        </PremiumCard>

        {/* Password Security Card */}
        <PremiumCard className="p-6 md:p-8 glass-card space-y-6">
          <div className="flex items-center gap-2.5 text-lg font-bold border-b border-border/40 pb-4">
            <KeyRound className="w-5 h-5 text-amber-400" /> Security & Password
          </div>

          <div className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="newPass" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                New Password
              </Label>
              <Input
                id="newPass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-11 bg-background/50 border-white/10 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPass" className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                Confirm New Password
              </Label>
              <Input
                id="confirmPass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="h-11 bg-background/50 border-white/10 focus-visible:ring-primary"
              />
            </div>

            {passwordStatus && (
              <div className={`p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${passwordStatus.isError ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-success/10 text-success border border-success/20"}`}>
                {passwordStatus.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{passwordStatus.msg}</span>
              </div>
            )}

            <PremiumButton onClick={handleSavePassword} disabled={savingPassword || !newPassword} className="mt-2">
              {savingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Change Password
            </PremiumButton>
          </div>
        </PremiumCard>

        {/* Theme Preferences Card */}
        <PremiumCard className="p-6 md:p-8 glass-card space-y-6">
          <div className="flex items-center gap-2.5 text-lg font-bold border-b border-border/40 pb-4">
            <Sparkles className="w-5 h-5 text-primary" /> Appearance & Theme
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                resolvedTheme === "dark"
                  ? "bg-primary/20 border-primary text-primary font-bold shadow-sm"
                  : "bg-background/40 border-white/10 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Moon className="w-5 h-5 text-indigo-400" />
              <span>Dark Mode</span>
            </button>

            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex-1 p-4 rounded-xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
                resolvedTheme === "light"
                  ? "bg-primary/20 border-primary text-primary font-bold shadow-sm"
                  : "bg-background/40 border-white/10 text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Sun className="w-5 h-5 text-amber-400" />
              <span>Light Mode</span>
            </button>
          </div>
        </PremiumCard>

      </div>
    </DashboardLayout>
  );
}
