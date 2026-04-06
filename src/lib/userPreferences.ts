const STORAGE_KEY = "sourcebox_user_prefs";

export interface SubtitlePreferences {
  subtitleSize?: number;
  subtitleFont?: string;
  subtitleColor?: string;
  subtitleBg?: "none" | "box" | "fullbar";
  subtitleStroke?: boolean;
  subtitleStrokeWidth?: number;
  subtitleX?: number;
  subtitleY?: number;
}

export interface GenerationPreferences {
  language?: string;
  voiceId?: string;
  imageModel?: string;
  artStyle?: string;
  customArtStyle?: string;
  customStyleImage?: string;
  characterRefImage?: string;
  characterDesc?: string;
  styleDescription?: string;
  directionIntensity?: string;
}

export interface UserPreferences {
  generation?: GenerationPreferences;
  subtitle?: SubtitlePreferences;
}

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePreferences(prefs: Partial<UserPreferences>) {
  if (typeof window === "undefined") return;
  try {
    const current = loadPreferences();
    const merged = {
      ...current,
      ...prefs,
      generation: prefs.generation
        ? { ...current.generation, ...prefs.generation }
        : current.generation,
      subtitle: prefs.subtitle
        ? { ...current.subtitle, ...prefs.subtitle }
        : current.subtitle,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // silent
  }
}

export function saveGenerationPref(key: keyof GenerationPreferences, value: string) {
  const prefs = loadPreferences();
  savePreferences({
    generation: { ...prefs.generation, [key]: value },
  });
}

export function saveSubtitlePref(updates: Partial<SubtitlePreferences>) {
  const prefs = loadPreferences();
  savePreferences({
    subtitle: { ...prefs.subtitle, ...updates },
  });
}
