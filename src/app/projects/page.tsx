"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  FolderOpen, Trash2, Bookmark, BookmarkCheck, Film, Clock,
  Pencil, Check, X, CheckSquare, Square, MinusSquare,
} from "lucide-react";
import { getProjects, deleteProject, toggleSaved, renameProject, MAX_PROJECTS, type Project } from "@/lib/projectStore";

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

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  const handleOpen = (proj: Project) => {
    if (editingId) return;
    if (checked.size > 0) return;
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
    setChecked((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setProjects(await getProjects());
  };

  const handleDeleteSelected = async () => {
    if (checked.size === 0) return;
    if (!confirm(`선택한 ${checked.size}개 프로젝트를 삭제하시겠습니까?`)) return;
    await Promise.all([...checked].map((id) => deleteProject(id)));
    setChecked(new Set());
    setProjects(await getProjects());
  };

  const handleToggleSaved = async (id: string) => {
    await toggleSaved(id);
    setProjects(await getProjects());
  };

  const startEditing = (proj: Project) => {
    setEditingId(proj.id);
    setEditTitle(proj.title);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameProject(editingId, editTitle.trim());
      setProjects(await getProjects());
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  const toggleCheck = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checked.size === projects.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(projects.map((p) => p.id)));
    }
  };

  const allChecked = projects.length > 0 && checked.size === projects.length;
  const someChecked = checked.size > 0 && checked.size < projects.length;

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 md:mb-6">
            <div className="flex items-center gap-3">
              <FolderOpen size={22} className="text-accent" />
              <h1 className="text-xl md:text-2xl font-bold text-foreground">프로젝트</h1>
              <span className={`text-sm ${projects.length >= MAX_PROJECTS ? "text-red-500 font-semibold" : "text-text-secondary"}`}>
                {projects.length}/{MAX_PROJECTS}개
              </span>
            </div>

            {checked.size > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">
                  {checked.size}개 선택됨
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors"
                >
                  <Trash2 size={14} />
                  선택 삭제
                </button>
              </div>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <FolderOpen size={48} className="mb-4 opacity-30" />
              <p className="text-lg mb-2">아직 프로젝트가 없습니다</p>
              <p className="text-sm">대본을 입력하고 영상을 만들면 자동으로 저장됩니다</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* 전체 선택 바 */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface border border-border">
                <button onClick={toggleAll} className="shrink-0 p-0.5">
                  {allChecked ? (
                    <CheckSquare size={18} className="text-accent" />
                  ) : someChecked ? (
                    <MinusSquare size={18} className="text-accent" />
                  ) : (
                    <Square size={18} className="text-text-secondary/40" />
                  )}
                </button>
                <span className="text-xs text-text-secondary">
                  {allChecked ? "전체 해제" : "전체 선택"}
                </span>
              </div>

              {projects.map((proj) => {
                const isChecked = checked.has(proj.id);
                return (
                  <div
                    key={proj.id}
                    className={`group flex items-start gap-3 p-4 bg-surface border rounded-xl hover:bg-surface-hover transition-all cursor-pointer ${
                      isChecked ? "border-accent/40 bg-accent/[0.03]" : "border-border"
                    }`}
                    onClick={() => handleOpen(proj)}
                  >
                    {/* 체크박스 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleCheck(proj.id); }}
                      className="shrink-0 mt-1 p-0.5"
                    >
                      {isChecked ? (
                        <CheckSquare size={18} className="text-accent" />
                      ) : (
                        <Square size={18} className="text-text-secondary/30 group-hover:text-text-secondary/60 transition-colors" />
                      )}
                    </button>

                    <div className="hidden md:flex shrink-0 w-10 h-10 rounded-lg bg-accent/10 items-center justify-center">
                      <Film size={18} className="text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingId === proj.id ? (
                        <div className="flex items-center gap-2 mb-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            ref={inputRef}
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            className="flex-1 px-2 py-1 text-sm font-semibold bg-surface border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground"
                          />
                          <button onClick={confirmRename} className="p-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 transition-colors" title="확인">
                            <Check size={14} className="text-accent" />
                          </button>
                          <button onClick={cancelRename} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="취소">
                            <X size={14} className="text-text-secondary" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-semibold text-foreground mb-1 truncate">
                          {proj.title}
                        </h3>
                      )}
                      {proj.scenes.length === 0 ? (
                        <p className="text-sm text-text-secondary/50 mb-2 italic">
                          아직 대본이 입력되지 않았습니다
                        </p>
                      ) : (
                        <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                          {proj.script.slice(0, 150)}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-text-secondary/60">
                        {proj.scenes.length === 0 ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-amber-500/10 text-amber-600 font-semibold">
                            생성중
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Film size={11} /> {proj.scenes.length}개 씬
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatDate(proj.updatedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 md:gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => startEditing(proj)}
                        className="p-1.5 md:p-2 rounded-lg hover:bg-accent/10 transition-colors"
                        title="이름 수정"
                      >
                        <Pencil size={14} className="text-text-secondary hover:text-accent" />
                      </button>
                      <button
                        onClick={() => handleToggleSaved(proj.id)}
                        className="p-1.5 md:p-2 rounded-lg hover:bg-accent/10 transition-colors"
                        title={proj.saved ? "저장 해제" : "저장"}
                      >
                        {proj.saved ? (
                          <BookmarkCheck size={14} className="text-accent" />
                        ) : (
                          <Bookmark size={14} className="text-text-secondary" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(proj.id)}
                        className="p-1.5 md:p-2 rounded-lg hover:bg-red-50 transition-colors"
                        title="삭제"
                      >
                        <Trash2 size={14} className="text-text-secondary hover:text-red-500" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
