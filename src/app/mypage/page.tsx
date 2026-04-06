"use client";

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "@/components/ThemeProvider";
import {
  User, Mail, Coins, Key, Save, LogOut, Loader2,
  Eye, EyeOff, ExternalLink, Check, Sun, Moon, Monitor,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  youtubeApiKey: string | null;
  createdAt: string;
}

export default function MyPage() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState("");
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [showYtKey, setShowYtKey] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login");
      return;
    }
    if (isSignedIn) {
      fetch("/api/user")
        .then((r) => r.json())
        .then((data) => {
          setProfile(data);
          setName(data.name || "");
          setYoutubeApiKey(data.youtubeApiKey || "");
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, youtubeApiKey }),
      });
      const data = await res.json();
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex h-full">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-accent" />
        </main>
      </div>
    );
  }

  if (!isSignedIn || !profile) {
    return null;
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[700px] mx-auto px-4 md:px-6 py-6 md:py-10">
          <h1 className="text-xl md:text-2xl font-bold text-foreground mb-5 md:mb-8">마이페이지</h1>

          {/* Profile Section */}
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 md:mb-5 flex items-center gap-2">
              <User size={16} className="text-accent" />
              프로필
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">이메일</label>
                <div className="flex items-center gap-2 px-4 py-3 bg-background border border-border rounded-xl">
                  <Mail size={14} className="text-text-secondary/40" />
                  <span className="text-sm text-foreground">{user?.emailAddresses?.[0]?.emailAddress || profile.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-text-secondary mb-1.5">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="표시될 이름"
                  className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground"
                />
              </div>
            </div>
          </div>

          {/* Credits Section */}
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 md:mb-5 flex items-center gap-2">
              <Coins size={16} className="text-yellow-500" />
              크레딧
            </h2>

            <div className="flex items-center justify-between p-4 md:p-5 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">{profile.credits}</p>
                <p className="text-xs text-text-secondary mt-1">사용 가능한 크레딧</p>
              </div>
              <button
                disabled
                className="px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-medium text-sm opacity-50 cursor-not-allowed"
                title="추후 지원 예정"
              >
                충전하기
              </button>
            </div>
            <p className="text-[11px] text-text-secondary mt-3">
              이미지 생성, 영상 클립 생성, TTS 등에 크레딧이 사용됩니다.
            </p>
          </div>

          {/* API Keys Section */}
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 md:mb-5 flex items-center gap-2">
              <Key size={16} className="text-purple-500" />
              API 키 관리
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">
                  YouTube Data API Key
                  <span className="text-text-secondary/40 ml-1">(선택)</span>
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary/30" />
                    <input
                      type={showYtKey ? "text" : "password"}
                      value={youtubeApiKey}
                      onChange={(e) => setYoutubeApiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full pl-10 pr-10 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground placeholder:text-text-secondary/30"
                    />
                    <button
                      onClick={() => setShowYtKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary/40 hover:text-text-secondary transition-colors"
                    >
                      {showYtKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-text-secondary mt-2 flex items-center gap-1">
                  <ExternalLink size={10} />
                  YouTube 영상 업로드 기능에 사용됩니다.
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline ml-1">
                    API 키 발급받기
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* Theme Section */}
          <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-4 md:mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-4 md:mb-5 flex items-center gap-2">
              <Monitor size={16} className="text-blue-500" />
              화면 테마
            </h2>

            <div className="flex gap-3">
              <button
                onClick={() => { if (theme !== "light") toggleTheme(); }}
                className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                  theme === "light"
                    ? "bg-accent/10 border-accent"
                    : "bg-background border-border hover:border-border hover:bg-surface-hover"
                }`}
              >
                <Sun size={18} className={theme === "light" ? "text-accent" : "text-text-secondary"} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${theme === "light" ? "text-accent" : "text-foreground"}`}>라이트</p>
                  <p className="text-[10px] text-text-secondary">밝은 화면</p>
                </div>
                {theme === "light" && <Check size={14} className="text-accent ml-auto" />}
              </button>
              <button
                onClick={() => { if (theme !== "dark") toggleTheme(); }}
                className={`flex-1 flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all ${
                  theme === "dark"
                    ? "bg-accent/10 border-accent"
                    : "bg-background border-border hover:border-border hover:bg-surface-hover"
                }`}
              >
                <Moon size={18} className={theme === "dark" ? "text-accent" : "text-text-secondary"} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${theme === "dark" ? "text-accent" : "text-foreground"}`}>다크</p>
                  <p className="text-[10px] text-text-secondary">어두운 화면</p>
                </div>
                {theme === "dark" && <Check size={14} className="text-accent ml-auto" />}
              </button>
            </div>
          </div>

          {/* Save & Logout */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? "저장 완료" : "저장"}
            </button>

            <button
              onClick={() => signOut({ redirectUrl: "/login" })}
              className="flex items-center gap-2 px-5 py-3 bg-surface border border-border text-text-secondary rounded-xl text-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
