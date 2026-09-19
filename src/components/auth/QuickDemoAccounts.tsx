"use client";

import { useState } from "react";
import { UserCheck, Shield, GraduationCap, Users } from "lucide-react";

interface TestAccount {
  label: string;
  email: string;
  role: string;
  icon: typeof Shield;
}

const testAccounts: TestAccount[] = [
  { label: "Admin", email: "admin@skyld.com", role: "admin", icon: Shield },
  { label: "Mentor", email: "mentor1@skyld.com", role: "mentor", icon: Users },
  { label: "Nikhil", email: "nikhil@skyld.com", role: "student", icon: GraduationCap },
  { label: "Yuvraj", email: "yuvraj@skyld.com", role: "student", icon: GraduationCap },
  { label: "Srikar", email: "srikar@skyld.com", role: "student", icon: GraduationCap },
  { label: "Ananya", email: "ananya@skyld.com", role: "student", icon: GraduationCap },
  { label: "Rahul", email: "rahul@skyld.com", role: "student", icon: GraduationCap },
  { label: "Priya", email: "priya@skyld.com", role: "student", icon: GraduationCap },
];

export function QuickDemoAccounts() {
  const [selected, setSelected] = useState<string | null>(null);

  // In production builds, this component returns nothing
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  const fillAccount = (acc: TestAccount) => {
    setSelected(acc.email);
    const emailInput = document.getElementById("email") as HTMLInputElement | null;
    const passwordInput = document.getElementById("password") as HTMLInputElement | null;

    if (emailInput && passwordInput) {
      emailInput.value = acc.email;
      passwordInput.value = "password123";

      // Trigger change events in case React / browser form listeners need them
      emailInput.dispatchEvent(new Event("input", { bubbles: true }));
      passwordInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  return (
    <div className="mt-6 pt-5 border-t border-white/10">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-primary" /> Dev Test Accounts
        </span>
        <span className="text-[11px] text-muted-foreground/80">Click to autofill</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {testAccounts.map((acc) => {
          const Icon = acc.icon;
          const isSelected = selected === acc.email;
          return (
            <button
              key={acc.email}
              type="button"
              onClick={() => fillAccount(acc)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-1 text-center cursor-pointer ${
                isSelected
                  ? "bg-primary/20 border-primary text-primary font-semibold shadow-sm"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5 opacity-80" />
              <span className="truncate w-full">{acc.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
