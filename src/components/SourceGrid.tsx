"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, Download, ExternalLink, Heart, X } from "lucide-react";

export interface SourceItem {
  id: string;
  type: "meme" | "stock" | "stock-image" | "google";
  title: string;
  thumbnail: string;
  source: string;
  sourceUrl?: string;
  duration?: string;
  tags: string[];
  original?: string;
}

export interface LineResult {
  line: string;
  lineIndex: number;
  keywords: string[];
  items: SourceItem[];
  errors: string[];
}

function SkeletonSection() {
  return (
    <div className="mb-10">
      <div className="h-5 w-2/3 rounded-lg animate-shimmer mb-3" />
      <div className="h-3 w-1/4 rounded-lg animate-shimmer mb-4" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden bg-surface border border-border">
            <div className="aspect-video animate-shimmer" />
            <div className="p-3 space-y-2">
              <div className="h-3.5 w-3/4 rounded-lg animate-shimmer" />
              <div className="h-3 w-1/2 rounded-lg animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImageModal({ item, onClose }: { item: SourceItem; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const typeLabel = {
    meme: "밈",
    stock: "스톡영상",
    "stock-image": "스톡이미지",
    google: "구글",
  }[item.type];

  const imgSrc = item.original || item.thumbnail;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-modal-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-[90vw] max-h-[90vh] bg-surface rounded-2xl overflow-hidden shadow-2xl animate-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>

        <div className="relative bg-black flex items-center justify-center max-h-[70vh]">
          <img
            src={imgSrc}
            alt={item.title}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-accent-light text-accent mb-2">
                {typeLabel}
              </span>
              <h3 className="text-base font-semibold text-foreground line-clamp-2 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-text-secondary">{item.source}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
                >
                  <ExternalLink size={14} />
                  원본 보기
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceCard({ item, onClick }: { item: SourceItem; onClick: () => void }) {
  const typeLabel = {
    meme: "밈",
    stock: "스톡영상",
    "stock-image": "스톡이미지",
    google: "구글",
  }[item.type];

  const typeColor = {
    meme: "bg-yellow-100 text-yellow-700",
    stock: "bg-blue-100 text-blue-700",
    "stock-image": "bg-purple-100 text-purple-700",
    google: "bg-green-100 text-green-700",
  }[item.type];

  return (
    <div
      className="group rounded-2xl overflow-hidden bg-surface border border-border hover:shadow-lg hover:border-border/50 transition-all duration-300 animate-fade-in-up cursor-pointer"
      onClick={onClick}
    >
      <div className="relative aspect-video overflow-hidden bg-surface-hover">
        <img
          src={item.thumbnail}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {item.type === "stock" && (
              <button className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors">
                <Play size={16} className="text-foreground ml-0.5" fill="currentColor" />
              </button>
            )}
            <button className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors">
              <Download size={14} className="text-foreground" />
            </button>
            <button className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors">
              <Heart size={14} className="text-foreground" />
            </button>
          </div>
        </div>

        {item.duration && (
          <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[11px] font-medium backdrop-blur-sm">
            {item.duration}
          </span>
        )}

        <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[11px] font-medium ${typeColor}`}>
          {typeLabel}
        </span>
      </div>

      <div className="p-3">
        <h3 className="text-[13px] font-medium text-foreground line-clamp-1 mb-0.5">
          {item.title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-text-secondary">{item.source}</span>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink size={12} className="text-text-secondary hover:text-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

function LineSkeletonCards() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 ml-10">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-2xl overflow-hidden bg-surface border border-border">
          <div className="aspect-video animate-shimmer" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 w-3/4 rounded-lg animate-shimmer" />
            <div className="h-3 w-1/2 rounded-lg animate-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface LineSourceSectionProps {
  result: LineResult;
  index: number;
  activeCategory: string;
  isLineLoading: boolean;
  onItemClick: (item: SourceItem) => void;
}

function LineSourceSection({ result, index, activeCategory, isLineLoading, onItemClick }: LineSourceSectionProps) {
  const filtered =
    activeCategory === "all"
      ? result.items
      : result.items.filter((s) => s.type === activeCategory);

  return (
    <div
      className="mb-10 animate-fade-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold mt-0.5 transition-colors ${isLineLoading ? "bg-accent/50" : "bg-accent"}`}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-foreground leading-relaxed font-medium">
            {result.line}
          </p>
          {isLineLoading ? (
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-3 h-3 rounded-full bg-accent/30 animate-pulse" />
              <span className="text-[11px] text-text-secondary">소스 검색 중...</span>
            </div>
          ) : (
            <>
              {result.keywords.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {result.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 rounded-full bg-accent-light text-accent text-[11px] font-medium"
                    >
                      {kw}
                    </span>
                  ))}
                  <span className="text-[11px] text-text-secondary ml-1">
                    {filtered.length}개 소스
                  </span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="mt-1.5 text-[11px] text-red-500">
                  {result.errors.join(" · ")}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {isLineLoading ? (
        <LineSkeletonCards />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 ml-10">
          {filtered.map((item) => (
            <SourceCard key={item.id} item={item} onClick={() => onItemClick(item)} />
          ))}
        </div>
      ) : (
        <div className="ml-10 py-6 text-center text-sm text-text-secondary bg-surface-hover/50 rounded-xl">
          해당 카테고리의 소스가 없습니다
        </div>
      )}
    </div>
  );
}

interface SourceResultsProps {
  lineResults: LineResult[];
  loadingLines: Set<number>;
  activeCategory: string;
}

export default function SourceResults({
  lineResults,
  loadingLines,
  activeCategory,
}: SourceResultsProps) {
  const [modalItem, setModalItem] = useState<SourceItem | null>(null);

  const handleClose = useCallback(() => setModalItem(null), []);

  if (lineResults.length === 0) return null;

  return (
    <div>
      {lineResults.map((result) => (
        <LineSourceSection
          key={result.lineIndex}
          result={result}
          index={result.lineIndex}
          activeCategory={activeCategory}
          isLineLoading={loadingLines.has(result.lineIndex)}
          onItemClick={setModalItem}
        />
      ))}

      {modalItem && <ImageModal item={modalItem} onClose={handleClose} />}
    </div>
  );
}
