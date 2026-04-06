"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Clock, Trash2, ExternalLink } from "lucide-react";
import { getHistory, clearHistory, getProject, type HistoryEntry } from "@/lib/projectStore";

function formatDate(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;
  if (diff < 60_000) return "방금 전";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}시간 전`;
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`;
}

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleOpenProject = (projectId: string) => {
    const proj = getProject(projectId);
    if (!proj) {
      alert("해당 프로젝트를 찾을 수 없습니다.");
      return;
    }
    sessionStorage.setItem("sourcebox-scenes", JSON.stringify(proj.scenes));
    sessionStorage.setItem("sourcebox-project-id", proj.id);
    router.push("/editor");
  };

  const handleClear = () => {
    if (!confirm("히스토리를 모두 삭제하시겠습니까?")) return;
    clearHistory();
    setHistory([]);
  };

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 md:py-10">
          <div className="flex items-center justify-between mb-5 md:mb-8">
            <div className="flex items-center gap-3">
              <Clock size={22} className="text-accent" />
              <h1 className="text-xl md:text-2xl font-bold text-foreground">히스토리</h1>
              <span className="text-sm text-text-secondary">
                {history.length}개
              </span>
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClear}
                className="flex items-center gap-1.5 px-3 py-2 text-xs text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                전체 삭제
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
              <Clock size={48} className="mb-4 opacity-30" />
              <p className="text-lg mb-2">아직 히스토리가 없습니다</p>
              <p className="text-sm">프로젝트를 만들거나 수정하면 기록됩니다</p>
            </div>
          ) : (
            <div className="space-y-1">
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-hover transition-all"
                >
                  <div className="shrink-0 w-2 h-2 rounded-full bg-accent/40" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">
                        {entry.title}
                      </span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent shrink-0">
                        {entry.action}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary/60 mt-0.5">
                      {formatDate(entry.timestamp)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleOpenProject(entry.projectId)}
                    className="md:opacity-0 md:group-hover:opacity-100 p-2 rounded-lg hover:bg-surface transition-colors"
                    title="프로젝트 열기"
                  >
                    <ExternalLink size={14} className="text-text-secondary" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
