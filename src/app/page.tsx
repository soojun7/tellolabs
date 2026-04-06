"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Package,
  Plus,
  Film,
  Clock,
  FolderOpen,
  ArrowRight,
  Clapperboard,
  Image as ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import { getProjects, deleteProject, renameProject, saveProject, MAX_PROJECTS, migrateLocalStorageToDb, type Project } from "@/lib/projectStore";

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60_000) return "방금 전";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  }
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export default function Home() {
  const router = useRouter();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleNewProject = useCallback(async () => {
    if ((await getProjects()).length >= MAX_PROJECTS) {
      setShowLimitModal(true);
      return;
    }
    setNewProjectName("");
    setShowNewModal(true);
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
      router.push("/new");
    } catch (err: unknown) {
      alert((err as Error).message || "프로젝트 생성 실패");
    } finally {
      setCreating(false);
    }
  }, [newProjectName, router, creating]);

  useEffect(() => {
    (async () => {
      await migrateLocalStorageToDb();
      const all = await getProjects();
      setRecentProjects(all.slice(0, 6));
    })();
  }, []);

  const reload = () => getProjects().then((all) => setRecentProjects(all.slice(0, 6)));

  const handleOpenProject = (proj: Project) => {
    if (editingId) return;
    if (proj.scenes.length === 0) {
      sessionStorage.setItem("sourcebox-project-id", proj.id);
      sessionStorage.setItem("sourcebox-new-project-name", proj.title);
      router.push("/new");
      return;
    }
    router.push(`/projects/${proj.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    await deleteProject(id);
    reload();
  };

  const startEditing = (proj: Project) => {
    setEditingId(proj.id);
    setEditTitle(proj.title);
  };

  const confirmRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameProject(editingId, editTitle.trim());
      reload();
    }
    setEditingId(null);
  };

  const motionCount = (proj: Project) =>
    proj.scenes.filter((s) => s.sceneType === "motion").length;
  const imageCount = (proj: Project) =>
    proj.scenes.filter((s) => s.sceneType === "image").length;

  return (
    <div className="flex h-full">
      <Sidebar />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[1000px] mx-auto px-4 md:px-6 lg:px-10 py-6 md:py-10">
          {/* 상단 히어로 */}
          <div className="relative overflow-hidden rounded-2xl bg-hero-gradient p-5 md:p-8 lg:p-12 mb-6 md:mb-10">
            <div className="hero-glow hero-glow--1" />
            <div className="hero-glow hero-glow--2" />
            <div className="hero-glow hero-glow--3" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 md:gap-6">
              <div>
                <div className="flex items-center gap-3 mb-2 md:mb-3">
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-accent/10 flex items-center justify-center">
                    <Package size={18} className="text-accent md:hidden" />
                    <Package size={22} className="text-accent hidden md:block" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight">
                    텔로스튜디오
                  </h1>
                </div>
                <p className="text-text-secondary text-sm md:text-base max-w-md">
                  대본을 넣으면 AI가 모션 그래픽, 이미지 씬, TTS 나레이션을 자동으로 만들어드립니다
                </p>
              </div>

              <button
                onClick={handleNewProject}
                className="flex items-center gap-2 md:gap-2.5 px-5 md:px-7 py-3 md:py-3.5 bg-accent text-white rounded-xl md:rounded-2xl font-semibold text-sm md:text-base shadow-lg hover:bg-accent/90 hover:shadow-xl active:scale-[0.98] transition-all shrink-0 w-full md:w-auto justify-center"
              >
                <Plus size={18} strokeWidth={2.5} />
                새 프로젝트 만들기
              </button>
            </div>
          </div>

          {/* 최근 프로젝트 */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <Clock size={18} className="text-text-secondary" />
                <h2 className="text-lg font-bold text-foreground">최근 프로젝트</h2>
              </div>
              {recentProjects.length > 0 && (
                <button
                  onClick={() => router.push("/projects")}
                  className="flex items-center gap-1 text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  모두 보기 <ArrowRight size={14} />
                </button>
              )}
            </div>

            {recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border rounded-2xl">
                <FolderOpen size={40} className="text-text-secondary/30 mb-3" />
                <p className="text-text-secondary mb-1">아직 프로젝트가 없습니다</p>
                <p className="text-sm text-text-secondary/60 mb-5">
                  새 프로젝트를 만들어 시작하세요
                </p>
                <button
                  onClick={handleNewProject}
                  className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  <Plus size={16} />
                  시작하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentProjects.map((proj) => (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenProject(proj)}
                    className="group p-5 bg-surface border border-border rounded-xl hover:bg-surface-hover hover:border-accent/20 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Film size={16} className="text-accent" />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEditing(proj); }}
                          className="p-1.5 rounded-lg md:opacity-0 md:group-hover:opacity-100 hover:bg-accent/10 transition-all"
                          title="이름 수정"
                        >
                          <Pencil size={12} className="text-text-secondary" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(proj.id); }}
                          className="p-1.5 rounded-lg md:opacity-0 md:group-hover:opacity-100 hover:bg-red-50 transition-all"
                          title="삭제"
                        >
                          <Trash2 size={12} className="text-text-secondary hover:text-red-500" />
                        </button>
                        <span className="text-[11px] text-text-secondary/50 ml-1">
                          {formatDate(proj.updatedAt)}
                        </span>
                      </div>
                    </div>
                    {editingId === proj.id ? (
                      <div className="mb-1.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmRename();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={confirmRename}
                          className="w-full px-2 py-1 text-sm font-semibold bg-surface border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground"
                        />
                      </div>
                    ) : (
                      <h3 className="font-semibold text-foreground mb-1.5 truncate text-sm">
                        {proj.title}
                      </h3>
                    )}
                    {proj.scenes.length === 0 ? (
                      <p className="text-xs text-text-secondary/50 mb-3 leading-relaxed italic">
                        아직 대본이 입력되지 않았습니다
                      </p>
                    ) : (
                      <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
                        {proj.script.slice(0, 100)}
                      </p>
                    )}
                    <div className="flex items-center gap-2">
                      {proj.scenes.length === 0 ? (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] bg-amber-500/10 text-amber-600 font-semibold">
                          생성중
                        </span>
                      ) : (
                        <>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-accent/10 text-accent font-medium">
                            <Clapperboard size={10} /> {motionCount(proj)}
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-400 font-medium">
                            <ImageIcon size={10} /> {imageCount(proj)}
                          </span>
                          <span className="text-[10px] text-text-secondary/40">
                            {proj.scenes.length}개 씬
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {showNewModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
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
            <input
              type="text"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNewProjectConfirm();
                if (e.key === "Escape") setShowNewModal(false);
              }}
              placeholder="예: 서울 부동산 분석 영상"
              autoFocus
              className="w-full px-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-foreground placeholder:text-text-secondary/50 mb-4"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowNewModal(false)}
                className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleNewProjectConfirm}
                disabled={!newProjectName.trim() || creating}
                className="px-6 py-2.5 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-40"
              >
                {creating ? "생성 중..." : "시작하기"}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {showLimitModal && createPortal(
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
      )}
    </div>
  );
}
