"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  X, Download, Save, Type, Plus, Trash2,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Move, ChevronLeft, ChevronRight, Loader2, Sparkles,
  Link, Upload, Wand2, Eye, PenLine, Camera, Users, MapPin,
  Paintbrush, AArrowUp, AArrowDown,
} from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

export interface TextSegment {
  text: string;
  color?: string;
  fontSize?: number;
}

export interface TextLayer {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  lineColors: string[];
  segments?: TextSegment[][];
  strokeColor: string;
  strokeWidth: number;
  bold: boolean;
  italic: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number;
  lineHeight: number;
  shadow: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

interface CopySuggestion {
  copy: string;
  lines: number;
}

interface ThumbnailAnalysis {
  background: string;
  characters: string;
  staging: string;
  textElements: string;
  summary: string;
}

interface ThumbnailEditorProps {
  images: string[];
  script: string;
  projectStylePrompt?: string;
  projectStyleImage?: string;
  onSave: (dataUrl: string, layers: TextLayer[], bgImage: string) => void;
  onSaveAdd?: (dataUrl: string, layers: TextLayer[], bgImage: string) => void;
  onClose: () => void;
  initialThumbnail?: string;
  initialLayers?: TextLayer[];
  initialBgImage?: string;
}

const CANVAS_W = 1920;
const CANVAS_H = 1080;

const FONT_OPTIONS = [
  "Noto Sans KR", "Noto Serif KR", "Arial Black", "Impact", "Georgia", "Verdana",
];

const COLOR_PRESETS = [
  "#FFFFFF", "#000000", "#FF0000", "#FFFF00", "#00FF00",
  "#00BFFF", "#FF6600", "#FF00FF", "#333333", "#FFD700",
];

function genId() {
  return Math.random().toString(36).slice(2, 8);
}

function extractYtVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function getYtThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

type Step = "reference" | "analysis" | "customize" | "editor";

const STEP_LABELS: Record<Step, string> = {
  reference: "래퍼런스",
  analysis: "AI 분석",
  customize: "변경 요청",
  editor: "편집",
};

export default function ThumbnailEditor({
  images, script, projectStylePrompt, projectStyleImage,
  onSave, onSaveAdd, onClose, initialThumbnail, initialLayers, initialBgImage,
}: ThumbnailEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [step, setStep] = useState<Step>(initialThumbnail || initialLayers ? "editor" : "reference");

  // Reference step
  const [refUrl, setRefUrl] = useState("");
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refLoading, setRefLoading] = useState(false);
  const [refError, setRefError] = useState("");

  // Analysis step
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ThumbnailAnalysis | null>(null);

  // Customize step
  const [custBackground, setCustBackground] = useState("");
  const [custCharacters, setCustCharacters] = useState("");
  const [custStaging, setCustStaging] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // AI copy
  const [copySuggestions, setCopySuggestions] = useState<CopySuggestion[]>([]);
  const [loadingCopy, setLoadingCopy] = useState(false);

  // Editor step
  const [bgImage, setBgImage] = useState(initialBgImage || initialThumbnail || images[0] || "");
  const [bgImageIdx, setBgImageIdx] = useState(0);
  const [layers, setLayers] = useState<TextLayer[]>(initialLayers || []);
  const [selectedLayerId, setSelectedLayerId] = useState(initialLayers?.[0]?.id || "");
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [bgLoaded, setBgLoaded] = useState<HTMLImageElement | null>(null);

  const selectedLayer = layers.find((l) => l.id === selectedLayerId);
  const allImages = [...images, ...(generatedImage ? [generatedImage] : [])];

  const updateLayer = useCallback((id: string, patch: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }, []);

  // Load reference
  const handleLoadRef = useCallback(async () => {
    if (!refUrl.trim()) return;
    setRefLoading(true);
    setRefError("");
    try {
      const ytId = extractYtVideoId(refUrl.trim());
      if (ytId) {
        setRefImage(getYtThumbnail(ytId));
      } else if (refUrl.startsWith("http")) {
        setRefImage(refUrl.trim());
      } else {
        setRefError("유효한 YouTube 링크 또는 이미지 URL을 입력해주세요.");
      }
    } catch {
      setRefError("이미지를 불러올 수 없습니다.");
    } finally {
      setRefLoading(false);
    }
  }, [refUrl]);

  const handleRefUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setRefLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) setRefImage(data.url);
    } catch {
      setRefError("업로드 실패");
    } finally {
      setRefLoading(false);
    }
  }, []);

  // Analyze thumbnail
  const handleAnalyze = useCallback(async () => {
    if (!refImage) return;
    setAnalyzing(true);
    setRefError("");
    setAnalysis(null);
    try {
      const imgUrl = refImage.startsWith("/") ? `${window.location.origin}${refImage}` : refImage;
      const res = await apiFetch("/api/analyze-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imgUrl }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setStep("analysis");
      } else {
        setRefError(data.error || "분석 실패");
      }
    } catch (err: unknown) {
      setRefError((err as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }, [refImage]);

  // Generate thumbnail
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setRefError("");
    try {
      const customizations = {
        background: custBackground.trim() || undefined,
        characters: custCharacters.trim() || undefined,
        staging: custStaging.trim() || undefined,
      };

      const res = await apiFetch("/api/generate-thumbnail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referenceImageUrl: refImage || "",
          analysisResult: analysis,
          customizations,
          projectStylePrompt: projectStylePrompt || undefined,
          projectStyleImage: projectStyleImage || undefined,
          script: script.slice(0, 500),
        }),
      });
      const data = await res.json();
      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        setBgImage(data.imageUrl);
        setBgImageIdx(allImages.length);
        setStep("editor");
      } else {
        setRefError(data.error || "생성 실패");
      }
    } catch (err: unknown) {
      setRefError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }, [refImage, analysis, custBackground, custCharacters, custStaging, projectStylePrompt, projectStyleImage, script, allImages.length]);

  const handleSuggestCopy = useCallback(async () => {
    setLoadingCopy(true);
    try {
      const res = await apiFetch("/api/suggest-thumbnail-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: script.slice(0, 2000),
          referenceImageUrl: refImage && refImage.startsWith("http") ? refImage : undefined,
          referenceTextElements: analysis?.textElements || undefined,
          referenceSummary: analysis?.summary || undefined,
        }),
      });
      const data = await res.json();
      if (data.suggestions) setCopySuggestions(data.suggestions);
    } catch { /* ignore */ } finally {
      setLoadingCopy(false);
    }
  }, [script, refImage]);

  const handleSkipToEditor = () => {
    if (images.length > 0) { setBgImage(images[0]); setBgImageIdx(0); }
    setStep("editor");
  };

  // Canvas rendering
  useEffect(() => {
    if (!bgImage) { setBgLoaded(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setBgLoaded(img);
    img.onerror = () => setBgLoaded(null);
    img.src = bgImage;
  }, [bgImage]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (bgLoaded) {
      const imgR = bgLoaded.width / bgLoaded.height;
      const canR = CANVAS_W / CANVAS_H;
      let sx = 0, sy = 0, sw = bgLoaded.width, sh = bgLoaded.height;
      if (imgR > canR) { sw = bgLoaded.height * canR; sx = (bgLoaded.width - sw) / 2; }
      else { sh = bgLoaded.width / canR; sy = (bgLoaded.height - sh) / 2; }
      ctx.drawImage(bgLoaded, sx, sy, sw, sh, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    }
    for (const layer of layers) {
      const weight = layer.bold ? "bold" : "normal";
      const fstyle = layer.italic ? "italic" : "normal";
      const baseFontSize = layer.fontSize;
      const baseFont = `${fstyle} ${weight} ${baseFontSize}px "${layer.fontFamily}", sans-serif`;
      ctx.font = baseFont;
      ctx.textBaseline = "middle";
      const lines = layer.text.split("\n");
      const lh = baseFontSize * (layer.lineHeight ?? 1.3);
      const startY = layer.y - (lines.length * lh) / 2 + lh / 2;
      const spacing = layer.letterSpacing ?? 0;

      if (layer.shadow) {
        ctx.shadowColor = layer.shadowColor || "#000000";
        ctx.shadowBlur = layer.shadowBlur ?? 10;
        ctx.shadowOffsetX = layer.shadowOffsetX ?? 4;
        ctx.shadowOffsetY = layer.shadowOffsetY ?? 4;
      } else {
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      for (let i = 0; i < lines.length; i++) {
        const ly = startY + i * lh;
        const lineSegs = layer.segments?.[i];
        const lineColor = layer.lineColors?.[i] || layer.color;

        if (lineSegs && lineSegs.length > 0) {
          ctx.textAlign = "left";
          let totalW = 0;
          const segWidths: number[] = [];
          for (const seg of lineSegs) {
            const segSize = seg.fontSize ?? baseFontSize;
            ctx.font = `${fstyle} ${weight} ${segSize}px "${layer.fontFamily}", sans-serif`;
            const w = ctx.measureText(seg.text).width + spacing * seg.text.length;
            segWidths.push(w);
            totalW += w;
          }
          let cx = layer.align === "center" ? layer.x - totalW / 2 : layer.align === "right" ? layer.x - totalW : layer.x;
          for (let s = 0; s < lineSegs.length; s++) {
            const seg = lineSegs[s];
            const segSize = seg.fontSize ?? baseFontSize;
            const segColor = seg.color ?? lineColor;
            ctx.font = `${fstyle} ${weight} ${segSize}px "${layer.fontFamily}", sans-serif`;
            if (layer.strokeWidth > 0) { ctx.strokeStyle = layer.strokeColor; ctx.lineWidth = layer.strokeWidth; ctx.lineJoin = "round"; ctx.strokeText(seg.text, cx, ly); }
            ctx.fillStyle = segColor;
            ctx.fillText(seg.text, cx, ly);
            cx += segWidths[s];
          }
        } else if (spacing === 0) {
          ctx.font = baseFont;
          ctx.textAlign = layer.align;
          if (layer.strokeWidth > 0) { ctx.strokeStyle = layer.strokeColor; ctx.lineWidth = layer.strokeWidth; ctx.lineJoin = "round"; ctx.strokeText(lines[i], layer.x, ly); }
          ctx.fillStyle = lineColor;
          ctx.fillText(lines[i], layer.x, ly);
        } else {
          ctx.font = baseFont;
          ctx.textAlign = "left";
          const chars = [...lines[i]];
          let totalW = 0;
          const charWidths: number[] = [];
          for (const ch of chars) { const w = ctx.measureText(ch).width; charWidths.push(w); totalW += w + spacing; }
          totalW -= spacing;
          let cx2 = layer.align === "center" ? layer.x - totalW / 2 : layer.align === "right" ? layer.x - totalW : layer.x;
          for (let j = 0; j < chars.length; j++) {
            if (layer.strokeWidth > 0) { ctx.strokeStyle = layer.strokeColor; ctx.lineWidth = layer.strokeWidth; ctx.lineJoin = "round"; ctx.strokeText(chars[j], cx2, ly); }
            ctx.fillStyle = lineColor;
            ctx.fillText(chars[j], cx2, ly);
            cx2 += charWidths[j] + spacing;
          }
        }
      }
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }
  }, [bgLoaded, layers]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  const getCanvasCoords = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { cx: 0, cy: 0 };
    const rect = canvas.getBoundingClientRect();
    return { cx: (e.clientX - rect.left) * (CANVAS_W / rect.width), cy: (e.clientY - rect.top) * (CANVAS_H / rect.height) };
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const { cx, cy } = getCanvasCoords(e);
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const halfW = l.fontSize * Math.max(l.text.length, 3) * 0.35;
      const halfH = l.fontSize * 0.8;
      if (cx >= l.x - halfW && cx <= l.x + halfW && cy >= l.y - halfH && cy <= l.y + halfH) {
        setSelectedLayerId(l.id); setDragging(true); setDragOffset({ x: cx - l.x, y: cy - l.y }); return;
      }
    }
  }, [layers, getCanvasCoords]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !selectedLayerId) return;
    const { cx, cy } = getCanvasCoords(e);
    updateLayer(selectedLayerId, { x: Math.max(0, Math.min(CANVAS_W, cx - dragOffset.x)), y: Math.max(0, Math.min(CANVAS_H, cy - dragOffset.y)) });
  }, [dragging, selectedLayerId, dragOffset, getCanvasCoords, updateLayer]);

  const addLayer = (text = "텍스트", y = CANVAS_H * 0.85) => {
    const nl: TextLayer = { id: genId(), text, x: CANVAS_W / 2, y, fontSize: 100, fontFamily: "Noto Sans KR", color: "#FFFFFF", lineColors: [], segments: text.split("\n").map(line => [{ text: line }]), strokeColor: "#000000", strokeWidth: 8, bold: true, italic: false, align: "center", letterSpacing: 0, lineHeight: 1.3, shadow: false, shadowColor: "#000000", shadowBlur: 10, shadowOffsetX: 4, shadowOffsetY: 4 };
    setLayers((prev) => [...prev, nl]);
    setSelectedLayerId(nl.id);
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(layers[0]?.id || "");
  };

  const applyCopy = (copy: string) => {
    if (layers.length === 0) addLayer(copy);
    else if (selectedLayerId) updateLayer(selectedLayerId, { text: copy });
  };

  const [savedNotice, setSavedNotice] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const handleSave = () => { setShowSaveConfirm(true); };
  const confirmSave = () => { setShowSaveConfirm(false); drawCanvas(); const c = canvasRef.current; if (c) onSave(c.toDataURL("image/png"), layers, bgImage); };
  const handleSaveAdd = () => {
    drawCanvas();
    const c = canvasRef.current;
    if (!c) return;
    const dataUrl = c.toDataURL("image/png");
    if (onSaveAdd) onSaveAdd(dataUrl, layers, bgImage);
    else onSave(dataUrl, layers, bgImage);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };
  const handleDownload = () => { drawCanvas(); const c = canvasRef.current; if (!c) return; const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = "thumbnail.png"; a.click(); };

  const prevImg = () => { const i = (bgImageIdx - 1 + allImages.length) % allImages.length; setBgImageIdx(i); setBgImage(allImages[i]); };
  const nextImg = () => { const i = (bgImageIdx + 1) % allImages.length; setBgImageIdx(i); setBgImage(allImages[i]); };

  const STEPS: Step[] = ["reference", "analysis", "customize", "editor"];
  const [editorTab, setEditorTab] = useState<"canvas" | "tools">("canvas");

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-0 md:p-4">
      <div className="bg-ed-bg rounded-none md:rounded-2xl w-full h-full md:h-auto md:max-w-[1200px] md:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-5 py-2.5 md:py-3 border-b border-ed-border shrink-0">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <h2 className="text-ed-text font-semibold text-sm shrink-0">썸네일</h2>
            <div className="flex items-center gap-0.5 md:gap-1 text-[10px] overflow-x-auto scrollbar-hide">
              {STEPS.map((s, i) => {
                const currentIdx = STEPS.indexOf(step);
                const isPast = i < currentIdx;
                const isCurrent = s === step;
                return (
                  <span key={s} className={`flex items-center gap-0.5 md:gap-1 shrink-0 ${isCurrent ? "text-accent" : isPast ? "text-green-500" : "text-ed-text-faint"}`}>
                    {i > 0 && <span className="text-ed-text-faint mx-0.5">→</span>}
                    <span className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[8px] md:text-[9px] font-bold ${isCurrent ? "bg-accent text-white" : isPast ? "bg-green-500 text-white" : "bg-ed-surface-active"}`}>{i + 1}</span>
                    <span className="hidden sm:inline">{STEP_LABELS[s]}</span>
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
            {step === "editor" && (
              <>
                <button onClick={handleDownload} className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-[11px] md:text-xs bg-green-600 text-white rounded-lg hover:bg-green-500 transition-colors">
                  <Download size={12} /> <span className="hidden sm:inline">다운로드</span>
                </button>
                <button onClick={handleSaveAdd} className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-[11px] md:text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors relative">
                  <Plus size={12} /> <span className="hidden sm:inline">추가 저장</span>
                  {savedNotice && <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] bg-green-500 text-white rounded-md whitespace-nowrap animate-modal-content">저장됨!</span>}
                </button>
                <button onClick={handleSave} className="flex items-center gap-1 px-2 md:px-3 py-1.5 text-[11px] md:text-xs bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors">
                  <Save size={12} /> <span className="hidden sm:inline">저장 · 닫기</span>
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ed-surface-active transition-colors">
              <X size={16} className="text-ed-text-muted" />
            </button>
          </div>
        </div>

        {/* ═══ Step 1: Reference ═══ */}
        {step === "reference" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-base md:text-lg font-bold text-ed-text mb-2">래퍼런스 썸네일</h3>
              <p className="text-sm text-ed-text-muted mb-6">참고할 YouTube 썸네일이나 이미지를 등록하세요. AI가 장면을 분석합니다.</p>

              <div className="mb-4">
                <label className="block text-xs text-ed-text-dim mb-1.5">YouTube 링크 또는 이미지 URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ed-text-dim" />
                    <input type="text" value={refUrl} onChange={(e) => setRefUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLoadRef()} placeholder="https://www.youtube.com/watch?v=..." className="w-full pl-9 pr-4 py-2.5 text-sm bg-ed-surface border border-ed-border rounded-xl text-ed-text focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-ed-text-faint" />
                  </div>
                  <button onClick={handleLoadRef} disabled={refLoading || !refUrl.trim()} className="px-4 py-2.5 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-40 shrink-0">
                    {refLoading ? <Loader2 size={14} className="animate-spin" /> : "불러오기"}
                  </button>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs text-ed-text-dim mb-1.5">또는 이미지 직접 업로드</label>
                <label className="flex items-center justify-center gap-2 py-4 border-2 border-dashed border-ed-border rounded-xl cursor-pointer hover:border-ed-text-dim hover:bg-ed-surface-hover transition-all">
                  <Upload size={16} className="text-ed-text-dim" />
                  <span className="text-sm text-ed-text-dim">클릭하여 이미지 업로드</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRefUpload(f); }} />
                </label>
              </div>

              {refError && <p className="text-sm text-red-400 mb-4">{refError}</p>}

              {refImage && (
                <div className="mb-6">
                  <label className="block text-xs text-ed-text-dim mb-1.5">래퍼런스 미리보기</label>
                  <div className="rounded-xl overflow-hidden border border-ed-border bg-ed-bg-deep">
                    <img src={refImage} alt="reference" className="w-full object-contain max-h-[300px]" />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleAnalyze}
                  disabled={!refImage || analyzing}
                  className="flex items-center justify-center gap-2 px-5 md:px-6 py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-40"
                >
                  {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                  {analyzing ? "분석 중..." : "AI 장면 분석"}
                </button>
                <button onClick={handleSkipToEditor} className="flex items-center justify-center gap-2 px-5 py-3 bg-ed-surface text-ed-text-muted rounded-xl text-sm hover:bg-ed-surface-active transition-colors">
                  래퍼런스 없이 직접 만들기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Step 2: AI Analysis ═══ */}
        {step === "analysis" && analysis && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setStep("reference")} className="flex items-center gap-1 text-xs text-ed-text-dim hover:text-ed-text-muted mb-4 transition-colors">
                <ChevronLeft size={14} /> 래퍼런스로 돌아가기
              </button>

              <h3 className="text-base md:text-lg font-bold text-ed-text mb-2">AI 장면 분석</h3>
              <p className="text-sm text-ed-text-muted mb-6">래퍼런스 썸네일을 AI가 분석한 결과입니다. 확인 후 변경 요청으로 진행하세요.</p>

              {/* Reference preview */}
              {refImage && (
                <div className="mb-6 rounded-xl overflow-hidden border border-ed-border bg-ed-bg-deep max-w-sm">
                  <img src={refImage} alt="ref" className="w-full object-contain max-h-[180px]" />
                </div>
              )}

              {/* Summary */}
              {analysis.summary && (
                <div className="mb-5 px-4 py-3 rounded-xl bg-accent/10 border border-accent/20">
                  <p className="text-sm font-medium text-accent">{analysis.summary}</p>
                </div>
              )}

              {/* Analysis cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-xl bg-ed-surface border border-ed-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={14} className="text-blue-400" />
                    <span className="text-xs font-semibold text-ed-text-muted uppercase">배경</span>
                  </div>
                  <p className="text-sm text-ed-text leading-relaxed">{analysis.background || "정보 없음"}</p>
                </div>
                <div className="p-4 rounded-xl bg-ed-surface border border-ed-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-green-400" />
                    <span className="text-xs font-semibold text-ed-text-muted uppercase">인물</span>
                  </div>
                  <p className="text-sm text-ed-text leading-relaxed">{analysis.characters || "정보 없음"}</p>
                </div>
                <div className="p-4 rounded-xl bg-ed-surface border border-ed-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera size={14} className="text-purple-400" />
                    <span className="text-xs font-semibold text-ed-text-muted uppercase">연출</span>
                  </div>
                  <p className="text-sm text-ed-text leading-relaxed">{analysis.staging || "정보 없음"}</p>
                </div>
                <div className="p-4 rounded-xl bg-ed-surface border border-ed-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Type size={14} className="text-orange-400" />
                    <span className="text-xs font-semibold text-ed-text-muted uppercase">텍스트 요소</span>
                  </div>
                  <p className="text-sm text-ed-text leading-relaxed">{analysis.textElements || "없음"}</p>
                </div>
              </div>

              <button
                onClick={() => setStep("customize")}
                className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors"
              >
                <PenLine size={16} />
                변경 요청하기
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ═══ Step 3: Customize ═══ */}
        {step === "customize" && (
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setStep("analysis")} className="flex items-center gap-1 text-xs text-ed-text-dim hover:text-ed-text-muted mb-4 transition-colors">
                <ChevronLeft size={14} /> 분석 결과로 돌아가기
              </button>

              <h3 className="text-base md:text-lg font-bold text-ed-text mb-2">변경 요청</h3>
              <p className="text-sm text-ed-text-muted mb-6">
                원하는 변경사항을 입력하세요. 빈 칸은 원본을 유지합니다. 텍스트는 자동으로 제거됩니다.
              </p>

              {refError && <p className="text-sm text-red-400 mb-4">{refError}</p>}

              <div className="space-y-4 mb-6">
                {/* Background */}
                <div className="p-4 rounded-xl bg-ed-surface border border-ed-border">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={14} className="text-blue-400" />
                    <label className="text-xs font-semibold text-ed-text-muted uppercase">배경 변경</label>
                  </div>
                  {analysis?.background && (
                    <p className="text-[11px] text-ed-text-dim mb-2">현재: {analysis.background}</p>
                  )}
                  <textarea
                    value={custBackground}
                    onChange={(e) => setCustBackground(e.target.value)}
                    rows={2}
                    placeholder="예: 서울 야경으로 변경, 도시 스카이라인"
                    className="w-full bg-ed-bg border border-ed-border rounded-lg px-3 py-2 text-sm text-ed-text resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-ed-text-faint"
                  />
                </div>

                {/* Characters */}
                <div className="p-4 rounded-xl bg-ed-surface border border-ed-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={14} className="text-green-400" />
                    <label className="text-xs font-semibold text-ed-text-muted uppercase">인물 변경</label>
                  </div>
                  {analysis?.characters && (
                    <p className="text-[11px] text-ed-text-dim mb-2">현재: {analysis.characters}</p>
                  )}
                  <textarea
                    value={custCharacters}
                    onChange={(e) => setCustCharacters(e.target.value)}
                    rows={2}
                    placeholder="예: 정장 입은 남성으로, 놀란 표정"
                    className="w-full bg-ed-bg border border-ed-border rounded-lg px-3 py-2 text-sm text-ed-text resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-ed-text-faint"
                  />
                </div>

                {/* Staging */}
                <div className="p-4 rounded-xl bg-ed-surface border border-ed-border">
                  <div className="flex items-center gap-2 mb-2">
                    <Camera size={14} className="text-purple-400" />
                    <label className="text-xs font-semibold text-ed-text-muted uppercase">연출 변경</label>
                  </div>
                  {analysis?.staging && (
                    <p className="text-[11px] text-ed-text-dim mb-2">현재: {analysis.staging}</p>
                  )}
                  <textarea
                    value={custStaging}
                    onChange={(e) => setCustStaging(e.target.value)}
                    rows={2}
                    placeholder="예: 클로즈업으로, 극적인 조명"
                    className="w-full bg-ed-bg border border-ed-border rounded-lg px-3 py-2 text-sm text-ed-text resize-none focus:outline-none focus:ring-1 focus:ring-accent/50 placeholder:text-ed-text-faint"
                  />
                </div>
              </div>

              {generating && (
                <div className="flex items-center justify-center gap-3 py-6 mb-4">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <span className="text-sm text-ed-text-muted">AI가 썸네일을 생성하고 있습니다...</span>
                </div>
              )}

              {generatedImage && !generating && (
                <div className="mb-6">
                  <label className="block text-xs text-ed-text-dim mb-1.5">생성된 썸네일</label>
                  <div className="rounded-xl overflow-hidden border border-accent/30 bg-ed-bg-deep">
                    <img src={generatedImage} alt="generated" className="w-full object-contain" />
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center justify-center gap-2 px-5 md:px-6 py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-40"
                >
                  <Wand2 size={16} className={generating ? "animate-spin" : ""} />
                  {generating ? "생성 중…" : generatedImage ? "다시 생성" : "썸네일 생성"}
                </button>
                {generatedImage && (
                  <button
                    onClick={() => setStep("editor")}
                    className="flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-medium text-sm hover:bg-green-500 transition-colors"
                  >
                    텍스트 편집하기 <ChevronRight size={16} />
                  </button>
                )}
                <button onClick={handleSkipToEditor} className="flex items-center justify-center gap-2 px-4 py-3 bg-ed-surface text-ed-text-muted rounded-xl text-sm hover:bg-ed-surface-active transition-colors">
                  씬 이미지로 직접 만들기
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Step 4: Editor ═══ */}
        {step === "editor" && (
          <div className="flex flex-col md:flex-row flex-1 min-h-0">
            {/* Mobile tab bar for editor */}
            <div className="md:hidden flex items-center border-b border-ed-border bg-ed-bg-deep shrink-0">
              <button onClick={() => setEditorTab("canvas")} className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${editorTab === "canvas" ? "text-accent border-b-2 border-accent" : "text-ed-text-dim"}`}>
                미리보기
              </button>
              <button onClick={() => setEditorTab("tools")} className={`flex-1 py-2.5 text-xs font-medium text-center transition-colors ${editorTab === "tools" ? "text-accent border-b-2 border-accent" : "text-ed-text-dim"}`}>
                텍스트 편집
              </button>
            </div>

            <div className={`${editorTab === "canvas" ? "flex" : "hidden"} md:flex flex-1 flex-col items-center justify-center p-3 md:p-4 bg-ed-bg-deep`}>
              <div className="relative w-full" style={{ maxWidth: 760 }}>
                <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="w-full rounded-lg cursor-crosshair" style={{ aspectRatio: "16/9" }}
                  onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={() => setDragging(false)} onMouseLeave={() => setDragging(false)} />
                {allImages.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    <button onClick={prevImg} className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"><ChevronLeft size={16} className="text-white" /></button>
                    <span className="text-white/70 text-xs bg-black/60 px-2 py-0.5 rounded-full">{bgImageIdx + 1}/{allImages.length}</span>
                    <button onClick={nextImg} className="p-1.5 rounded-full bg-black/60 hover:bg-black/80 transition-colors"><ChevronRight size={16} className="text-white" /></button>
                  </div>
                )}
              </div>
              <button onClick={() => setStep(analysis ? "customize" : "reference")} className="mt-3 flex items-center gap-1 text-[10px] text-ed-text-dim hover:text-ed-text-muted transition-colors">
                <ChevronLeft size={12} /> {analysis ? "변경 요청으로" : "래퍼런스로"}
              </button>
            </div>

            <div className={`${editorTab === "tools" ? "flex" : "hidden"} md:flex w-full md:w-[300px] md:border-l border-ed-border flex-col overflow-y-auto scrollbar-hide`}>
              <div className="p-4 border-b border-ed-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-ed-text-muted uppercase">AI 카피 추천</span>
                  <button onClick={handleSuggestCopy} disabled={loadingCopy} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-500/20 text-purple-400 rounded-md hover:bg-purple-500/30 transition-colors disabled:opacity-40">
                    {loadingCopy ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} 추천받기
                  </button>
                </div>
                {copySuggestions.length > 0 && (
                  <div className="space-y-1">
                    {copySuggestions.map((s, i) => (
                      <button key={i} onClick={() => applyCopy(s.copy)} className="w-full text-left px-2.5 py-2 rounded-lg text-xs text-ed-text-muted bg-ed-surface hover:bg-ed-surface-active transition-all">
                        <span className="text-[9px] text-purple-400/60 mr-1">{s.lines}줄</span>
                        {s.copy}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-b border-ed-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold text-ed-text-muted uppercase">텍스트 레이어</span>
                  <button onClick={() => addLayer()} className="flex items-center gap-1 px-2 py-1 text-[10px] bg-accent/20 text-accent rounded-md hover:bg-accent/30 transition-colors">
                    <Plus size={10} /> 추가
                  </button>
                </div>
                <div className="space-y-1">
                  {layers.map((l) => (
                    <div key={l.id} onClick={() => setSelectedLayerId(l.id)} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-all ${selectedLayerId === l.id ? "bg-ed-surface-active ring-1 ring-accent/50" : "hover:bg-ed-surface-hover"}`}>
                      <Type size={12} className="text-ed-text-dim shrink-0" />
                      <span className="text-xs text-ed-text-muted truncate flex-1">{l.text || "빈 텍스트"}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }} className="p-0.5 rounded hover:bg-red-500/20 transition-colors">
                        <Trash2 size={10} className="text-ed-text-dim" />
                      </button>
                    </div>
                  ))}
                  {layers.length === 0 && <p className="text-[10px] text-ed-text-faint py-2 text-center">텍스트를 추가하세요</p>}
                </div>
              </div>

              {selectedLayer && (() => {
                const textLines = selectedLayer.text.split("\n");
                const layerSegs = selectedLayer.segments || [];

                const getLineSegs = (li: number): TextSegment[] => {
                  if (layerSegs[li] && layerSegs[li].length > 0) return layerSegs[li];
                  return [{ text: textLines[li] || "" }];
                };
                const getLinePlain = (li: number) => getLineSegs(li).map(s => s.text).join("");

                const setLineSegs = (li: number, segs: TextSegment[]) => {
                  const newSegs = [...layerSegs];
                  while (newSegs.length <= li) newSegs.push([]);
                  newSegs[li] = segs;
                  const newText = textLines.map((_, idx) => {
                    if (idx === li) return segs.map(s => s.text).join("");
                    return textLines[idx];
                  }).join("\n");
                  updateLayer(selectedLayer.id, { text: newText, segments: newSegs });
                };

                const updateLineText = (li: number, value: string) => {
                  const lines = [...textLines];
                  lines[li] = value;
                  const newSegs = [...layerSegs];
                  newSegs[li] = [{ text: value }];
                  updateLayer(selectedLayer.id, { text: lines.join("\n"), segments: newSegs });
                };

                const addLine = () => {
                  const newSegs = [...layerSegs, [{ text: "새 줄" }]];
                  updateLayer(selectedLayer.id, { text: selectedLayer.text + "\n새 줄", segments: newSegs });
                };

                const removeLine = (li: number) => {
                  const lines = [...textLines];
                  lines.splice(li, 1);
                  const newSegs = [...layerSegs];
                  newSegs.splice(li, 1);
                  const lc = [...(selectedLayer.lineColors || [])];
                  lc.splice(li, 1);
                  updateLayer(selectedLayer.id, { text: lines.join("\n"), segments: newSegs, lineColors: lc });
                };

                const splitLine = (li: number, cursorPos: number) => {
                  const segs = getLineSegs(li);
                  const beforeSegs: TextSegment[] = [];
                  const afterSegs: TextSegment[] = [];
                  let charCount = 0;
                  for (const seg of segs) {
                    const segLen = seg.text.length;
                    if (charCount + segLen <= cursorPos) {
                      beforeSegs.push({ ...seg });
                    } else if (charCount >= cursorPos) {
                      afterSegs.push({ ...seg });
                    } else {
                      const splitAt = cursorPos - charCount;
                      beforeSegs.push({ ...seg, text: seg.text.slice(0, splitAt) });
                      afterSegs.push({ ...seg, text: seg.text.slice(splitAt) });
                    }
                    charCount += segLen;
                  }
                  if (beforeSegs.length === 0) beforeSegs.push({ text: "" });
                  if (afterSegs.length === 0) afterSegs.push({ text: "" });
                  const lines = [...textLines];
                  const beforeText = beforeSegs.map(s => s.text).join("");
                  const afterText = afterSegs.map(s => s.text).join("");
                  lines.splice(li, 1, beforeText, afterText);
                  const newSegs = [...layerSegs];
                  while (newSegs.length <= li) newSegs.push([]);
                  newSegs.splice(li, 1, beforeSegs, afterSegs);
                  const lc = [...(selectedLayer.lineColors || [])];
                  if (lc.length > li) lc.splice(li + 1, 0, lc[li] || selectedLayer.color);
                  updateLayer(selectedLayer.id, { text: lines.join("\n"), segments: newSegs, lineColors: lc });
                };

                const applyFormatToSelection = (li: number, start: number, end: number, patch: { color?: string; fontSize?: number }) => {
                  if (start === end) return;
                  const segs = getLineSegs(li);
                  const expanded: { char: string; color?: string; fontSize?: number }[] = [];
                  for (const seg of segs) {
                    for (const ch of seg.text) {
                      expanded.push({ char: ch, color: seg.color, fontSize: seg.fontSize });
                    }
                  }
                  for (let c = start; c < end && c < expanded.length; c++) {
                    if (patch.color !== undefined) expanded[c].color = patch.color;
                    if (patch.fontSize !== undefined) expanded[c].fontSize = patch.fontSize;
                  }
                  const merged: TextSegment[] = [];
                  for (const ch of expanded) {
                    const last = merged[merged.length - 1];
                    if (last && last.color === ch.color && last.fontSize === ch.fontSize) {
                      last.text += ch.char;
                    } else {
                      merged.push({ text: ch.char, color: ch.color, fontSize: ch.fontSize });
                    }
                  }
                  setLineSegs(li, merged);
                };

                return (
                <div className="p-4 space-y-3 flex-1">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-ed-text-dim">텍스트 (드래그로 부분 서식)</label>
                      <button onClick={addLine} className="text-[9px] text-accent hover:text-accent/80 transition-colors">+ 줄 추가</button>
                    </div>
                    <div className="space-y-2">
                      {textLines.map((_, li) => {
                        const segs = getLineSegs(li);
                        return (
                          <LineEditor
                            key={li}
                            lineIdx={li}
                            segments={segs}
                            plainText={getLinePlain(li)}
                            baseColor={selectedLayer.lineColors?.[li] || selectedLayer.color}
                            baseFontSize={selectedLayer.fontSize}
                            colorPresets={COLOR_PRESETS}
                            onTextChange={(val) => updateLineText(li, val)}
                            onApplyFormat={(start, end, patch) => applyFormatToSelection(li, start, end, patch)}
                            onRemove={textLines.length > 1 ? () => removeLine(li) : undefined}
                            onSplitLine={(pos) => splitLine(li, pos)}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-ed-text-dim mb-1">기본 색상</label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {COLOR_PRESETS.map((c) => (
                        <button key={c} onClick={() => updateLayer(selectedLayer.id, { color: c })} className={`w-5 h-5 rounded-md border-2 ${selectedLayer.color === c ? "border-accent scale-110" : "border-ed-border"}`} style={{ backgroundColor: c }} />
                      ))}
                      <input type="color" value={selectedLayer.color} onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })} className="w-5 h-5 rounded-md cursor-pointer" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-ed-text-dim mb-1">폰트</label>
                    <select value={selectedLayer.fontFamily} onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })} className="w-full px-3 py-2 text-xs bg-ed-surface border border-ed-border rounded-lg text-ed-text focus:outline-none">
                      {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-ed-text-dim mb-1">크기: {selectedLayer.fontSize}px</label>
                    <input type="range" min={30} max={300} value={selectedLayer.fontSize} onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })} className="w-full accent-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ed-text-dim mb-1">자간: {selectedLayer.letterSpacing}px</label>
                    <input type="range" min={-20} max={60} value={selectedLayer.letterSpacing} onChange={(e) => updateLayer(selectedLayer.id, { letterSpacing: Number(e.target.value) })} className="w-full accent-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ed-text-dim mb-1">행간: {selectedLayer.lineHeight.toFixed(1)}</label>
                    <input type="range" min={0.8} max={3.0} step={0.1} value={selectedLayer.lineHeight} onChange={(e) => updateLayer(selectedLayer.id, { lineHeight: Number(e.target.value) })} className="w-full accent-accent" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-ed-text-dim mb-1">스타일 / 정렬</label>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateLayer(selectedLayer.id, { bold: !selectedLayer.bold })} className={`p-2 rounded-lg ${selectedLayer.bold ? "bg-accent/20 text-accent" : "bg-ed-surface text-ed-text-dim"}`}><Bold size={14} /></button>
                      <button onClick={() => updateLayer(selectedLayer.id, { italic: !selectedLayer.italic })} className={`p-2 rounded-lg ${selectedLayer.italic ? "bg-accent/20 text-accent" : "bg-ed-surface text-ed-text-dim"}`}><Italic size={14} /></button>
                      <div className="w-px h-5 bg-ed-border mx-1" />
                      {(["left", "center", "right"] as const).map((a) => (
                        <button key={a} onClick={() => updateLayer(selectedLayer.id, { align: a })} className={`p-2 rounded-lg ${selectedLayer.align === a ? "bg-accent/20 text-accent" : "bg-ed-surface text-ed-text-dim"}`}>
                          {a === "left" ? <AlignLeft size={14} /> : a === "center" ? <AlignCenter size={14} /> : <AlignRight size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-ed-text-dim mb-1">외곽선</label>
                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                      {["#000000", "#FFFFFF", "#333333", "#FF0000"].map((c) => (
                        <button key={c} onClick={() => updateLayer(selectedLayer.id, { strokeColor: c })} className={`w-5 h-5 rounded-md border-2 ${selectedLayer.strokeColor === c ? "border-accent scale-110" : "border-ed-border"}`} style={{ backgroundColor: c }} />
                      ))}
                      <input type="color" value={selectedLayer.strokeColor} onChange={(e) => updateLayer(selectedLayer.id, { strokeColor: e.target.value })} className="w-5 h-5 rounded-md cursor-pointer" />
                    </div>
                    <input type="range" min={0} max={50} value={selectedLayer.strokeWidth} onChange={(e) => updateLayer(selectedLayer.id, { strokeWidth: Number(e.target.value) })} className="w-full accent-accent" />
                    <span className="text-[10px] text-ed-text-dim">{selectedLayer.strokeWidth}px</span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] text-ed-text-dim">그림자</label>
                      <button
                        onClick={() => updateLayer(selectedLayer.id, { shadow: !selectedLayer.shadow })}
                        className={`relative w-8 h-4 rounded-full transition-colors ${selectedLayer.shadow ? "bg-accent" : "bg-ed-border"}`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${selectedLayer.shadow ? "left-[18px]" : "left-0.5"}`} />
                      </button>
                    </div>
                    {selectedLayer.shadow && (
                      <div className="space-y-2 mt-2">
                        <div>
                          <span className="text-[9px] text-ed-text-faint">색상</span>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {["#000000", "#333333", "#00000080", "#FFFFFF", "#FF0000"].map((c) => (
                              <button key={c} onClick={() => updateLayer(selectedLayer.id, { shadowColor: c })} className={`w-5 h-5 rounded-md border-2 ${selectedLayer.shadowColor === c ? "border-accent scale-110" : "border-ed-border"}`} style={{ backgroundColor: c }} />
                            ))}
                            <input type="color" value={selectedLayer.shadowColor} onChange={(e) => updateLayer(selectedLayer.id, { shadowColor: e.target.value })} className="w-5 h-5 rounded-md cursor-pointer" />
                          </div>
                        </div>
                        <div>
                          <span className="text-[9px] text-ed-text-faint">흐림: {selectedLayer.shadowBlur}px</span>
                          <input type="range" min={0} max={50} value={selectedLayer.shadowBlur} onChange={(e) => updateLayer(selectedLayer.id, { shadowBlur: Number(e.target.value) })} className="w-full accent-accent" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[9px] text-ed-text-faint">X: {selectedLayer.shadowOffsetX}px</span>
                            <input type="range" min={-30} max={30} value={selectedLayer.shadowOffsetX} onChange={(e) => updateLayer(selectedLayer.id, { shadowOffsetX: Number(e.target.value) })} className="w-full accent-accent" />
                          </div>
                          <div>
                            <span className="text-[9px] text-ed-text-faint">Y: {selectedLayer.shadowOffsetY}px</span>
                            <input type="range" min={-30} max={30} value={selectedLayer.shadowOffsetY} onChange={(e) => updateLayer(selectedLayer.id, { shadowOffsetY: Number(e.target.value) })} className="w-full accent-accent" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-ed-text-faint flex items-center gap-1 pt-2 border-t border-ed-border"><Move size={10} /> 드래그하여 위치 이동</p>
                </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {showSaveConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm p-5 animate-modal-content">
            <h3 className="text-base font-bold text-foreground mb-2">썸네일 저장</h3>
            <p className="text-sm text-text-secondary mb-4">저장 후에는 텍스트 수정이 불가능합니다. 저장하시겠습니까?</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowSaveConfirm(false)} className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-foreground rounded-xl hover:bg-surface-hover transition-colors">취소</button>
              <button onClick={confirmSave} className="px-5 py-2 text-sm font-semibold bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors">저장하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── LineEditor: per-line input with selection-based formatting ─── */

interface LineEditorProps {
  lineIdx: number;
  segments: TextSegment[];
  plainText: string;
  baseColor: string;
  baseFontSize: number;
  colorPresets: string[];
  onTextChange: (val: string) => void;
  onApplyFormat: (start: number, end: number, patch: { color?: string; fontSize?: number }) => void;
  onRemove?: () => void;
  onSplitLine?: (cursorPos: number) => void;
}

function LineEditor({ lineIdx, segments, plainText, baseColor, baseFontSize, colorPresets, onTextChange, onApplyFormat, onRemove, onSplitLine }: LineEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sel, setSel] = useState<{ start: number; end: number } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [selFontSize, setSelFontSize] = useState(baseFontSize);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleSelect = () => {
    const el = inputRef.current;
    if (!el) return;
    const s = el.selectionStart ?? 0;
    const e = el.selectionEnd ?? 0;
    if (s !== e) {
      setSel({ start: s, end: e });
      setShowToolbar(true);
      const segChars: { fontSize?: number }[] = [];
      for (const seg of segments) for (const ch of seg.text) segChars.push({ fontSize: seg.fontSize });
      const midIdx = Math.floor((s + e) / 2);
      setSelFontSize(segChars[midIdx]?.fontSize ?? baseFontSize);
    } else {
      setShowToolbar(false);
    }
  };

  const applyColor = (color: string) => {
    if (!sel) return;
    onApplyFormat(sel.start, sel.end, { color });
  };

  const applySize = (delta: number) => {
    if (!sel) return;
    const newSize = Math.max(20, Math.min(400, selFontSize + delta));
    setSelFontSize(newSize);
    onApplyFormat(sel.start, sel.end, { fontSize: newSize });
  };

  const hasFormats = segments.some(s => s.color || s.fontSize);

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-ed-text-faint w-3 text-right shrink-0">{lineIdx + 1}</span>
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={plainText}
            onChange={(e) => onTextChange(e.target.value)}
            onSelect={handleSelect}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSplitLine) {
                e.preventDefault();
                const pos = inputRef.current?.selectionStart ?? plainText.length;
                onSplitLine(pos);
              }
            }}
            onBlur={() => setTimeout(() => setShowToolbar(false), 200)}
            className="w-full px-2.5 py-1.5 text-sm bg-ed-surface border border-ed-border rounded-lg text-ed-text focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
          {hasFormats && (
            <div className="flex gap-px mt-1 px-0.5 h-1.5 rounded overflow-hidden">
              {segments.map((seg, si) => (
                <div key={si} className="h-full rounded-sm" style={{
                  backgroundColor: seg.color || baseColor,
                  flexGrow: seg.text.length,
                  opacity: seg.fontSize && seg.fontSize !== baseFontSize ? 1 : 0.5,
                }} />
              ))}
            </div>
          )}
        </div>
        {onRemove && (
          <button onClick={onRemove} className="p-0.5 rounded hover:bg-red-500/20 transition-colors shrink-0">
            <X size={10} className="text-ed-text-faint" />
          </button>
        )}
      </div>

      {showToolbar && sel && (
        <div ref={toolbarRef} className="absolute left-6 z-20 mt-1 bg-ed-bg-panel border border-ed-border rounded-xl shadow-xl p-2.5 space-y-2 animate-modal-content" style={{ minWidth: 220 }}>
          <div>
            <span className="text-[9px] text-ed-text-dim block mb-1">선택 영역 색상</span>
            <div className="flex items-center gap-1 flex-wrap">
              {colorPresets.map((c) => (
                <button key={c} onMouseDown={(e) => { e.preventDefault(); applyColor(c); }}
                  className="w-5 h-5 rounded-md border border-ed-border hover:scale-110 transition-transform" style={{ backgroundColor: c }} />
              ))}
              <input type="color" onMouseDown={(e) => e.preventDefault()} onChange={(e) => applyColor(e.target.value)} className="w-5 h-5 rounded-md cursor-pointer" />
            </div>
          </div>
          <div>
            <span className="text-[9px] text-ed-text-dim block mb-1">선택 영역 크기: {selFontSize}px</span>
            <div className="flex items-center gap-1.5">
              <button onMouseDown={(e) => { e.preventDefault(); applySize(-10); }} className="p-1.5 bg-ed-surface rounded-lg hover:bg-ed-surface-active transition-colors">
                <AArrowDown size={13} className="text-ed-text-muted" />
              </button>
              <input type="range" min={20} max={400} value={selFontSize}
                onMouseDown={(e) => e.stopPropagation()}
                onChange={(e) => { const v = Number(e.target.value); setSelFontSize(v); if (sel) onApplyFormat(sel.start, sel.end, { fontSize: v }); }}
                className="flex-1 accent-accent" />
              <button onMouseDown={(e) => { e.preventDefault(); applySize(10); }} className="p-1.5 bg-ed-surface rounded-lg hover:bg-ed-surface-active transition-colors">
                <AArrowUp size={13} className="text-ed-text-muted" />
              </button>
              <span className="text-[10px] text-ed-text-muted w-8 text-right">{selFontSize}</span>
            </div>
          </div>
          <p className="text-[9px] text-ed-text-faint">"{plainText.slice(sel.start, sel.end)}" 선택됨</p>
        </div>
      )}
    </div>
  );
}
