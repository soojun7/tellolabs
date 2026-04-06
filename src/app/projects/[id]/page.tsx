"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  ArrowLeft, Film, Clock, Clapperboard, Image as ImageIcon,
  Play, Pencil, Trash2, Bookmark, BookmarkCheck, Check, X,
  Download, ExternalLink, Volume2, ImagePlus,
} from "lucide-react";
import { getProject, deleteProject, toggleSaved, renameProject, saveProject, type Project, type ThumbnailItem } from "@/lib/projectStore";
import ThumbnailEditor, { type TextLayer } from "@/components/ThumbnailEditor";

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

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [thumbEditorOpen, setThumbEditorOpen] = useState(false);
  const [editingThumbIdx, setEditingThumbIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const p = getProject(projectId);
    if (!p) {
      router.replace("/projects");
      return;
    }
    setProject(p);
  }, [projectId, router]);

  if (!project) {
    return (
      <div className="flex h-full">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-text-secondary">로딩 중...</p>
        </main>
      </div>
    );
  }

  const motionCount = project.scenes.filter((s) => s.sceneType === "motion").length;
  const imageCount = project.scenes.filter((s) => s.sceneType === "image").length;
  const videoClipCount = project.scenes.filter((s) => s.videoClipUrl).length;
  const ttsCount = project.scenes.filter((s) => s.audioUrl).length;
  const totalDuration = project.scenes.reduce((sum, s) => sum + (s.audioDuration || 0), 0);

  const handleGoEditor = () => {
    sessionStorage.setItem("sourcebox-scenes", JSON.stringify(project.scenes));
    sessionStorage.setItem("sourcebox-project-id", project.id);
    router.push("/editor");
  };

  const normThumbs = (thumbs?: ThumbnailItem[] | string[]): ThumbnailItem[] =>
    (thumbs || []).map((t: ThumbnailItem | string) => typeof t === "string" ? { imageUrl: t } : t);

  const handleSaveThumbnail = (dataUrl: string, layerData?: TextLayer[], bg?: string) => {
    const item: ThumbnailItem = { imageUrl: dataUrl, layers: layerData, bgImage: bg };
    const existing = normThumbs(project.thumbnails);
    if (editingThumbIdx !== null && editingThumbIdx < existing.length) {
      existing[editingThumbIdx] = item;
    } else {
      if (project.thumbnailUrl && !existing.some(t => t.imageUrl === project.thumbnailUrl)) {
        existing.unshift({ imageUrl: project.thumbnailUrl });
      }
      existing.unshift(item);
    }
    saveProject({ ...project, thumbnailUrl: dataUrl, thumbnails: existing });
    setProject(getProject(project.id));
    setThumbEditorOpen(false);
    setEditingThumbIdx(null);
  };

  const sceneImages = project.scenes.filter((s) => s.mainImage).map((s) => s.mainImage);

  const handleDelete = () => {
    if (!confirm("이 프로젝트를 삭제하시겠습니까?")) return;
    deleteProject(project.id);
    router.replace("/projects");
  };

  const handleToggleSaved = () => {
    toggleSaved(project.id);
    setProject(getProject(project.id));
  };

  const startEditing = () => {
    setEditing(true);
    setEditTitle(project.title);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const confirmRename = () => {
    if (editTitle.trim()) {
      renameProject(project.id, editTitle.trim());
      setProject(getProject(project.id));
    }
    setEditing(false);
  };

  const firstImage = project.scenes.find((s) => s.mainImage)?.mainImage;

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-8">
          {/* Back */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-4 md:mb-6"
          >
            <ArrowLeft size={16} />
            뒤로가기
          </button>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5 md:mb-8">
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    ref={inputRef}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") confirmRename();
                      if (e.key === "Escape") setEditing(false);
                    }}
                    className="flex-1 max-w-md px-3 py-2 text-xl font-bold bg-surface border border-accent rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground"
                  />
                  <button onClick={confirmRename} className="p-2 rounded-xl bg-accent/10 hover:bg-accent/20 transition-colors">
                    <Check size={18} className="text-accent" />
                  </button>
                  <button onClick={() => setEditing(false)} className="p-2 rounded-xl hover:bg-red-50 transition-colors">
                    <X size={18} className="text-text-secondary" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{project.title}</h1>
                  <button onClick={startEditing} className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors shrink-0">
                    <Pencil size={14} className="text-text-secondary" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <Clock size={13} />
                  {formatDate(project.updatedAt)}
                </span>
                <span>{project.scenes.length}개 씬</span>
                {totalDuration > 0 && (
                  <span>약 {Math.ceil(totalDuration)}초</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleToggleSaved}
                className="p-2.5 rounded-xl border border-border hover:bg-surface-hover transition-colors"
                title={project.saved ? "저장 해제" : "저장"}
              >
                {project.saved ? <BookmarkCheck size={18} className="text-accent" /> : <Bookmark size={18} className="text-text-secondary" />}
              </button>
              <button
                onClick={handleDelete}
                className="p-2.5 rounded-xl border border-border hover:bg-red-50 transition-colors"
                title="삭제"
              >
                <Trash2 size={18} className="text-text-secondary hover:text-red-500" />
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Video / Thumbnail Preview */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl overflow-hidden bg-black border border-border aspect-video relative">
                {project.renderUrl ? (
                  <video
                    ref={videoRef}
                    src={project.renderUrl}
                    controls
                    className="w-full h-full object-contain"
                    poster={firstImage || undefined}
                  />
                ) : firstImage ? (
                  <div className="relative w-full h-full">
                    <img src={firstImage} alt="thumbnail" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40">
                      <Film size={40} className="text-white/40 mb-3" />
                      <p className="text-white/60 text-sm">아직 완성된 영상이 없습니다</p>
                      <p className="text-white/40 text-xs mt-1">에디터에서 전체 내보내기를 해주세요</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Film size={40} className="text-white/20 mb-3" />
                    <p className="text-white/30 text-sm">미리보기 없음</p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 md:gap-3 mt-3 md:mt-4 overflow-x-auto scrollbar-hide pb-1">
                <button
                  onClick={handleGoEditor}
                  className="flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors shadow-sm shrink-0"
                >
                  <Pencil size={15} />
                  에디터 열기
                </button>
                {project.renderUrl && (
                  <a
                    href={project.renderUrl}
                    download
                    className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors shrink-0"
                  >
                    <Download size={15} />
                    다운로드
                  </a>
                )}
                <button
                  onClick={() => { setEditingThumbIdx(null); setThumbEditorOpen(true); }}
                  disabled={sceneImages.length === 0}
                  className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-purple-500 text-white rounded-xl font-medium text-sm hover:bg-purple-600 transition-colors disabled:opacity-40 shrink-0"
                >
                  <ImagePlus size={15} />
                  썸네일
                </button>
                <button
                  disabled
                  className="flex items-center gap-2 px-4 md:px-5 py-2.5 md:py-3 bg-surface border border-border text-text-secondary rounded-xl font-medium text-sm opacity-50 cursor-not-allowed shrink-0"
                  title="추후 지원 예정"
                >
                  <ExternalLink size={15} />
                  업로드
                </button>
              </div>
            </div>

            {/* Project Info */}
            <div className="space-y-4">
              {/* Stats */}
              <div className="p-5 bg-surface border border-border rounded-xl">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">프로젝트 정보</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-secondary">
                      <Clapperboard size={14} className="text-accent" /> 모션 씬
                    </span>
                    <span className="text-sm font-semibold text-foreground">{motionCount}개</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-secondary">
                      <ImageIcon size={14} className="text-blue-400" /> 이미지 씬
                    </span>
                    <span className="text-sm font-semibold text-foreground">{imageCount}개</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-secondary">
                      <Film size={14} className="text-purple-400" /> 영상 클립
                    </span>
                    <span className="text-sm font-semibold text-foreground">{videoClipCount}개</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-text-secondary">
                      <Volume2 size={14} className="text-green-400" /> TTS
                    </span>
                    <span className="text-sm font-semibold text-foreground">{ttsCount}개</span>
                  </div>
                  {totalDuration > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <span className="flex items-center gap-2 text-sm text-text-secondary">
                        <Play size={14} /> 총 길이
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {Math.floor(totalDuration / 60) > 0 && `${Math.floor(totalDuration / 60)}분 `}
                        {Math.ceil(totalDuration % 60)}초
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnails */}
              {(() => {
                const thumbs = normThumbs(project.thumbnails);
                const hasAny = thumbs.length > 0 || project.thumbnailUrl;
                if (!hasAny) return null;
                const displayThumbs = thumbs.length > 0 ? thumbs : project.thumbnailUrl ? [{ imageUrl: project.thumbnailUrl }] : [];
                return (
                  <div className="p-4 md:p-5 bg-surface border border-border rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                        썸네일 {displayThumbs.length > 1 && `(${displayThumbs.length})`}
                      </h3>
                      <button
                        onClick={() => { setEditingThumbIdx(null); setThumbEditorOpen(true); }}
                        className="text-[10px] text-accent hover:text-accent/80 transition-colors"
                      >
                        + 추가 생성
                      </button>
                    </div>
                    <div className="space-y-2">
                      {displayThumbs.map((item, ti) => (
                        <div key={ti} className="relative group rounded-lg overflow-hidden border border-border">
                          <img src={item.imageUrl} alt={`썸네일 ${ti + 1}`} className="w-full" />
                          <div className="absolute inset-0 bg-black/40 md:bg-black/0 md:group-hover:bg-black/40 transition-colors flex items-end md:items-center justify-center gap-2 p-2 md:p-0 opacity-100 md:opacity-0 md:group-hover:opacity-100">
                            <button
                              onClick={() => { setEditingThumbIdx(ti); setThumbEditorOpen(true); }}
                              className="px-2.5 py-1.5 text-[10px] font-medium bg-white/90 text-gray-800 rounded-lg hover:bg-white transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => {
                                saveProject({ ...project, thumbnailUrl: item.imageUrl });
                                setProject(getProject(project.id));
                              }}
                              className={`px-2.5 py-1.5 text-[10px] font-medium rounded-lg transition-colors ${project.thumbnailUrl === item.imageUrl ? "bg-accent text-white" : "bg-white/90 text-gray-800 hover:bg-white"}`}
                            >
                              {project.thumbnailUrl === item.imageUrl ? "대표" : "대표로 설정"}
                            </button>
                            <a href={item.imageUrl} download={`thumbnail-${ti + 1}.png`} className="px-2.5 py-1.5 text-[10px] font-medium bg-white/90 text-gray-800 rounded-lg hover:bg-white transition-colors">
                              다운로드
                            </a>
                            {displayThumbs.length > 1 && (
                              <button
                                onClick={() => {
                                  const updated = normThumbs(project.thumbnails).filter((_, i) => i !== ti);
                                  const newMain = project.thumbnailUrl === item.imageUrl ? (updated[0]?.imageUrl || undefined) : project.thumbnailUrl;
                                  saveProject({ ...project, thumbnails: updated, thumbnailUrl: newMain });
                                  setProject(getProject(project.id));
                                }}
                                className="px-2.5 py-1.5 text-[10px] font-medium bg-red-500/90 text-white rounded-lg hover:bg-red-500 transition-colors"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                          {project.thumbnailUrl === item.imageUrl && (
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-bold bg-accent text-white rounded-md">대표</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Script preview */}
              <div className="p-5 bg-surface border border-border rounded-xl">
                <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">대본</h3>
                <p className="text-sm text-text-secondary leading-relaxed line-clamp-[12]">
                  {project.script || project.scenes.map((s) => s.line).join("\n")}
                </p>
              </div>
            </div>
          </div>

          {/* Scene thumbnails */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-4">장면 미리보기</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {project.scenes.map((scene, i) => (
                <div
                  key={i}
                  className="group relative rounded-xl overflow-hidden bg-surface border border-border hover:border-accent/30 transition-all cursor-pointer"
                  onClick={handleGoEditor}
                >
                  <div className="aspect-video bg-black/5">
                    {scene.mainImage ? (
                      <img src={scene.mainImage} alt={`씬 ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {scene.sceneType === "motion" ? (
                          <Clapperboard size={20} className="text-accent/30" />
                        ) : (
                          <ImageIcon size={20} className="text-text-secondary/20" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-text-secondary/50">#{i + 1}</span>
                      <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                        scene.sceneType === "motion" ? "bg-accent/10 text-accent" : "bg-blue-50 text-blue-400"
                      }`}>
                        {scene.sceneType === "motion" ? "모션" : scene.videoClipUrl ? "영상" : "이미지"}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">
                      {scene.line}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {thumbEditorOpen && (() => {
        const thumbs = normThumbs(project.thumbnails);
        const editItem = editingThumbIdx !== null ? thumbs[editingThumbIdx] : null;
        return (
          <ThumbnailEditor
            images={sceneImages}
            script={project.script || project.scenes.map((s) => s.line).join("\n")}
            onSave={handleSaveThumbnail}
            onSaveAdd={(dataUrl, layerData, bg) => {
              const item: ThumbnailItem = { imageUrl: dataUrl, layers: layerData, bgImage: bg };
              const existing = normThumbs(project.thumbnails);
              if (project.thumbnailUrl && !existing.some(t => t.imageUrl === project.thumbnailUrl)) {
                existing.unshift({ imageUrl: project.thumbnailUrl });
              }
              existing.unshift(item);
              saveProject({ ...project, thumbnailUrl: project.thumbnailUrl || dataUrl, thumbnails: existing });
              setProject(getProject(project.id));
            }}
            onClose={() => { setThumbEditorOpen(false); setEditingThumbIdx(null); }}
            initialThumbnail={editItem ? (editItem.bgImage ? undefined : editItem.imageUrl) : project.thumbnailUrl}
            initialLayers={editItem?.layers as TextLayer[] | undefined}
            initialBgImage={editItem?.bgImage || (editItem && !editItem.layers ? editItem.imageUrl : undefined)}
          />
        );
      })()}
    </div>
  );
}
