export interface ImageModelPreset {
  id: string;
  label: string;
  desc: string;
  supportsRef: boolean;
}

export interface ArtStylePreset {
  id: string;
  label: string;
  prompt: string;
  emoji: string;
  color: string;
}

export type DirectionIntensity = "normal" | "dramatic";
export type TTSLanguage = "ko" | "ja";

export interface GenerationSettings {
  language: TTSLanguage;
  imageModel: string;
  artStyle: string;
  customArtStyle: string;
  customStyleImage: string;
  characterDesc: string;
  characterRefImage: string;
  styleDescription: string;
  voiceId: string;
  directionIntensity: DirectionIntensity;
  enableVideoClip: boolean;
}

export const IMAGE_MODELS: ImageModelPreset[] = [
  { id: "alibaba:wan@2.7-image-pro",     label: "Wan Image Pro", desc: "일러스트/실사", supportsRef: true },
  { id: "google:4@3",                    label: "Imagen 3",      desc: "최신 고화질",   supportsRef: true },
  { id: "google:4@2",                    label: "Imagen 3 Fast", desc: "빠른 생성",     supportsRef: true },
  { id: "alibaba:qwen-image@2.0-pro",    label: "Qwen Image",   desc: "고품질 범용",   supportsRef: true },
  { id: "bytedance:seedream@5.0-lite",   label: "SeedReam",     desc: "바이트댄스",    supportsRef: true },
];

export const ART_STYLES: ArtStylePreset[] = [
  { id: "cinematic",  label: "시네마틱",   emoji: "🎬", color: "#1a1a2e", prompt: "cinematic photography, dramatic lighting, shallow depth of field, editorial" },
  { id: "cartoon",    label: "카툰",       emoji: "🖍️", color: "#ff6b6b", prompt: "cartoon style, bold outlines, bright colors, playful, cel shading" },
  { id: "fantasy",    label: "판타지",     emoji: "🧙", color: "#6c5ce7", prompt: "fantasy art, magical atmosphere, ethereal lighting, epic scenery, detailed illustration" },
  { id: "anime",      label: "애니메이션", emoji: "🌸", color: "#fd79a8", prompt: "anime style illustration, vibrant colors, clean linework, detailed background" },
  { id: "watercolor", label: "수채화",     emoji: "🎨", color: "#74b9ff", prompt: "watercolor painting, soft colors, artistic brush strokes, delicate details" },
  { id: "oil",        label: "유화",       emoji: "🖼️", color: "#b8860b", prompt: "oil painting, rich textures, warm color palette, classical art style" },
  { id: "3d",         label: "3D 렌더",    emoji: "💎", color: "#00cec9", prompt: "3D rendered, octane render, highly detailed, volumetric lighting, realistic materials" },
  { id: "flat",       label: "플랫",       emoji: "📐", color: "#fdcb6e", prompt: "flat illustration, vector art style, minimalist, clean geometric shapes, pastel tones" },
  { id: "pixel",      label: "픽셀아트",   emoji: "👾", color: "#55efc4", prompt: "pixel art style, retro game aesthetic, 16-bit, clean pixels" },
  { id: "cyberpunk",  label: "사이버펑크", emoji: "🌃", color: "#e056fd", prompt: "cyberpunk style, neon lights, futuristic city, dark atmosphere, glowing effects" },
  { id: "custom",     label: "직접 입력",  emoji: "✏️", color: "#636e72", prompt: "" },
];

export const DEFAULT_SETTINGS: GenerationSettings = {
  language: "ko",
  imageModel: "alibaba:wan@2.7-image-pro",
  artStyle: "cinematic",
  customArtStyle: "",
  customStyleImage: "",
  characterDesc: "",
  characterRefImage: "",
  styleDescription: "",
  voiceId: "4JJwo477JUAx3HV0T7n7",
  directionIntensity: "normal",
  enableVideoClip: false,
};

export function buildStylePrompt(settings: GenerationSettings): string {
  if (settings.artStyle === "custom" && settings.customArtStyle) {
    return settings.customArtStyle;
  }
  const preset = ART_STYLES.find((s) => s.id === settings.artStyle);
  return preset?.prompt ?? "";
}

export function getModelInfo(modelId: string): ImageModelPreset | undefined {
  return IMAGE_MODELS.find((m) => m.id === modelId);
}

export function isNativeModel(modelId: string): boolean {
  return modelId.startsWith("google:") || modelId.startsWith("alibaba:") || modelId.startsWith("bytedance:");
}
