import type { SceneData } from "@/remotion/types";

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

const PROJECTS_KEY = "sourcebox-projects";
const HISTORY_KEY = "sourcebox-history";
export const MAX_PROJECTS = 10;

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getProject(id: string): Project | null {
  return getProjects().find((p) => p.id === id) ?? null;
}

export function saveProject(proj: Omit<Project, "id" | "createdAt" | "updatedAt"> & { id?: string }): Project {
  const projects = getProjects();
  const now = Date.now();

  if (proj.id) {
    const idx = projects.findIndex((p) => p.id === proj.id);
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], ...proj, updatedAt: now };
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
      addHistory(projects[idx].id, projects[idx].title, "프로젝트 수정");
      return projects[idx];
    }
  }

  if (projects.length >= MAX_PROJECTS) {
    throw new Error(`프로젝트는 최대 ${MAX_PROJECTS}개까지 저장할 수 있습니다. 기존 프로젝트를 삭제해주세요.`);
  }

  const newProj: Project = {
    id: genId(),
    title: proj.title,
    script: proj.script,
    scenes: proj.scenes,
    createdAt: now,
    updatedAt: now,
    saved: proj.saved ?? false,
  };
  projects.unshift(newProj);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  addHistory(newProj.id, newProj.title, "프로젝트 생성");
  return newProj;
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  addHistory(id, "", "프로젝트 삭제");
}

export function renameProject(id: string, newTitle: string): void {
  const projects = getProjects();
  const proj = projects.find((p) => p.id === id);
  if (!proj) return;
  proj.title = newTitle;
  proj.updatedAt = Date.now();
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  addHistory(id, newTitle, "이름 변경");
}

export function toggleSaved(id: string): boolean {
  const projects = getProjects();
  const proj = projects.find((p) => p.id === id);
  if (!proj) return false;
  proj.saved = !proj.saved;
  proj.updatedAt = Date.now();
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return proj.saved;
}

export function getSavedProjects(): Project[] {
  return getProjects().filter((p) => p.saved);
}

export function getHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function addHistory(projectId: string, title: string, action: string): void {
  const history = getHistory();
  history.unshift({
    id: genId(),
    projectId,
    title,
    action,
    timestamp: Date.now(),
  });
  if (history.length > 100) history.length = 100;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function clearHistory(): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
}
