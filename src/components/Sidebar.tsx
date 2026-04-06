"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { useTheme } from "@/components/ThemeProvider";
import { getProjects, saveProject, MAX_PROJECTS } from "@/lib/projectStore";
import {
  Box,
  FolderOpen,
  Clock,
  Bookmark,
  Plus,
  ChevronsLeft,
  ChevronsRight,
  LogIn,
  LogOut,
  User,
  Film,
  Menu,
  X,
  Coins,
  ChevronUp,
} from "lucide-react";

const navItems = [
  { icon: Plus, label: "새 프로젝트", path: "/__new__", accent: true },
  { icon: Box, label: "홈", path: "/", accent: false },
  { icon: FolderOpen, label: "프로젝트", path: "/projects", accent: false },
  { icon: Clock, label: "히스토리", path: "/history", accent: false },
  { icon: Bookmark, label: "저장됨", path: "/saved", accent: false },
];

const mobileTabItems = [
  { icon: Box, label: "홈", path: "/" },
  { icon: FolderOpen, label: "프로젝트", path: "/projects" },
  { icon: Plus, label: "새 프로젝트", path: "/__new__", accent: true },
  { icon: Bookmark, label: "저장됨", path: "/saved" },
  { icon: User, label: "더보기", path: "/__menu__" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { theme } = useTheme();
  const [expanded, setExpandedState] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("telos-sidebar-expanded");
    if (saved === "true") setExpandedState(true);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isSignedIn) {
      fetch("/api/user").then(r => r.json()).then(d => setCredits(d.credits ?? 0)).catch(() => {});
    }
  }, [isSignedIn]);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) setProfileMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileMenuOpen]);

  const setExpanded = useCallback((val: boolean) => {
    setExpandedState(val);
    localStorage.setItem("telos-sidebar-expanded", String(val));
  }, []);

  const handleNewProjectConfirm = useCallback(async () => {
    if (!newProjectName.trim() || creating) return;
    setCreating(true);
    try {
      const proj = await saveProject({
        title: newProjectName.trim(),
        script: "",
        scenes: [],
        saved: false,
      });
      sessionStorage.removeItem("sourcebox-scenes");
      sessionStorage.setItem("sourcebox-project-id", proj.id);
      sessionStorage.setItem("sourcebox-new-project-name", proj.title);
      setShowNewModal(false);
      setNewProjectName("");
      setMobileMenuOpen(false);
      router.push("/new");
    } catch (err: unknown) {
      alert((err as Error).message || "프로젝트 생성 실패");
    } finally {
      setCreating(false);
    }
  }, [newProjectName, router, creating]);

  const tryNewProject = async () => {
    if ((await getProjects()).length >= MAX_PROJECTS) {
      setShowLimitModal(true);
      setMobileMenuOpen(false);
      return;
    }
    setNewProjectName("");
    setShowNewModal(true);
    setMobileMenuOpen(false);
  };

  const handleNav = (item: (typeof navItems)[number]) => {
    if (item.path === "/__new__") {
      tryNewProject();
      return;
    }
    router.push(item.path);
    setMobileMenuOpen(false);
  };

  const handleMobileTab = (item: (typeof mobileTabItems)[number]) => {
    if (item.path === "/__new__") {
      tryNewProject();
      return;
    }
    if (item.path === "/__menu__") {
      setMobileMenuOpen(true);
      return;
    }
    router.push(item.path);
  };

  const bg = "bg-sidebar-bg border-border";
  const inactiveText = "text-text-secondary hover:bg-surface-hover hover:text-foreground";
  const activeStyle = theme === "dark" ? "bg-surface-hover text-accent" : "bg-white shadow-sm text-accent";
  const mypageActive = pathname === "/mypage";

  /* ─── Desktop sidebar ─── */
  const desktopSidebar = (
    <aside
      className={`hidden md:flex flex-col ${expanded ? "items-stretch" : "items-center"} min-h-full border-r py-5 gap-1 shrink-0 ${bg} transition-all duration-300 overflow-hidden`}
      style={{ width: expanded ? 200 : 68 }}
    >
      {expanded ? (
        <div className="mb-4 flex items-center px-3 justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-white font-bold text-lg select-none cursor-pointer shrink-0" onClick={() => router.push("/")}>T</div>
            <span className="text-sm font-semibold text-foreground truncate">텔로스튜디오</span>
          </div>
          <button onClick={() => setExpanded(false)} className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 text-text-secondary hover:text-foreground hover:bg-surface-hover">
            <ChevronsLeft size={16} />
          </button>
        </div>
      ) : (
        <div className="mb-3 flex flex-col items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent text-white font-bold text-lg select-none cursor-pointer" onClick={() => router.push("/")}>T</div>
          <button onClick={() => setExpanded(true)} className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 text-text-secondary hover:text-foreground hover:bg-surface-hover">
            <ChevronsRight size={14} />
          </button>
        </div>
      )}

      <nav className={`flex flex-col gap-1 flex-1 ${expanded ? "px-2.5" : "items-center"}`}>
        {navItems.map((item) => {
          const { icon: Icon, label, accent, path } = item;
          const active = !accent && (path === "/" ? pathname === "/" : pathname.startsWith(path));
          return (
            <button key={label} title={expanded ? undefined : label} onClick={() => handleNav(item)}
              className={`group relative flex items-center ${expanded ? "gap-3 px-3 h-10" : "justify-center w-11 h-11"} rounded-xl transition-all duration-200 ${active ? activeStyle : inactiveText} ${accent ? "!bg-accent !text-white mb-2 hover:!bg-accent/90" : ""}`}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" />
              {expanded ? (
                <span className="text-[13px] font-medium truncate">{label}</span>
              ) : (
                <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-foreground text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className={`relative flex flex-col gap-1 ${expanded ? "px-2.5" : "items-center"}`} ref={profileMenuRef}>
        {profileMenuOpen && isSignedIn && (
          <div className={`absolute bottom-full mb-2 ${expanded ? "left-1 right-1" : "left-0"} bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-modal-content`} style={{ minWidth: expanded ? undefined : 200 }}>
            <div className="px-3.5 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground truncate">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "사용자"}</p>
              <p className="text-[10px] text-text-secondary truncate">{user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
            <div className="px-2 py-1.5">
              <button onClick={() => { setProfileMenuOpen(false); router.push("/mypage"); }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-surface-hover transition-colors">
                <User size={15} className="text-text-secondary" /> 마이페이지
              </button>
              <div onClick={() => { setProfileMenuOpen(false); router.push("/mypage"); }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-foreground hover:bg-surface-hover transition-colors cursor-pointer">
                <Coins size={15} className="text-yellow-500" />
                <span>크레딧</span>
                <span className="ml-auto text-xs font-bold text-accent">{credits ?? "—"}</span>
              </div>
              <div className="my-1 border-t border-border" />
              <button onClick={() => { setProfileMenuOpen(false); signOut({ redirectUrl: "/login" }); }}
                className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm text-red-500 hover:bg-red-500/10 transition-colors">
                <LogOut size={15} /> 로그아웃
              </button>
            </div>
          </div>
        )}

        {isSignedIn ? (
          <button title={expanded ? undefined : "메뉴"} onClick={() => setProfileMenuOpen(v => !v)}
            className={`group relative flex items-center ${expanded ? "gap-3 px-3 h-10 w-full" : "justify-center w-11 h-11"} rounded-xl transition-all duration-200 ${profileMenuOpen || mypageActive ? activeStyle : inactiveText}`}>
            <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0"><User size={14} className="text-accent" /></div>
            {expanded ? (
              <>
                <div className="flex-1 min-w-0">
                  <span className="text-[12px] font-medium text-foreground block truncate">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "사용자"}</span>
                  <span className="text-[10px] text-text-secondary/60 block truncate">{credits !== null ? `크레딧: ${credits}` : user?.emailAddresses?.[0]?.emailAddress}</span>
                </div>
                <ChevronUp size={14} className={`shrink-0 text-text-secondary transition-transform ${profileMenuOpen ? "" : "rotate-180"}`} />
              </>
            ) : (
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-foreground text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">메뉴</span>
            )}
          </button>
        ) : (
          <button title={expanded ? undefined : "로그인"} onClick={() => router.push("/login")}
            className={`group relative flex items-center ${expanded ? "gap-3 px-3 h-10 w-full" : "justify-center w-11 h-11"} rounded-xl transition-all duration-200 ${inactiveText}`}>
            <LogIn size={20} strokeWidth={1.8} className="shrink-0" />
            {expanded ? (<span className="text-[13px] font-medium truncate">로그인</span>) : (
              <span className="absolute left-full ml-3 px-2.5 py-1 rounded-lg bg-foreground text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">로그인</span>
            )}
          </button>
        )}
      </div>
    </aside>
  );

  /* ─── Mobile bottom tab bar ─── */
  const mobileTabBar = (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-border flex items-center justify-around px-1 safe-pb">
      {mobileTabItems.map((item) => {
        const { icon: Icon, label, path, accent } = item;
        const active = !accent && path !== "/__menu__" && (path === "/" ? pathname === "/" : pathname.startsWith(path));
        const isMenu = path === "/__menu__";
        const menuActive = isMenu && (pathname === "/mypage" || pathname === "/history");

        if (accent) {
          return (
            <button key={label} onClick={() => handleMobileTab(item)} className="flex flex-col items-center justify-center -mt-4">
              <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                <Icon size={22} strokeWidth={2.2} />
              </div>
              <span className="text-[10px] mt-0.5 text-accent font-medium">{label}</span>
            </button>
          );
        }

        return (
          <button key={label} onClick={() => handleMobileTab(item)}
            className={`flex flex-col items-center justify-center py-2 px-2 min-w-0 ${active || menuActive ? "text-accent" : "text-text-secondary"}`}>
            <Icon size={20} strokeWidth={(active || menuActive) ? 2.2 : 1.6} />
            <span className={`text-[10px] mt-0.5 truncate ${(active || menuActive) ? "font-semibold" : ""}`}>{label}</span>
          </button>
        );
      })}
    </nav>
  );

  /* ─── Mobile slide-up menu ─── */
  const mobileMenu = mobileMenuOpen && createPortal(
    <div className="md:hidden fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
      <div className="absolute bottom-0 left-0 right-0 bg-surface rounded-t-2xl border-t border-border p-5 pb-8 animate-slide-up">
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />

        {isSignedIn && (
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <User size={18} className="text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "사용자"}</p>
              <p className="text-xs text-text-secondary truncate">{user?.emailAddresses?.[0]?.emailAddress}</p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {[
            { icon: User, label: "마이페이지", action: () => { router.push("/mypage"); setMobileMenuOpen(false); } },
            { icon: Clock, label: "히스토리", action: () => { router.push("/history"); setMobileMenuOpen(false); } },
          ].map((item) => (
            <button key={item.label} onClick={item.action} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-foreground hover:bg-surface-hover transition-colors">
              <item.icon size={18} className="text-text-secondary" />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}

          {isSignedIn ? (
            <button onClick={() => { signOut({ redirectUrl: "/login" }); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={18} />
              <span className="text-sm font-medium">로그아웃</span>
            </button>
          ) : (
            <button onClick={() => { router.push("/login"); setMobileMenuOpen(false); }} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-accent hover:bg-surface-hover transition-colors">
              <LogIn size={18} />
              <span className="text-sm font-medium">로그인</span>
            </button>
          )}
        </div>

        <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg text-text-secondary hover:bg-surface-hover">
          <X size={18} />
        </button>
      </div>
    </div>,
    document.body,
  );

  /* ─── New project modal ─── */
  const modal = showNewModal && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-modal-content">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
            <Film size={20} className="text-accent" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">새 프로젝트</h2>
            <p className="text-xs text-text-secondary">프로젝트 이름을 입력해주세요</p>
          </div>
        </div>
        <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleNewProjectConfirm(); if (e.key === "Escape") setShowNewModal(false); }}
          placeholder="예: 서울 부동산 분석 영상" autoFocus
          className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-foreground placeholder:text-text-secondary/50 mb-4" />
        <div className="flex items-center gap-2 justify-end">
          <button onClick={() => setShowNewModal(false)} className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors">취소</button>
          <button onClick={handleNewProjectConfirm} disabled={!newProjectName.trim() || creating} className="px-6 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-40">{creating ? "생성 중..." : "시작하기"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );

  const limitModal = showLimitModal && createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-modal-content text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <FolderOpen size={22} className="text-red-500" />
        </div>
        <h2 className="text-base font-bold text-foreground mb-2">프로젝트 한도 초과</h2>
        <p className="text-sm text-text-secondary mb-5">
          프로젝트는 최대 <strong className="text-foreground">{MAX_PROJECTS}개</strong>까지 저장할 수 있습니다.<br />
          기존 프로젝트를 삭제한 후 다시 시도해주세요.
        </p>
        <div className="flex items-center gap-2 justify-center">
          <button onClick={() => setShowLimitModal(false)} className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors">닫기</button>
          <button onClick={() => { setShowLimitModal(false); router.push("/projects"); }} className="px-5 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors">프로젝트 관리</button>
        </div>
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      {desktopSidebar}
      {mobileTabBar}
      {mobileMenu}
      {modal}
      {limitModal}
    </>
  );
}
