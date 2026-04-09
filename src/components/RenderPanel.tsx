"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  X, ChevronDown, ChevronUp, Download, Film, CheckCircle2,
  AlertCircle, Loader2, Clock, Minimize2,
} from "lucide-react";

export interface RenderJob {
  id: string;
  label: string;
  progress: number;
  done: boolean;
  error?: string;
  url?: string;
  startedAt: number;
  sceneCount: number;
}

interface RenderPanelProps {
  jobs: RenderJob[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}초`;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}분 ${sec}초`;
}

function estimateRemaining(progress: number, elapsed: number): string {
  if (progress <= 0.01) return "계산 중...";
  const total = elapsed / progress;
  const remaining = total - elapsed;
  if (remaining < 60_000) return "곧 완료";
  const min = Math.ceil(remaining / 60_000);
  return `약 ${min}분 남음`;
}

function JobItem({ job, onDismiss }: { job: RenderJob; onDismiss: () => void }) {
  const elapsed = Date.now() - job.startedAt;
  const pct = Math.round(job.progress * 100);

  return (
    <div className="px-4 py-3 border-b border-ed-border/50 last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          {job.error ? (
            <AlertCircle size={14} className="text-red-400 shrink-0" />
          ) : job.done ? (
            <CheckCircle2 size={14} className="text-green-400 shrink-0" />
          ) : (
            <Loader2 size={14} className="text-accent animate-spin shrink-0" />
          )}
          <span className="text-xs font-medium truncate">{job.label}</span>
        </div>
        <button onClick={onDismiss} className="p-0.5 rounded hover:bg-ed-surface-active transition-colors shrink-0">
          <X size={12} className="text-ed-text-dim" />
        </button>
      </div>

      {job.error ? (
        <p className="text-[10px] text-red-400 leading-relaxed">{job.error}</p>
      ) : job.done && job.url ? (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-green-500/20 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: "100%" }} />
          </div>
          <a
            href={job.url}
            download
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-green-600 text-white rounded-md hover:bg-green-500 transition-colors shrink-0"
          >
            <Download size={10} /> 다운로드
          </a>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-1.5 rounded-full bg-ed-surface-active overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-700 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[10px] text-ed-text-muted font-mono w-8 text-right shrink-0">{pct}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-ed-text-dim flex items-center gap-1">
              <Clock size={9} />
              {formatElapsed(elapsed)}
            </span>
            <span className="text-[10px] text-ed-text-dim">
              {estimateRemaining(job.progress, elapsed)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default function RenderPanel({ jobs, onDismiss, onDismissAll }: RenderPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevCountRef = useRef(jobs.length);

  useEffect(() => {
    if (jobs.length > prevCountRef.current) {
      setCollapsed(false);
      setHidden(false);
    }
    prevCountRef.current = jobs.length;
  }, [jobs.length]);

  if (jobs.length === 0 || hidden) return null;

  const active = jobs.filter((j) => !j.done && !j.error);
  const completed = jobs.filter((j) => j.done && !j.error);
  const failed = jobs.filter((j) => j.error);

  const headerLabel = active.length > 0
    ? `렌더링 중 ${active.length}건`
    : completed.length > 0
      ? `완료 ${completed.length}건`
      : `실패 ${failed.length}건`;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 rounded-xl shadow-2xl border border-ed-border bg-ed-bg-deep/95 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-ed-surface/50 cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <Film size={14} className={active.length > 0 ? "text-accent" : "text-green-400"} />
          <span className="text-xs font-semibold">{headerLabel}</span>
          {active.length > 0 && active[0] && (
            <span className="text-[10px] text-ed-text-muted font-mono">
              {Math.round(active[0].progress * 100)}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setHidden(true); }}
            className="p-1 rounded hover:bg-ed-surface-active transition-colors"
            title="패널 숨기기"
          >
            <Minimize2 size={12} className="text-ed-text-dim" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCollapsed((c) => !c); }}
            className="p-1 rounded hover:bg-ed-surface-active transition-colors"
          >
            {collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
      </div>

      {/* Mini progress bar visible when collapsed */}
      {collapsed && active.length > 0 && (
        <div className="h-1 bg-ed-surface-active">
          <div
            className="h-full bg-accent transition-all duration-700 ease-out"
            style={{ width: `${Math.round(active[0].progress * 100)}%` }}
          />
        </div>
      )}

      {/* Job list */}
      {!collapsed && (
        <div className="max-h-64 overflow-y-auto">
          {jobs.map((job) => (
            <JobItem key={job.id} job={job} onDismiss={() => onDismiss(job.id)} />
          ))}
        </div>
      )}

      {/* Footer */}
      {!collapsed && jobs.length > 1 && (
        <div className="px-4 py-2 border-t border-ed-border/50 flex justify-end">
          <button
            onClick={onDismissAll}
            className="text-[10px] text-ed-text-dim hover:text-ed-text-muted transition-colors"
          >
            모두 지우기
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Render Confirm Dialog ── */

interface RenderConfirmProps {
  open: boolean;
  sceneCount: number;
  estimatedSeconds: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RenderConfirmDialog({ open, sceneCount, estimatedSeconds, onConfirm, onCancel }: RenderConfirmProps) {
  if (!open) return null;

  const minutes = Math.ceil(estimatedSeconds / 60);
  const timeLabel = minutes <= 1 ? "약 1분" : minutes >= 60 ? `최대 ${Math.ceil(minutes / 60)}시간` : `약 ${minutes}분`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-ed-bg-deep border border-ed-border rounded-2xl shadow-2xl w-96 max-w-[90vw] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <Film size={20} className="text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-bold">영상 내보내기</h3>
              <p className="text-[11px] text-ed-text-muted">AWS Lambda로 렌더링합니다</p>
            </div>
          </div>

          <div className="space-y-2.5 mb-5">
            <div className="flex items-center justify-between px-3 py-2 bg-ed-surface/50 rounded-lg">
              <span className="text-[11px] text-ed-text-muted">장면 수</span>
              <span className="text-[11px] font-semibold">{sceneCount}개</span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-ed-surface/50 rounded-lg">
              <span className="text-[11px] text-ed-text-muted">예상 소요 시간</span>
              <span className="text-[11px] font-semibold flex items-center gap-1">
                <Clock size={11} className="text-accent" /> {timeLabel}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2 bg-ed-surface/50 rounded-lg">
              <span className="text-[11px] text-ed-text-muted">크레딧 차감</span>
              <span className="text-[11px] font-semibold text-amber-400">10 크레딧</span>
            </div>
          </div>

          <p className="text-[10px] text-ed-text-dim leading-relaxed">
            렌더링이 시작되면 우측 하단에서 진행 상황을 확인할 수 있습니다.
            페이지를 벗어나도 서버에서 계속 진행됩니다.
          </p>
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-t border-ed-border/50 bg-ed-surface/30">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-medium text-ed-text-muted bg-ed-surface rounded-lg hover:bg-ed-surface-active transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 text-xs font-bold text-white bg-accent rounded-lg hover:bg-accent/90 transition-colors"
          >
            렌더링 시작
          </button>
        </div>
      </div>
    </div>
  );
}
