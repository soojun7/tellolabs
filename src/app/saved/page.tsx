"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Bookmark, BookmarkCheck, Trash2, Film, Clock, Pencil, Check, X } from "lucide-react";
import { getSavedProjects, toggleSaved, deleteProject, renameProject, type Project } from "@/lib/projectStore";

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

export default function SavedPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getSavedProjects().then(setProjects);
  }, []);

  const handleOpen = (proj: Project) => {
    if (editingId) return;
    sessionStorage.setItem("sourcebox-scenes", JSON.stringify(proj.scenes));
    sessionStorage.setItem("sourcebox-project-id", proj.id);
    router.push("/editor");
  };

  const handleUnsave = async (id: string) => {
    await toggleSaved(id);
    setProjects(await getSavedProjects());
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    await deleteProject(id);
    setProjects(await getSavedProjects());
  };

  const startEditing = (proj: Project) => {
    setEditingId(proj.id);
    setEditTitle(proj.title);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmRename = async () => {
    if (editingId && editTitle.trim()) {
      await renameProject(editingId, editTitle.trim());
      setProjects(await getSavedProjects());
    }
    setEditingId(null);
  };

  const cancelRename = () => {
    setEditingId(null);
  };

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="flex items-center gap-3 mb-5 md:mb-8">
            <Bookmark size={22} className="text-accent" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">저장됨</h1>
            <span className="text-sm text-text-secondary">
              {projects.length}개
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <Bookmark size={48} className="mb-4 opacity-30" />
              <p className="text-lg mb-2">저장된 프로젝트가 없습니다</p>
              <p className="text-sm">프로젝트에서 북마크를 눌러 저장하세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => (
                <div
                  key={proj.id}
                  className="group flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-surface border border-border rounded-xl hover:bg-surface-hover transition-all cursor-pointer"
                  onClick={() => handleOpen(proj)}
                >
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
                    <p className="text-sm text-text-secondary line-clamp-2 mb-2">
                      {proj.script.slice(0, 150)}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-text-secondary/60">
                      <span className="flex items-center gap-1">
                        <Film size={11} /> {proj.scenes.length}개 씬
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatDate(proj.updatedAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 md:gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => startEditing(proj)} className="p-1.5 md:p-2 rounded-lg hover:bg-accent/10 transition-colors" title="이름 수정">
                      <Pencil size={14} className="text-text-secondary hover:text-accent" />
                    </button>
                    <button onClick={() => handleUnsave(proj.id)} className="p-1.5 md:p-2 rounded-lg hover:bg-accent/10 transition-colors" title="저장 해제">
                      <BookmarkCheck size={14} className="text-accent" />
                    </button>
                    <button onClick={() => handleDelete(proj.id)} className="p-1.5 md:p-2 rounded-lg hover:bg-red-50 transition-colors" title="삭제">
                      <Trash2 size={14} className="text-text-secondary hover:text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
