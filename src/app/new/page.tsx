"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import ScriptInput from "@/components/ScriptInput";
import {
  Package,
  CheckSquare,
  Square,
  ArrowLeft,
  ArrowRight,
  ListChecks,
  Sparkles,
  Loader2,
  Film,
  User,
  Check,
  ImagePlus,
  Type,
  Upload,
  X,
  MonitorPlay,
  PenLine,
  Search,
} from "lucide-react";
import { type SceneData, type SceneType, type MotionStyleId, MOTION_STYLES, recommendStyle } from "@/remotion/types";
import { refineForDisplay } from "@/remotion/textUtils";
import { saveProject } from "@/lib/projectStore";
import {
  IMAGE_MODELS,
  ART_STYLES,
  DEFAULT_SETTINGS,
  buildStylePrompt,
  getModelInfo,
  isNativeModel,
  type GenerationSettings,
} from "@/lib/generationSettings";
import { loadPreferences, savePreferences } from "@/lib/userPreferences";

type Phase = "input" | "setup" | "analyzing" | "select" | "generating";

interface LineAnalysis {
  shouldMotion: boolean;
  suggestedStyle: string;
  reason: string;
}

interface VoiceInfo {
  voice_id: string;
  name: string;
  language: string;
  preview_url: string;
  gender?: string;
  original_name?: string;
  speaker_name?: string;
  style_name?: string;
}

interface SpeakerGroup {
  name: string;
  originalName: string;
  gender: string;
  styles: { id: string; styleName: string }[];
}

const STYLE_TAGS: Record<string, { icon: string; label: string }> = {};
for (const s of MOTION_STYLES) {
  STYLE_TAGS[s.id] = { icon: s.icon, label: s.label };
}

const DEFAULT_GUIDELINES = `첨부한 스크립트와 구성은 비슷하지만 단어나 문장이나 구성은 좀 다르게 해줘.
도입부는 인사 없이 본론부터 시작하며 처음 도입부에 위기감 강조.
대제목 소제목, 기타 코드 없이 스크립트만 추출.
도입부는 100자~150자이며, 도입부 이후부터는 150~200자 정도로. 한 줄에 200자가 넘으면 안 돼. 전체 줄바꿈 개수를 150개 이하로.
쉬운 단어로만 구성하고, 38~40도 는 "38도에서 40도" 이런 식으로 ~ 대신 "~에서"로.
원본보다 도입부를 훨씬 자극적이게, 내용 핵심은 유지하지만 전체 구성/내용 구조를 바꿔줘. 도입부는 전체 스크립트의 핵심을 파악 후 대중적이고 흥미롭게 시작. "지금 이 순간에도" 같은 고정적 시작 금지. 창의적이게.
짧은 문장과 긴 문장을 자연스럽게 혼용하고, 종결어미는 '~죠', '~거든요', '~겁니다', '~습니다' 등 다양하게 사용. 직설적이고 강조가 많은 톤.
도입부는 3~5줄(최소 300자 이상)로 구성. 도입부 끝나면 자연스럽게 "이야기를 해보겠다" 류의 멘트 하나 넣고 본론 시작.
사실 기반 유지하되 사례/통계/시간축/관점을 변경하고, 구성 순서를 재배치하며 새로운 각도나 세부 주제를 추가하여 원본 대비 50% 수준의 차별화된 콘텐츠 작성.
논리적으로 연결 가능한 문장들은 "~는데", "~했고", "~면서", "~거든요", "~죠", "~거죠" 등의 연결어로 자연스럽게 이어주되, 호흡이 길어지거나 주제 전환 시 과감하게 문장을 끊기. 한 문장에 2~3개 정보를 담되, 강조점/반전/새 주제에서는 짧은 문장으로 리듬 전환.
한 줄이 50자 이하로 끝나는 것 금지. 최소 100자 이상, 200자 이하. 짧은 문장들은 연결어로 묶어서 이어라.
스크립트 흐름은 "첫째, 둘째" 식이 아닌 자연스럽게 읽히도록.
스크립트 외 어떤 것도 출력 금지 (제목, 코드블록, 아티팩트 태그 등 절대 금지).`;

export default function NewProjectPage() {
  const router = useRouter();

  const [projectName, setProjectName] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [inputMode, setInputMode] = useState<"manual" | "youtube">("manual");
  const [ytUrl, setYtUrl] = useState("");
  const [ytLoading, setYtLoading] = useState(false);
  const [ytError, setYtError] = useState("");
  const [ytScript, setYtScript] = useState("");
  const [ytRewrittenScript, setYtRewrittenScript] = useState("");
  const [ytTargetLang, setYtTargetLang] = useState<"ko" | "ja">("ko");
  const [ytGuidelines, setYtGuidelines] = useState("");
  const [ytUseDefaultGuidelines, setYtUseDefaultGuidelines] = useState(false);
  const [ytDuration, setYtDuration] = useState<5 | 10 | 15 | 20>(10);
  const [ytRewriting, setYtRewriting] = useState(false);
  const [ytStep, setYtStep] = useState<"url" | "rewrite" | "done">("url");
  const [parsedLines, setParsedLines] = useState<string[]>([]);
  const [checkedSet, setCheckedSet] = useState<Set<number>>(new Set());
  const [lineAnalyses, setLineAnalyses] = useState<LineAnalysis[]>([]);
  const [userImageDirective, setUserImageDirective] = useState("");
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [customTab, setCustomTab] = useState<"image" | "prompt">("image");
  const [uploading, setUploading] = useState(false);
  const [analyzingStyle, setAnalyzingStyle] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [voices, setVoices] = useState<VoiceInfo[]>([]);
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedJaSpeaker, setSelectedJaSpeaker] = useState<string>("");

  const jaSpeakerGroups: SpeakerGroup[] = useMemo(() => {
    if (settings.language !== "ja" || voices.length === 0) return [];
    const groupMap = new Map<string, SpeakerGroup>();
    for (const v of voices) {
      const key = v.speaker_name || v.name;
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          name: key,
          originalName: v.original_name?.replace(/ \(.*\)$/, "") || key,
          gender: v.gender || "",
          styles: [],
        });
      }
      groupMap.get(key)!.styles.push({ id: v.voice_id, styleName: v.style_name || "일반" });
    }
    const genderOrder: Record<string, number> = { "남": 0, "중성": 1, "여": 2 };
    return Array.from(groupMap.values()).sort(
      (a, b) => (genderOrder[a.gender] ?? 3) - (genderOrder[b.gender] ?? 3),
    );
  }, [voices, settings.language]);

  const analyzeStyleFromImage = useCallback(async (imageUrl: string) => {
    setAnalyzingStyle(true);
    try {
      const res = await fetch("/api/analyze-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.styleDescription) {
          setSettings((p) => ({
            ...p,
            customArtStyle: data.styleDescription,
            styleDescription: data.styleDescription,
          }));
        }
      }
    } catch (e) {
      console.error("Style analysis failed:", e);
    } finally {
      setAnalyzingStyle(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.url) {
        setSettings((p) => ({ ...p, customStyleImage: data.url }));
        analyzeStyleFromImage(data.url);
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  }, [analyzeStyleFromImage]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  useEffect(() => {
    const name = sessionStorage.getItem("sourcebox-new-project-name");
    if (name) {
      setProjectName(name);
      sessionStorage.removeItem("sourcebox-new-project-name");
    }
  }, []);

  useEffect(() => {
    const saved = loadPreferences().generation;
    if (saved) {
      setSettings((prev) => ({
        ...prev,
        ...(saved.language && { language: saved.language as "ko" | "ja" }),
        ...(saved.voiceId && { voiceId: saved.voiceId }),
        ...(saved.imageModel && { imageModel: saved.imageModel }),
        ...(saved.artStyle && { artStyle: saved.artStyle }),
        ...(saved.customArtStyle && { customArtStyle: saved.customArtStyle }),
        ...(saved.customStyleImage && { customStyleImage: saved.customStyleImage }),
        ...(saved.characterRefImage && { characterRefImage: saved.characterRefImage }),
        ...(saved.characterDesc && { characterDesc: saved.characterDesc }),
        ...(saved.styleDescription && { styleDescription: saved.styleDescription }),
      }));
    }
  }, []);

  useEffect(() => {
    setLoadingVoices(true);
    setVoices([]);

    if (settings.language === "ja") {
      fetch("/api/tts-voicevox-speakers")
        .then((r) => r.json())
        .then((d) => {
          if (d.speakers?.length) {
            const mapped: VoiceInfo[] = d.speakers.map((s: { speaker_id: number; name: string; gender?: string; original_name?: string; speaker_name?: string; style_name?: string }) => ({
              voice_id: String(s.speaker_id),
              name: s.name,
              language: "ja",
              preview_url: "",
              gender: s.gender || "",
              original_name: s.original_name || "",
              speaker_name: s.speaker_name || s.name,
              style_name: s.style_name || "일반",
            }));
            setVoices(mapped);
            const DEFAULT_JA_VOICE = "13";
            const currentVoice = mapped.find((v: VoiceInfo) => v.voice_id === settings.voiceId);
            if (currentVoice) {
              setSelectedJaSpeaker(currentVoice.speaker_name || currentVoice.name);
            } else {
              const defaultVoice = mapped.find((v: VoiceInfo) => v.voice_id === DEFAULT_JA_VOICE) || mapped[0];
              setSettings((prev) => ({ ...prev, voiceId: defaultVoice.voice_id }));
              setSelectedJaSpeaker(defaultVoice.speaker_name || defaultVoice.name);
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingVoices(false));
    } else {
      fetch("/api/tts-voices")
        .then((r) => r.json())
        .then((d) => {
          if (d.voices?.length) {
            setVoices(d.voices);
            if (!settings.voiceId || !d.voices.some((v: VoiceInfo) => v.voice_id === settings.voiceId)) {
              setSettings((prev) => ({ ...prev, voiceId: d.voices[0].voice_id }));
            }
          }
        })
        .catch(() => {})
        .finally(() => setLoadingVoices(false));
    }
  }, [settings.language]);

  const playPreview = useCallback(async (voice: VoiceInfo) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (voice.preview_url) {
      const audio = new Audio(voice.preview_url);
      previewAudioRef.current = audio;
      audio.play();
      return;
    }
    if (voice.language === "ja") {
      setPreviewLoading(voice.voice_id);
      try {
        const res = await fetch(`/api/tts-voicevox-preview?id=${voice.voice_id}`);
        const data = await res.json();
        if (data.previewUrl) {
          const audio = new Audio(data.previewUrl);
          previewAudioRef.current = audio;
          audio.play();
          setVoices((prev) =>
            prev.map((v) => v.voice_id === voice.voice_id ? { ...v, preview_url: data.previewUrl } : v),
          );
        }
      } catch { /* ignore */ }
      setPreviewLoading(null);
    }
  }, []);

  const handleYtExtract = useCallback(async () => {
    if (!ytUrl.trim()) return;
    setYtLoading(true);
    setYtError("");
    setYtScript("");
    setYtRewrittenScript("");
    setYtStep("url");
    try {
      const res = await fetch("/api/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "자막 추출 실패");
      setYtScript(data.script);
      setYtStep("rewrite");
    } catch (err: unknown) {
      setYtError((err as Error).message);
    } finally {
      setYtLoading(false);
    }
  }, [ytUrl]);

  const handleYtRewrite = useCallback(async () => {
    if (!ytScript.trim()) return;
    setYtRewriting(true);
    setYtError("");
    try {
      const res = await fetch("/api/rewrite-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalScript: ytScript,
          targetLanguage: ytTargetLang,
          guidelines: [
            ytUseDefaultGuidelines ? DEFAULT_GUIDELINES : "",
            ytGuidelines.trim(),
          ].filter(Boolean).join("\n\n") || undefined,
          durationMinutes: ytDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "리라이팅 실패");
      setYtRewrittenScript(data.script);
      setYtStep("done");
    } catch (err: unknown) {
      setYtError((err as Error).message);
    } finally {
      setYtRewriting(false);
    }
  }, [ytScript, ytTargetLang, ytGuidelines, ytUseDefaultGuidelines, ytDuration]);

  const handleScriptSubmit = useCallback((script: string) => {
    const lines = script
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return;
    setParsedLines(lines);
    setPhase("setup");
  }, []);

  const handleSetupDone = useCallback(async () => {
    savePreferences({
      generation: {
        language: settings.language,
        voiceId: settings.voiceId,
        imageModel: settings.imageModel,
        artStyle: settings.artStyle,
        customArtStyle: settings.customArtStyle,
        customStyleImage: settings.customStyleImage || undefined,
        characterRefImage: settings.characterRefImage || undefined,
        characterDesc: settings.characterDesc || undefined,
        styleDescription: settings.styleDescription || undefined,
      },
    });
    setPhase("analyzing");

    try {
      const res = await fetch("/api/analyze-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: parsedLines }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();
      const analyses: LineAnalysis[] = data.results ?? [];
      setLineAnalyses(analyses);

      const autoChecked = new Set<number>();
      analyses.forEach((a, i) => {
        if (a.shouldMotion) autoChecked.add(i);
      });
      if (autoChecked.size === 0) {
        const top3 = parsedLines
          .map((_, i) => i)
          .filter((i) => parsedLines[i].length > 20)
          .slice(0, Math.max(1, Math.floor(parsedLines.length * 0.2)));
        top3.forEach((i) => autoChecked.add(i));
      }
      setCheckedSet(autoChecked);
    } catch {
      setLineAnalyses([]);
      const few = parsedLines
        .map((_, i) => i)
        .slice(0, Math.max(1, Math.floor(parsedLines.length * 0.2)));
      setCheckedSet(new Set(few));
    }

    setPhase("select");

    if (settings.language === "ja") {
      setShowKoTranslation(true);
    }
  }, [parsedLines, settings.language]);

  const toggleLine = useCallback((index: number) => {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setCheckedSet((prev) => {
      if (prev.size === parsedLines.length) return new Set();
      return new Set(parsedLines.map((_, i) => i));
    });
  }, [parsedLines]);

  const lineRefs = useRef<(HTMLTextAreaElement | null)[]>([]);
  const pendingFocus = useRef<{ index: number; cursor: number } | null>(null);

  useEffect(() => {
    if (pendingFocus.current) {
      const { index, cursor } = pendingFocus.current;
      const el = lineRefs.current[index];
      if (el) {
        el.focus();
        el.setSelectionRange(cursor, cursor);
      }
      pendingFocus.current = null;
    }
  });

  const updateLineText = useCallback((index: number, text: string) => {
    setParsedLines((prev) => prev.map((l, i) => (i === index ? text : l)));
  }, []);

  const splitLine = useCallback((index: number, cursorPos: number) => {
    setParsedLines((prev) => {
      const line = prev[index];
      const before = line.slice(0, cursorPos).trimEnd();
      const after = line.slice(cursorPos).trimStart();
      const next = [...prev];
      next.splice(index, 1, before, after || "");
      return next;
    });
    setLineAnalyses((prev) => {
      const next = [...prev];
      const existing = next[index] || { shouldMotion: false, suggestedStyle: "quote", reason: "" };
      next.splice(index, 1, existing, { shouldMotion: false, suggestedStyle: "quote", reason: "" });
      return next;
    });
    setCheckedSet((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < index) next.add(idx);
        else if (idx === index) next.add(idx);
        else next.add(idx + 1);
      }
      return next;
    });
    pendingFocus.current = { index: index + 1, cursor: 0 };
  }, []);

  const mergeWithPrev = useCallback((index: number) => {
    if (index <= 0) return;
    const prevLen = parsedLines[index - 1].length;
    setParsedLines((prev) => {
      const next = [...prev];
      next[index - 1] = next[index - 1] + " " + next[index];
      next.splice(index, 1);
      return next;
    });
    setLineAnalyses((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
    setCheckedSet((prev) => {
      const next = new Set<number>();
      for (const idx of prev) {
        if (idx < index) next.add(idx);
        else if (idx === index) { /* removed line — drop */ }
        else next.add(idx - 1);
      }
      return next;
    });
    pendingFocus.current = { index: index - 1, cursor: prevLen + 1 };
  }, [parsedLines]);

  const [genProgress, setGenProgress] = useState({ step: "", done: 0, total: 0 });
  const [showKoTranslation, setShowKoTranslation] = useState(false);
  const [koTranslations, setKoTranslations] = useState<Record<number, string>>({});
  const [translating, setTranslating] = useState(false);

  const fetchTranslations = useCallback(async () => {
    const untranslated = parsedLines.map((text, i) => ({ i, text })).filter(({ i }) => !koTranslations[i]);
    if (untranslated.length === 0) return;
    setTranslating(true);
    try {
      const BATCH = 50;
      for (let b = 0; b < untranslated.length; b += BATCH) {
        const batch = untranslated.slice(b, b + BATCH);
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ texts: batch.map(u => u.text), from: "ja", to: "ko" }),
        });
        const data = await res.json();
        if (data.translations) {
          setKoTranslations(prev => {
            const next = { ...prev };
            batch.forEach((u, idx) => { if (data.translations[idx]) next[u.i] = data.translations[idx]; });
            return next;
          });
        }
      }
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setTranslating(false);
    }
  }, [parsedLines, koTranslations]);

  useEffect(() => {
    if (showKoTranslation && parsedLines.length > 0 && Object.keys(koTranslations).length === 0) {
      fetchTranslations();
    }
  }, [showKoTranslation, parsedLines, koTranslations, fetchTranslations]);

  const handleGenerate = useCallback(async () => {
    if (parsedLines.length === 0) return;
    setPhase("generating");

    let currentSettings = { ...settings };
    const refImg = currentSettings.customStyleImage || currentSettings.characterRefImage;
    if (refImg && !currentSettings.styleDescription && isNativeModel(currentSettings.imageModel)) {
      try {
        const analyzeRes = await fetch("/api/analyze-style", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: refImg }),
        });
        if (analyzeRes.ok) {
          const analyzeData = await analyzeRes.json();
          if (analyzeData.styleDescription) {
            currentSettings = { ...currentSettings, styleDescription: analyzeData.styleDescription, customArtStyle: analyzeData.styleDescription };
            setSettings(currentSettings);
          }
        }
      } catch { /* proceed without */ }
    }

    const stylePrompt = buildStylePrompt(currentSettings);
    const modelInfo = getModelInfo(currentSettings.imageModel);

    const sceneBases: SceneData[] = parsedLines.map((line, i) => {
      const isMotion = checkedSet.has(i);
      const analysis = lineAnalyses[i];
      return {
        line,
        keywords: [],
        backgroundImage: "",
        mainImage: "",
        mainImageSource: "AI Generated",
        type: "google" as SceneData["type"],
        sceneType: (isMotion ? "motion" : "image") as SceneType,
        motionStyle: isMotion
          ? ((analysis?.suggestedStyle ?? "quote") as MotionStyleId)
          : "quote" as MotionStyleId,
        narration: line,
        zoom: (Math.random() > 0.5 ? "in" : "out") as "in" | "out",
        language: settings.language,
      };
    });

    const motionIndices = sceneBases.map((s, i) => (s.sceneType === "motion" ? i : -1)).filter((i) => i >= 0);

    const SCENE_CHUNK = 20;
    setGenProgress({ step: "씬 분석 중...", done: 0, total: Math.ceil(sceneBases.length / SCENE_CHUNK) });

    let scenes: SceneData[] = [...sceneBases];
    let imagePrompts: string[] = sceneBases.map(() => "");

    try {
      const sceneInputs = sceneBases.map((s) => ({
        line: s.line,
        keywords: s.keywords,
        suggestedStyle: s.motionStyle,
        sceneType: s.sceneType,
      }));

      const chunkCount = Math.ceil(sceneInputs.length / SCENE_CHUNK);
      const allAiResults: (Record<string, unknown> | null)[] = new Array(sceneInputs.length).fill(null);

      for (let ci = 0; ci < chunkCount; ci++) {
        const start = ci * SCENE_CHUNK;
        const chunk = sceneInputs.slice(start, start + SCENE_CHUNK);
        try {
          const res = await fetch("/api/analyze-scenes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              scenes: chunk,
              language: settings.language,
              userImageDirective: userImageDirective.trim() || undefined,
              stylePrompt: settings.customArtStyle || settings.artStyle || undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const results = data.results ?? [];
            results.forEach((r: Record<string, unknown>, ri: number) => {
              allAiResults[start + ri] = r;
            });
          }
        } catch {
          /* chunk failed, continue */
        }
        setGenProgress((prev) => ({ ...prev, done: ci + 1 }));
      }

      sceneBases.forEach((_base, i) => {
        const ai = allAiResults[i] as Record<string, unknown> | null;
        if (!ai) return;
        if (ai.imagePrompt) imagePrompts[i] = ai.imagePrompt as string;

        if (scenes[i].sceneType === "motion") {
          const userSelected = sceneBases[i].motionStyle;
          scenes[i] = {
            ...scenes[i],
            motionStyle: userSelected,
            displayText: (ai.displayText as string) || undefined,
            sourceLabel: (ai.sourceLabel as string) || undefined,
            infographicData: (ai.infographicData as any) || undefined,
            keywords: (ai.highlightKeywords as string[])?.length ? (ai.highlightKeywords as string[]) : [],
          };
        }
      });
    } catch {
      motionIndices.forEach((sceneIdx) => {
        const style = recommendStyle(scenes[sceneIdx]);
        const { displayText, subText } = refineForDisplay(scenes[sceneIdx].line, [], style);
        scenes[sceneIdx] = { ...scenes[sceneIdx], motionStyle: style, displayText, subText };
      });
    }

    const needsImage = scenes.map((s) => {
      if (s.sceneType === "image") return true;
      return s.motionStyle === "quote" || s.motionStyle === "bottomCaption";
    });

    const imgTotal = needsImage.filter(Boolean).length;
    setGenProgress({ step: "레퍼런스 업로드 중...", done: 0, total: imgTotal });

    let cachedRefUrls: string[] | undefined;
    const refImagesToUpload: string[] = [];
    if (currentSettings.customStyleImage) refImagesToUpload.push(currentSettings.customStyleImage);
    if (currentSettings.characterRefImage) refImagesToUpload.push(currentSettings.characterRefImage);

    if (refImagesToUpload.length > 0) {
      try {
        const uploadRes = await fetch("/api/upload-ref", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: refImagesToUpload }),
        });
        const uploadData = await uploadRes.json();
        if (uploadData.urls?.length > 0) {
          cachedRefUrls = uploadData.urls;
        }
      } catch {
        console.error("Reference image pre-upload failed");
      }
    }

    const ttsTotal = scenes.length;
    setGenProgress({ step: "이미지 + 나레이션 동시 생성 중...", done: 0, total: imgTotal + ttsTotal });

    const imageTasks = scenes.map((scene, i) => {
      if (!needsImage[i]) return Promise.resolve("");
      const basePrompt =
        imagePrompts[i] ||
        "A high quality wide shot of a clean, well-lit scene with natural environment details and calm atmosphere. High quality, soft lighting, no text, no watermark, no typography, no letters";
      return (async () => {
        try {
          const res = await fetch("/api/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: basePrompt,
              model: currentSettings.imageModel,
              stylePrompt,
              ...(cachedRefUrls
                ? { cachedRefUrls }
                : {
                    styleImage: currentSettings.customStyleImage || undefined,
                    characterRefImage: currentSettings.characterRefImage || undefined,
                  }),
              characterDesc: currentSettings.characterDesc || undefined,
              styleDescription: currentSettings.styleDescription || undefined,
            }),
          });
          if (!res.ok) return "";
          const data = await res.json();
          return data.imageUrl ?? "";
        } catch {
          return "";
        }
      })();
    });

    const ttsEndpoint = settings.language === "ja" ? "/api/tts-voicevox" : "/api/tts";
    const ttsTasks = scenes.map((scene) =>
      (async () => {
        try {
          const body = settings.language === "ja"
            ? { text: scene.line, speakerId: settings.voiceId ? Number(settings.voiceId) : undefined }
            : { text: scene.line, voiceId: settings.voiceId || undefined };
          const res = await fetch(ttsEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          if (!res.ok) return { audioUrl: "", duration: 0 };
          return await res.json();
        } catch {
          return { audioUrl: "", duration: 0 };
        }
      })(),
    );

    const [imgSettled, ttsSettled] = await Promise.all([
      Promise.allSettled(
        imageTasks.map(async (task, i) => {
          const url = await task;
          if (needsImage[i]) {
            setGenProgress((prev) => ({ ...prev, done: prev.done + 1 }));
          }
          return url;
        }),
      ),
      Promise.allSettled(
        ttsTasks.map(async (task) => {
          const result = await task;
          setGenProgress((prev) => ({ ...prev, done: prev.done + 1 }));
          return result;
        }),
      ),
    ]);

    const imageUrls = imgSettled.map((r) => (r.status === "fulfilled" ? r.value : ""));

    let finalScenes = scenes.map((s, i) => {
      const tts = ttsSettled[i].status === "fulfilled" ? ttsSettled[i].value : null;
      return {
        ...s,
        backgroundImage: imageUrls[i] || s.backgroundImage,
        mainImage: imageUrls[i] || s.mainImage,
        audioUrl: tts?.audioUrl || undefined,
        audioDuration: tts?.duration || undefined,
      };
    });

    if (currentSettings.enableVideoClip) {
      const videoTargets = finalScenes.map((s) => s.sceneType === "image" && !!s.mainImage);
      const videoTotal = videoTargets.filter(Boolean).length;
      if (videoTotal > 0) {
        setGenProgress({ step: "AI 영상화 중...", done: 0, total: videoTotal });

        const videoTasks = finalScenes.map((scene, i) => {
          if (!videoTargets[i]) return Promise.resolve("");
          return (async () => {
            try {
              const imgSrc = scene.mainImage.startsWith("http")
                ? scene.mainImage
                : `${window.location.origin}${scene.mainImage}`;
              const res = await fetch("/api/generate-video-clip", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageUrl: imgSrc,
                  prompt: scene.imagePrompt || "cinematic camera movement, smooth animation",
                  durationSeconds: scene.audioDuration || 6,
                }),
              });
              if (!res.ok) return "";
              const data = await res.json();
              return data.videoUrl ?? "";
            } catch {
              return "";
            }
          })();
        });

        const videoSettled = await Promise.allSettled(
          videoTasks.map(async (task, i) => {
            const url = await task;
            if (videoTargets[i]) {
              setGenProgress((prev) => ({ ...prev, done: prev.done + 1 }));
            }
            return url;
          }),
        );

        finalScenes = finalScenes.map((s, i) => {
          const videoUrl = videoSettled[i].status === "fulfilled" ? videoSettled[i].value : "";
          return videoUrl ? { ...s, videoClipUrl: videoUrl } : s;
        });
      }
    }

    sessionStorage.setItem("sourcebox-scenes", JSON.stringify(finalScenes));

    const title = projectName.trim() || finalScenes[0]?.line?.slice(0, 40) || "무제 프로젝트";
    const script = parsedLines.join("\n");
    const projectStyle = {
      imageModel: currentSettings.imageModel,
      stylePrompt,
      styleImage: currentSettings.customStyleImage || undefined,
      characterRefImage: currentSettings.characterRefImage || undefined,
      characterDesc: currentSettings.characterDesc || undefined,
      styleDescription: currentSettings.styleDescription || undefined,
      cachedRefUrls: cachedRefUrls || undefined,
    };
    const existingId = sessionStorage.getItem("sourcebox-project-id") || undefined;
    const proj = await saveProject({ id: existingId, title, script, scenes: finalScenes, saved: false, style: projectStyle });
    sessionStorage.setItem("sourcebox-project-id", proj.id);

    router.push("/editor");
  }, [parsedLines, checkedSet, lineAnalyses, settings, router, projectName, userImageDirective]);

  const checkedCount = checkedSet.size;
  const selectedModel = getModelInfo(settings.imageModel);

  return (
    <div className="flex h-full">
      <Sidebar />

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="flex flex-col items-center min-h-full">

          {/* ───── Phase 1: 대본 입력 ───── */}
          {phase === "input" && (
            <div className="flex flex-col items-center justify-center flex-1 w-full px-4 md:px-6 lg:px-16 xl:px-24 py-8 md:py-16 bg-hero-gradient">
              <div className="hero-glow hero-glow--1" />
              <div className="hero-glow hero-glow--2" />
              <div className="hero-glow hero-glow--3" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Package size={24} className="text-accent" />
                </div>
              </div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight mb-2 md:mb-3">
                새 프로젝트
              </h1>
              <p className="text-text-secondary text-sm md:text-lg mb-5 md:mb-8 text-center px-2">
                대본을 넣으면 AI가 모션 + 이미지 + TTS를 자동으로 만들어드립니다
              </p>

              {/* Mode tabs */}
              <div className="flex items-center gap-1 p-1 bg-surface border border-border rounded-xl mb-5 md:mb-8">
                <button
                  onClick={() => setInputMode("manual")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === "manual"
                      ? "bg-surface shadow-sm text-foreground"
                      : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  <PenLine size={16} />
                  직접 입력
                </button>
                <button
                  onClick={() => setInputMode("youtube")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === "youtube"
                      ? "bg-surface shadow-sm text-foreground"
                      : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  <MonitorPlay size={16} />
                  YouTube 자막
                </button>
              </div>

              {inputMode === "manual" ? (
                <div className="w-full flex justify-center">
                  <ScriptInput onSubmit={handleScriptSubmit} isLoading={false} />
                </div>
              ) : (
                <div className="w-full max-w-3xl lg:max-w-4xl">
                  <div className="bg-surface rounded-2xl border border-border shadow-sm p-4 md:p-6">

                    {/* Step indicator */}
                    <div className="flex items-center gap-1.5 md:gap-2 mb-4 md:mb-6 overflow-x-auto scrollbar-hide">
                      {[
                        { key: "url", label: "자막 추출" },
                        { key: "rewrite", label: "번역 & 리라이팅" },
                        { key: "done", label: "최종 대본" },
                      ].map((s, i) => (
                        <div key={s.key} className="flex items-center gap-2">
                          {i > 0 && <div className={`w-8 h-px ${["rewrite","done"].indexOf(ytStep) >= i ? "bg-accent" : "bg-border"}`} />}
                          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            ytStep === s.key ? "bg-accent/10 text-accent" : ["rewrite","done"].indexOf(ytStep) > ["url","rewrite","done"].indexOf(s.key) ? "bg-green-50 text-green-600" : "bg-surface text-text-secondary"
                          }`}>
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              ytStep === s.key ? "bg-accent text-white" : ["rewrite","done"].indexOf(ytStep) > ["url","rewrite","done"].indexOf(s.key) ? "bg-green-500 text-white" : "bg-border text-text-secondary"
                            }`}>{i + 1}</span>
                            {s.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {ytError && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                        {ytError}
                      </div>
                    )}

                    {/* Step 1: YouTube URL */}
                    {ytStep === "url" && (
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">YouTube 링크</label>
                        <div className="flex gap-2">
                          <div className="flex-1 relative">
                            <MonitorPlay size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-accent" />
                            <input
                              type="text"
                              value={ytUrl}
                              onChange={(e) => setYtUrl(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && handleYtExtract()}
                              placeholder="https://www.youtube.com/watch?v=..."
                              className="w-full pl-10 pr-4 py-3 text-sm bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent text-foreground placeholder:text-text-secondary/50"
                            />
                          </div>
                          <button
                            onClick={handleYtExtract}
                            disabled={ytLoading || !ytUrl.trim()}
                            className="flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-40 shrink-0"
                          >
                            {ytLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                            자막 추출
                          </button>
                        </div>
                        <p className="text-xs text-text-secondary mt-2">YouTube 영상의 자막을 추출합니다</p>
                      </div>
                    )}

                    {/* Step 2: Rewrite settings + original script preview */}
                    {ytStep === "rewrite" && (
                      <div className="space-y-5">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-foreground">추출된 원본 자막</label>
                            <button
                              onClick={() => { setYtStep("url"); setYtScript(""); }}
                              className="text-xs text-text-secondary hover:text-foreground transition-colors"
                            >
                              다시 추출
                            </button>
                          </div>
                          <textarea
                            value={ytScript}
                            onChange={(e) => setYtScript(e.target.value)}
                            rows={6}
                            className="w-full px-4 py-3 text-sm leading-relaxed bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground resize-y"
                          />
                        </div>

                        <div className="border-t border-border pt-5">
                          <h3 className="text-sm font-semibold text-foreground mb-4">번역 & 리라이팅 설정</h3>

                          <div className="mb-4">
                            <label className="block text-xs font-medium text-text-secondary mb-2">대본 언어</label>
                            <div className="flex gap-2">
                              {([["ko", "한국어"], ["ja", "일본어"]] as const).map(([val, label]) => (
                                <button
                                  key={val}
                                  onClick={() => setYtTargetLang(val)}
                                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                    ytTargetLang === val
                                      ? "bg-accent text-white border-accent"
                                      : "bg-background border-border text-text-secondary hover:border-accent/40"
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="mb-4">
                            <label className="block text-xs font-medium text-text-secondary mb-2">대본 길이</label>
                            <div className="flex gap-2">
                              {([5, 10, 15, 20] as const).map((min) => (
                                <button
                                  key={min}
                                  onClick={() => setYtDuration(min)}
                                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                                    ytDuration === min
                                      ? "bg-accent text-white border-accent"
                                      : "bg-background border-border text-text-secondary hover:border-accent/40"
                                  }`}
                                >
                                  {min}분
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-text-secondary mt-1.5">
                              나레이션 기준 영상 길이에 맞는 분량으로 생성됩니다
                            </p>
                          </div>

                          <div className="mb-5">
                            <label className="block text-xs font-medium text-text-secondary mb-2">대본 지침</label>

                            <button
                              onClick={() => setYtUseDefaultGuidelines((v) => !v)}
                              className={`flex items-center gap-2 w-full px-4 py-3 rounded-xl border-2 mb-3 transition-all text-left ${
                                ytUseDefaultGuidelines
                                  ? "bg-accent/10 border-accent"
                                  : "bg-background border-border hover:border-accent/40"
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                                ytUseDefaultGuidelines ? "bg-accent border-accent" : "border-text-secondary/30"
                              }`}>
                                {ytUseDefaultGuidelines && <Check size={10} className="text-white" strokeWidth={3} />}
                              </div>
                              <div>
                                <span className={`text-sm font-medium ${ytUseDefaultGuidelines ? "text-accent" : "text-foreground"}`}>기본 지침 사용</span>
                                <p className="text-[10px] text-text-secondary mt-0.5">자극적 도입부, 유사도 50% 이하, 자연스러운 구어체 등 미리 설정된 지침</p>
                              </div>
                            </button>

                            <textarea
                              value={ytGuidelines}
                              onChange={(e) => setYtGuidelines(e.target.value)}
                              rows={3}
                              placeholder="추가 지침이 있다면 입력하세요 (선택)"
                              className="w-full px-4 py-3 text-sm leading-relaxed bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground resize-y placeholder:text-text-secondary/40"
                            />
                            <p className="text-xs text-text-secondary mt-1.5">
                              {ytUseDefaultGuidelines ? "기본 지침에 추가로 원하는 내용을 입력할 수 있습니다" : "원하는 말투, 톤, 스타일을 지정하면 AI가 반영합니다"}
                            </p>
                          </div>

                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5">
                            <p className="text-xs text-amber-700">
                              AI가 원본 자막을 참고하여 <strong>유사도 50% 이하</strong>의 완전히 새로운 대본을 작성합니다. 단순 번역이 아닌 창작 수준의 리라이팅입니다.
                            </p>
                          </div>

                          <button
                            onClick={handleYtRewrite}
                            disabled={ytRewriting || !ytScript.trim()}
                            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-40"
                          >
                            {ytRewriting ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                AI 리라이팅 중...
                              </>
                            ) : (
                              <>
                                <Sparkles size={16} />
                                AI 리라이팅 시작
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Final rewritten script */}
                    {ytStep === "done" && ytRewrittenScript && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">리라이팅된 대본</label>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setYtStep("rewrite")}
                              className="text-xs text-text-secondary hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-surface"
                            >
                              다시 리라이팅
                            </button>
                          </div>
                        </div>
                        <textarea
                          value={ytRewrittenScript}
                          onChange={(e) => setYtRewrittenScript(e.target.value)}
                          rows={12}
                          className="w-full px-4 py-3 text-sm leading-relaxed bg-background border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 text-foreground resize-y"
                        />
                        <p className="text-xs text-text-secondary">
                          대본을 수정한 뒤 아래 버튼으로 진행하세요
                        </p>
                        <button
                          onClick={() => handleScriptSubmit(ytRewrittenScript)}
                          disabled={!ytRewrittenScript.trim()}
                          className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-40"
                        >
                          <ArrowRight size={16} />
                          이 대본으로 진행
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───── Phase 2: 스타일 설정 ───── */}
          {phase === "setup" && (
            <div className="w-full max-w-[960px] px-4 md:px-6 py-6 md:py-8">
              <button
                onClick={() => setPhase("input")}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-4 md:mb-6"
              >
                <ArrowLeft size={16} />
                대본 다시 입력
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-1">
                  스타일 설정
                </h2>
                <p className="text-sm text-text-secondary">
                  {parsedLines.length}줄 대본 · 그림체와 목소리를 선택하세요
                </p>
              </div>

              <div className="space-y-10">
                {/* ── 그림체 (화풍) ── */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3">그림체</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
                    {ART_STYLES.map((style) => {
                      const selected = settings.artStyle === style.id;
                      return (
                        <button
                          key={style.id}
                          onClick={() => setSettings((p) => ({ ...p, artStyle: style.id }))}
                          className={`group relative flex flex-col items-center rounded-2xl border-2 p-1 transition-all ${
                            selected
                              ? "border-accent shadow-md scale-[1.03]"
                              : "border-transparent hover:border-border"
                          }`}
                        >
                          <div
                            className="w-full aspect-square rounded-xl flex items-center justify-center text-3xl"
                            style={{ background: `${style.color}22` }}
                          >
                            <span
                              className="text-4xl drop-shadow-sm transition-transform group-hover:scale-110"
                            >
                              {style.emoji}
                            </span>
                          </div>
                          <span className={`text-xs font-medium mt-1.5 mb-1 ${selected ? "text-accent" : "text-foreground"}`}>
                            {style.label}
                          </span>
                          {selected && (
                            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                              <Check size={12} className="text-white" strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {settings.artStyle === "custom" && (
                    <div className="mt-4 bg-surface border border-border rounded-2xl overflow-hidden">
                      <div className="flex border-b border-border">
                        <button
                          onClick={() => setCustomTab("image")}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            customTab === "image"
                              ? "text-accent border-b-2 border-accent bg-accent/5"
                              : "text-text-secondary hover:text-foreground"
                          }`}
                        >
                          <ImagePlus size={15} />
                          이미지로 지정
                        </button>
                        <button
                          onClick={() => setCustomTab("prompt")}
                          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                            customTab === "prompt"
                              ? "text-accent border-b-2 border-accent bg-accent/5"
                              : "text-text-secondary hover:text-foreground"
                          }`}
                        >
                          <Type size={15} />
                          프롬프트 입력
                        </button>
                      </div>
                      <div className="p-4">
                        {customTab === "image" ? (
                          <div className="space-y-3">
                            {settings.customStyleImage ? (
                              <div className="relative group">
                                <div className="flex items-start gap-4">
                                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-border shrink-0">
                                    <img
                                      src={settings.customStyleImage}
                                      alt="Style reference"
                                      className="w-full h-full object-cover"
                                    />
                                    <button
                                      onClick={() => setSettings((p) => ({ ...p, customStyleImage: "" }))}
                                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center transition-colors"
                                    >
                                      <X size={12} className="text-white" />
                                    </button>
                                  </div>
                                  <div className="flex-1 pt-1">
                                    <p className="text-sm font-medium text-foreground mb-1">레퍼런스 이미지 등록됨</p>
                                    {analyzingStyle ? (
                                      <p className="text-xs text-accent flex items-center gap-1.5">
                                        <Loader2 size={12} className="animate-spin" />
                                        AI가 화풍을 분석 중...
                                      </p>
                                    ) : settings.customArtStyle ? (
                                      <div>
                                        <p className="text-[11px] text-green-600 font-medium mb-1">화풍 분석 완료</p>
                                        <p className="text-[11px] text-text-secondary leading-relaxed line-clamp-3">
                                          {settings.customArtStyle}
                                        </p>
                                        <button
                                          onClick={() => analyzeStyleFromImage(settings.customStyleImage)}
                                          className="mt-1.5 text-[10px] text-accent hover:underline"
                                        >
                                          다시 분석
                                        </button>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-text-secondary">이 이미지의 화풍이 생성에 반영됩니다</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div
                                onDrop={handleDrop}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                className={`relative flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                                  dragOver
                                    ? "border-accent bg-accent/5 scale-[1.01]"
                                    : "border-border hover:border-accent/40 hover:bg-surface-hover"
                                }`}
                                onClick={() => document.getElementById("style-image-input")?.click()}
                              >
                                {uploading ? (
                                  <Loader2 size={28} className="text-accent animate-spin mb-2" />
                                ) : (
                                  <Upload size={28} className={`mb-2 ${dragOver ? "text-accent" : "text-text-secondary"}`} />
                                )}
                                <p className="text-sm font-medium text-foreground">
                                  {uploading ? "업로드 중..." : "이미지를 드래그하거나 클릭"}
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                  원하는 화풍의 참고 이미지를 등록하세요
                                </p>
                                <input
                                  id="style-image-input"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleFileInput}
                                  className="hidden"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-xs text-text-secondary">
                              원하는 화풍을 자유롭게 설명하세요
                            </p>
                            <textarea
                              value={settings.customArtStyle}
                              onChange={(e) => setSettings((p) => ({ ...p, customArtStyle: e.target.value }))}
                              rows={3}
                              placeholder="예: ghibli style watercolor, soft pastel colors, warm lighting"
                              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:border-accent/50 placeholder:text-text-secondary/40"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* ── 이미지 모델 ── */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3">이미지 모델</h3>
                  <div className="flex flex-wrap gap-2">
                    {IMAGE_MODELS.map((model) => {
                      const selected = settings.imageModel === model.id;
                      return (
                        <button
                          key={model.id}
                          onClick={() => setSettings((p) => ({ ...p, imageModel: model.id }))}
                          className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                            selected
                              ? "bg-accent text-white border-accent shadow-sm"
                              : "bg-surface border-border text-foreground hover:bg-surface-hover"
                          }`}
                        >
                          {model.label}
                          <span className={`ml-1.5 text-xs ${selected ? "text-white/70" : "text-text-secondary"}`}>
                            {model.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* ── 캐릭터 (접이식) ── */}
                <section className="bg-surface border border-border rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <User size={16} className="text-purple-500" />
                    <h3 className="text-sm font-semibold text-foreground">캐릭터 설정</h3>
                    <span className="text-[10px] text-text-secondary bg-surface-hover px-2 py-0.5 rounded-full">선택사항</span>
                  </div>
                  <p className="text-xs text-text-secondary mb-4">
                    모든 이미지에 동일한 캐릭터를 등장시키려면 설명과 레퍼런스 이미지를 등록하세요
                  </p>
                  <div className="space-y-3">
                    <textarea
                      value={settings.characterDesc}
                      onChange={(e) => setSettings((p) => ({ ...p, characterDesc: e.target.value }))}
                      rows={2}
                      placeholder="예: a young korean woman with short black hair, wearing a blue blazer"
                      className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground resize-none focus:outline-none focus:border-purple-400/50 placeholder:text-text-secondary/40"
                    />
                    <label className="block text-xs text-text-secondary mb-1">레퍼런스 이미지</label>
                    {settings.characterRefImage ? (
                      <div className="flex items-start gap-3">
                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-border shrink-0">
                          <img src={settings.characterRefImage} alt="Character ref" className="w-full h-full object-cover" />
                          <button
                            onClick={() => setSettings((p) => ({ ...p, characterRefImage: "" }))}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center"
                          >
                            <X size={10} className="text-white" />
                          </button>
                        </div>
                        <p className="text-xs text-text-secondary pt-1">캐릭터 이미지 등록됨</p>
                      </div>
                    ) : (
                      <div
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file && file.type.startsWith("image/")) {
                            const fd = new FormData();
                            fd.append("file", file);
                            fetch("/api/upload", { method: "POST", body: fd })
                              .then((r) => r.json())
                              .then((d) => { if (d.url) { setSettings((p) => ({ ...p, characterRefImage: d.url })); analyzeStyleFromImage(d.url); } });
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => document.getElementById("char-ref-input")?.click()}
                        className="flex items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed border-border hover:border-purple-300 hover:bg-purple-50/30 transition-all cursor-pointer"
                      >
                        <Upload size={16} className="text-text-secondary" />
                        <span className="text-xs text-text-secondary">이미지 드래그 또는 클릭</span>
                        <input
                          id="char-ref-input"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const fd = new FormData();
                              fd.append("file", file);
                              fetch("/api/upload", { method: "POST", body: fd })
                                .then((r) => r.json())
                                .then((d) => { if (d.url) { setSettings((p) => ({ ...p, characterRefImage: d.url })); analyzeStyleFromImage(d.url); } });
                            }
                          }}
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>
                </section>

                {/* ── 언어 ── */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3">언어</h3>
                  <div className="flex gap-3">
                    {([
                      { id: "ko" as const, label: "한국어", flag: "🇰🇷", desc: "ElevenLabs TTS" },
                      { id: "ja" as const, label: "日本語", flag: "🇯🇵", desc: "VOICEVOX TTS" },
                    ]).map((lang) => {
                      const selected = settings.language === lang.id;
                      return (
                        <button
                          key={lang.id}
                          onClick={() => setSettings((p) => ({ ...p, language: lang.id, voiceId: "" }))}
                          className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 text-sm transition-all ${
                            selected
                              ? "bg-accent/10 border-accent text-foreground shadow-sm"
                              : "bg-surface border-border text-text-secondary hover:border-border hover:bg-surface-hover"
                          }`}
                        >
                          <span className="text-2xl">{lang.flag}</span>
                          <div className="text-left">
                            <p className={`font-semibold ${selected ? "text-accent" : ""}`}>{lang.label}</p>
                            <p className="text-[10px] text-text-secondary">{lang.desc}</p>
                          </div>
                          {selected && <Check size={16} className="text-accent ml-2" />}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* ── 목소리 ── */}
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-foreground">목소리</h3>
                    {loadingVoices && <Loader2 size={14} className="text-text-secondary animate-spin" />}
                  </div>

                  {settings.language === "ja" && jaSpeakerGroups.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex gap-2 items-end">
                        {/* 캐릭터 드롭다운 */}
                        <div className="flex-1">
                          <label className="text-[10px] text-text-secondary mb-1 block">캐릭터</label>
                          <select
                            value={selectedJaSpeaker}
                            onChange={(e) => {
                              const spk = e.target.value;
                              setSelectedJaSpeaker(spk);
                              const group = jaSpeakerGroups.find((g) => g.name === spk);
                              if (group?.styles.length) {
                                setSettings((p) => ({ ...p, voiceId: group.styles[0].id }));
                              }
                            }}
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent"
                          >
                            {jaSpeakerGroups.map((g) => (
                              <option key={g.name} value={g.name}>
                                [{g.gender || "?"}] {g.name} ({g.originalName})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 감정/스타일 드롭다운 */}
                        <div className="flex-1">
                          <label className="text-[10px] text-text-secondary mb-1 block">감정</label>
                          <select
                            value={settings.voiceId}
                            onChange={(e) => setSettings((p) => ({ ...p, voiceId: e.target.value }))}
                            className="w-full bg-surface border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-accent"
                          >
                            {(jaSpeakerGroups.find((g) => g.name === selectedJaSpeaker)?.styles || []).map((st) => (
                              <option key={st.id} value={st.id}>
                                {st.styleName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 미리듣기 */}
                        <button
                          onClick={() => {
                            const v = voices.find((x) => x.voice_id === settings.voiceId);
                            if (v) playPreview(v);
                          }}
                          disabled={previewLoading !== null}
                          className="shrink-0 px-3 py-2.5 rounded-xl border border-border bg-surface text-sm text-foreground hover:bg-surface-hover hover:border-accent transition-all disabled:opacity-50"
                        >
                          {previewLoading ? "⏳" : "▶ 미리듣기"}
                        </button>
                      </div>

                      {/* 선택된 캐릭터 정보 */}
                      {(() => {
                        const g = jaSpeakerGroups.find((x) => x.name === selectedJaSpeaker);
                        if (!g) return null;
                        return (
                          <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                            <span className={`px-1.5 py-0.5 rounded-full font-bold ${
                              g.gender === "남" ? "bg-blue-100 text-blue-500" :
                              g.gender === "여" ? "bg-pink-100 text-pink-500" :
                              "bg-purple-100 text-purple-500"
                            }`}>{g.gender}</span>
                            <span>{g.originalName}</span>
                            <span className="text-text-secondary/40">|</span>
                            <span>{g.styles.length}가지 감정</span>
                          </div>
                        );
                      })()}
                    </div>
                  ) : voices.length > 0 ? (
                    <div className="flex flex-wrap gap-2 max-h-[240px] overflow-y-auto pr-1">
                      {voices.map((voice) => {
                        const selected = settings.voiceId === voice.voice_id;
                        return (
                          <button
                            key={voice.voice_id}
                            onClick={() => setSettings((p) => ({ ...p, voiceId: voice.voice_id }))}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all ${
                              selected
                                ? "bg-accent text-white border-accent shadow-sm"
                                : "bg-surface border-border text-foreground hover:bg-surface-hover"
                            }`}
                          >
                            <span className="font-medium">{voice.name}</span>
                            {voice.preview_url && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playPreview(voice);
                                }}
                                className={`text-[11px] ml-1 ${selected ? "text-white/70 hover:text-white" : "text-accent hover:underline"}`}
                              >
                                ▶
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">
                      {loadingVoices ? "불러오는 중..." : settings.language === "ja" ? "VOICEVOX 엔진을 먼저 실행하세요" : "목소리를 불러올 수 없습니다"}
                    </p>
                  )}
                </section>

                {/* AI 영상화 */}
                <section>
                  <h3 className="text-sm font-semibold text-foreground mb-3">AI 영상화 (WaveSpeed)</h3>
                  <button
                    onClick={() => setSettings((p) => ({ ...p, enableVideoClip: !p.enableVideoClip }))}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all ${
                      settings.enableVideoClip
                        ? "bg-accent/10 border-accent"
                        : "bg-surface border-border hover:bg-surface-hover"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{settings.enableVideoClip ? "🎥" : "🖼️"}</span>
                      <div className="text-left">
                        <p className={`text-sm font-semibold ${settings.enableVideoClip ? "text-accent" : "text-foreground"}`}>
                          {settings.enableVideoClip ? "영상 클립 생성 ON" : "정지 이미지 (기본)"}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {settings.enableVideoClip
                            ? "이미지를 AI로 영상화합니다 (장당 ~1분 소요)"
                            : "이미지에 줌 효과만 적용합니다"}
                        </p>
                      </div>
                    </div>
                    <div className={`w-12 h-7 rounded-full transition-all relative ${
                      settings.enableVideoClip ? "bg-accent" : "bg-white/20"
                    }`}>
                      <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${
                        settings.enableVideoClip ? "left-6" : "left-1"
                      }`} />
                    </div>
                  </button>
                </section>
              </div>

              {/* 다음 버튼 */}
              <div className="sticky bottom-4 flex justify-center mt-10">
                <button
                  onClick={handleSetupDone}
                  className="flex items-center gap-2.5 px-8 py-3.5 bg-accent text-white rounded-2xl font-semibold text-base shadow-lg hover:bg-accent/90 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  다음
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* ───── Phase 3: AI 분석 중 ───── */}
          {phase === "analyzing" && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4">
              <Loader2 size={40} className="text-accent animate-spin" />
              <p className="text-lg font-medium text-foreground">
                AI가 대본을 분석하고 있습니다...
              </p>
              <p className="text-sm text-text-secondary">
                모션/이미지 씬을 자동으로 분류합니다
              </p>
            </div>
          )}

          {/* ───── Phase 4: 씬 선택 ───── */}
          {phase === "select" && (
            <div className="w-full max-w-[900px] px-4 md:px-6 py-6 md:py-8">
              <button
                onClick={() => setPhase("setup")}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-6"
              >
                <ArrowLeft size={16} />
                스타일 설정으로 돌아가기
              </button>

              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <ListChecks size={22} className="text-accent" />
                  <h2 className="text-xl font-bold text-foreground">
                    모션으로 만들 씬을 선택하세요
                  </h2>
                </div>
                <p className="text-sm text-text-secondary">
                  {lineAnalyses.length > 0 ? (
                    <>
                      <Sparkles size={14} className="inline text-accent mr-1" />
                      AI가 핵심 데이터 줄만 모션으로 선택했습니다. 나머지는 이미지 씬이 됩니다.
                    </>
                  ) : (
                    "체크 = 모션 그래픽 / 비체크 = 이미지 + 나레이션 씬"
                  )}
                </p>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-foreground transition-colors"
                >
                  {checkedCount === parsedLines.length ? (
                    <CheckSquare size={16} className="text-accent" />
                  ) : (
                    <Square size={16} />
                  )}
                  전체 {checkedCount === parsedLines.length ? "해제" : "선택"}
                  <span className="text-xs text-text-secondary/60">
                    ({checkedCount}/{parsedLines.length})
                  </span>
                </button>

                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  {settings.language === "ja" && (
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showKoTranslation}
                        onChange={(e) => {
                          setShowKoTranslation(e.target.checked);
                          if (e.target.checked) fetchTranslations();
                        }}
                        className="accent-blue-500 w-3.5 h-3.5"
                      />
                      <span className="text-blue-500 font-medium">
                        {translating ? "번역 중..." : "🇰🇷 한국어 번역"}
                      </span>
                    </label>
                  )}
                  <span className="flex items-center gap-1 text-accent">
                    🎬 모션 {checkedCount}
                  </span>
                  <span className="flex items-center gap-1 text-blue-500">
                    🖼 이미지 {parsedLines.length - checkedCount}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                {parsedLines.map((line, i) => {
                  const checked = checkedSet.has(i);
                  const analysis = lineAnalyses[i];
                  const currentStyle = analysis?.suggestedStyle || "quote";
                  const styleTag = STYLE_TAGS[currentStyle];

                  return (
                    <div
                      key={i}
                      className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                        checked
                          ? "bg-accent/5 border-accent/30"
                          : "bg-surface border-border hover:bg-surface-hover"
                      }`}
                    >
                      <button onClick={() => toggleLine(i)} className="mt-0.5 shrink-0">
                        {checked ? (
                          <CheckSquare size={18} className="text-accent" />
                        ) : (
                          <Square size={18} className="text-text-secondary/40" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-medium text-text-secondary/50">{i + 1}</span>
                          {checked ? (
                            <select
                              value={currentStyle}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const newStyle = e.target.value;
                                setLineAnalyses((prev) => {
                                  const next = [...prev];
                                  next[i] = { ...(next[i] || { shouldMotion: true, reason: "" }), suggestedStyle: newStyle };
                                  return next;
                                });
                              }}
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border-none outline-none cursor-pointer appearance-none"
                              style={{ backgroundImage: "none", paddingRight: 8 }}
                            >
                              {MOTION_STYLES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.icon} {s.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-400">
                              🖼 이미지 씬
                            </span>
                          )}
                        </div>
                        <textarea
                          ref={(el) => { lineRefs.current[i] = el; }}
                          value={line}
                          onChange={(e) => updateLineText(i, e.target.value)}
                          onKeyDown={(e) => {
                            const el = e.currentTarget;
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              splitLine(i, el.selectionStart);
                            }
                            if (e.key === "Backspace" && el.selectionStart === 0 && el.selectionEnd === 0 && i > 0) {
                              e.preventDefault();
                              mergeWithPrev(i);
                            }
                          }}
                          rows={1}
                          onInput={(e) => {
                            const el = e.currentTarget;
                            el.style.height = "auto";
                            el.style.height = el.scrollHeight + "px";
                          }}
                          className={`w-full text-sm leading-relaxed bg-transparent border-none outline-none resize-none overflow-hidden ${checked ? "text-foreground" : "text-text-secondary"}`}
                        />
                        {showKoTranslation && koTranslations[i] && (
                          <p className="text-[11px] text-blue-400/80 mt-1 leading-relaxed">🇰🇷 {koTranslations[i]}</p>
                        )}
                        {analysis?.reason && (
                          <p className="text-[11px] text-text-secondary/50 mt-1">{analysis.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-6 p-4 rounded-xl border border-border bg-surface">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <PenLine size={15} className="text-accent" />
                  이미지 추가 지시사항 <span className="text-text-secondary font-normal">(선택)</span>
                </label>
                <textarea
                  value={userImageDirective}
                  onChange={(e) => setUserImageDirective(e.target.value)}
                  placeholder="예: 고양이가 중심인 이야기야 / 전체적으로 밤 분위기로 / 인물은 안경을 쓴 캐릭터로 통일"
                  rows={2}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-text-secondary/50 resize-none focus:outline-none focus:border-accent/50 transition-colors"
                />
                <p className="text-[11px] text-text-secondary/60 mt-1.5">
                  모든 이미지 프롬프트에 공통으로 반영됩니다.
                </p>
              </div>

              <div className="sticky bottom-4 flex justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={parsedLines.length === 0}
                  className="flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-base font-semibold shadow-lg transition-all bg-accent text-white hover:bg-accent/90 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Film size={18} />
                  영상 만들기 (모션 {checkedCount} + 이미지 {parsedLines.length - checkedCount})
                </button>
              </div>
            </div>
          )}

          {/* ───── Phase 5: 생성 중 ───── */}
          {phase === "generating" && (
            <div className="flex flex-col items-center justify-center flex-1 gap-6">
              <Loader2 size={44} className="text-accent animate-spin" />
              <div className="text-center">
                <p className="text-lg font-medium text-foreground mb-2">
                  AI가 영상을 준비하고 있습니다
                </p>
                <p className="text-sm text-text-secondary">
                  {genProgress.step}
                </p>
              </div>
              {genProgress.total > 0 && (
                <div className="w-64">
                  <div className="flex justify-between text-xs text-text-secondary mb-2">
                    <span>{genProgress.done} / {genProgress.total}</span>
                    <span>{Math.round((genProgress.done / genProgress.total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${(genProgress.done / genProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
