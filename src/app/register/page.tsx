"use client";

import { SignUp } from "@clerk/nextjs";
import { useTheme } from "@/components/ThemeProvider";

export default function RegisterPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SignUp
        routing="hash"
        forceRedirectUrl="/"
        signInUrl="/login"
        appearance={{
          variables: {
            colorPrimary: "#e85d3a",
            colorText: isDark ? "#e8e5e1" : "#1a1a1a",
            colorTextSecondary: "#8a8580",
            colorBackground: isDark ? "#1a1a1a" : "#ffffff",
            colorInputBackground: isDark ? "#0f0f0f" : "#faf8f6",
            colorInputText: isDark ? "#e8e5e1" : "#1a1a1a",
            borderRadius: "0.75rem",
          },
          elements: {
            rootBox: "mx-auto",
            card: `${isDark ? "bg-[#1a1a1a] border-[#2a2a2a]" : "bg-surface border-border"} border rounded-2xl shadow-none`,
            formButtonPrimary: "bg-accent hover:bg-accent/90 text-white rounded-xl font-semibold shadow-none",
            formFieldInput: `${isDark ? "bg-[#0f0f0f] border-[#2a2a2a] text-[#e8e5e1]" : "bg-background border-border text-foreground"} rounded-xl focus:ring-2 focus:ring-accent/30`,
            formFieldLabel: isDark ? "text-[#e8e5e1]" : "text-foreground",
            footerActionLink: "text-accent hover:text-accent/80",
            socialButtonsBlockButton: `${isDark ? "border-[#2a2a2a] bg-[#0f0f0f] text-[#e8e5e1]" : "border-border bg-background text-foreground"} rounded-xl hover:bg-surface-hover`,
            socialButtonsBlockButtonText: isDark ? "text-[#e8e5e1]" : "text-foreground",
            dividerLine: isDark ? "bg-[#2a2a2a]" : "bg-border",
            dividerText: "text-text-secondary",
            footer: isDark ? "bg-[#1a1a1a]" : "bg-surface",
            footerActionText: "text-text-secondary",
          },
        }}
      />
    </div>
  );
}
