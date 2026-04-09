import type { SceneData } from "@/remotion/types";
import { apiFetch } from "@/lib/apiFetch";

export interface ThumbnailItem {
  imageUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  layers?: any[];
  bgImage?: string;
}

export interface ProjectStyle {
  imageModel?: string;
  stylePrompt?: string;
  styleImage?: string;
  characterRefImage?: string;
  characterDesc?: string;
  cachedRefUrls?: string[];
  styleDescription?: string;
}

export interface Project {
  id: string;
  title: string;
  script: string;
  scenes: SceneData[];
  createdAt: number;
  updatedAt: number;
  saved: boolean;
  renderUrl?: string;
  thumbnailUrl?: string;
  thumbnails?: ThumbnailItem[];
  style?: ProjectStyle;
}

export interface HistoryEntry {
  id: string;
  projectId: string;
  title: string;
  action: string;
  timestamp: number;
}

export const MAX_PROJECTS = 10;

function toProject(raw: Record<string, unknown>): Project {
  return {
    id: raw.id as string,
    title: raw.title as string,
    script: (raw.script as string) || "",
    scenes: (raw.scenes as SceneData[]) || [],
    createdAt: new Date(raw.createdAt as string).getTime(),
    updatedAt: new Date(raw.updatedAt as string).getTime(),
    saved: (raw.saved as boolean) || false,
    renderUrl: raw.renderUrl as string | undefined,
    thumbnailUrl: raw.thumbnailUrl as string | undefined,
    thumbnails: raw.thumbnails as ThumbnailItem[] | undefined,
    style: raw.style as ProjectStyle | undefined,
  };
}

export async function getProjects(): Promise<Project[]> {
  const res = await apiFetch("/api/projects");
  if (!res.ok) return [];
  const data = await res.json();
  return (data as Record<string, unknown>[]).map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const res = await apiFetch(`/api/projects/${id}`);
  if (!res.ok) return null;
  return toProject(await res.json());
}

export async function saveProject(
  proj: Omit<Project, "id" | "createdAt" | "updatedAt"> & { id?: string },
): Promise<Project> {
  if (proj.id) {
    const res = await apiFetch(`/api/projects/${proj.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: proj.title,
        script: proj.script,
        scenes: proj.scenes,
        saved: proj.saved,
        renderUrl: proj.renderUrl,
        thumbnailUrl: proj.thumbnailUrl,
        thumbnails: proj.thumbnails,
        style: proj.style,
      }),
    });
    if (!res.ok) throw new Error("Failed to update project");
    return toProject(await res.json());
  }

  const res = await apiFetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: proj.title,
      script: proj.script,
      scenes: proj.scenes,
      saved: proj.saved,
      renderUrl: proj.renderUrl,
      thumbnailUrl: proj.thumbnailUrl,
      thumbnails: proj.thumbnails,
      style: proj.style,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Failed to create project");
  }
  return toProject(await res.json());
}

export async function deleteProject(id: string): Promise<void> {
  await apiFetch(`/api/projects/${id}`, { method: "DELETE" });
}

export async function renameProject(id: string, newTitle: string): Promise<void> {
  await apiFetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: newTitle }),
  });
}

export async function toggleSaved(id: string): Promise<boolean> {
  const project = await getProject(id);
  if (!project) return false;
  const newSaved = !project.saved;
  await apiFetch(`/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ saved: newSaved }),
  });
  return newSaved;
}

export async function getSavedProjects(): Promise<Project[]> {
  const all = await getProjects();
  return all.filter((p) => p.saved);
}

const HISTORY_KEY = "sourcebox-history";

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addHistory(projectId: string, title: string, action: string): void {
  if (typeof window === "undefined") return;
  const history = getHistory();
  history.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    projectId,
    title,
    action,
    timestamp: Date.now(),
  });
  if (history.length > 100) history.length = 100;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}

const MIGRATED_KEY = "sourcebox-migrated-to-db";
const OLD_PROJECTS_KEY = "sourcebox-projects";

export async function migrateLocalStorageToDb(): Promise<number> {
  if (typeof window === "undefined") return 0;
  if (localStorage.getItem(MIGRATED_KEY)) return 0;

  const raw = localStorage.getItem(OLD_PROJECTS_KEY);
  if (!raw) {
    localStorage.setItem(MIGRATED_KEY, "1");
    return 0;
  }

  let oldProjects: Project[];
  try {
    oldProjects = JSON.parse(raw);
  } catch {
    localStorage.setItem(MIGRATED_KEY, "1");
    return 0;
  }

  if (!Array.isArray(oldProjects) || oldProjects.length === 0) {
    localStorage.setItem(MIGRATED_KEY, "1");
    return 0;
  }

  let imported = 0;
  for (const p of oldProjects) {
    try {
      await saveProject({
        title: p.title,
        script: p.script,
        scenes: p.scenes,
        saved: p.saved,
        renderUrl: p.renderUrl,
        thumbnailUrl: p.thumbnailUrl,
        thumbnails: p.thumbnails,
        style: p.style,
      });
      imported++;
    } catch {
      break;
    }
  }

  if (imported === oldProjects.length) {
    localStorage.setItem(MIGRATED_KEY, "1");
    localStorage.removeItem(OLD_PROJECTS_KEY);
  } else if (imported > 0) {
    const remaining = oldProjects.slice(imported);
    localStorage.setItem(OLD_PROJECTS_KEY, JSON.stringify(remaining));
  }

  return imported;
}
