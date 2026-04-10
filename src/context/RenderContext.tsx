"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import type { RenderJob } from "@/components/RenderPanel";
import type { VideoProps } from "@/remotion/types";
import { apiFetch } from "@/lib/apiFetch";
import { saveProject, getProject } from "@/lib/projectStore";

interface RenderContextValue {
  jobs: RenderJob[];
  startRender: (props: VideoProps, label: string, projectId?: string) => void;
  dismissJob: (id: string) => void;
  dismissAllJobs: () => void;
  isRendering: boolean;
}

const RenderContext = createContext<RenderContextValue | null>(null);

export function useRender() {
  const ctx = useContext(RenderContext);
  if (!ctx) throw new Error("useRender must be used within RenderProvider");
  return ctx;
}

export function RenderProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const activeCount = useRef(0);

  const updateJob = useCallback((id: string, patch: Partial<RenderJob>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  }, []);

  const startRender = useCallback(
    (props: VideoProps, label: string, projectId?: string) => {
      const jobId = `local-${Date.now()}`;
      const newJob: RenderJob = {
        id: jobId,
        label,
        progress: 0,
        done: false,
        startedAt: Date.now(),
        sceneCount: props.scenes.length,
      };

      setJobs((prev) => [newJob, ...prev]);
      activeCount.current += 1;

      (async () => {
        try {
          const res = await apiFetch("/api/render", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(props),
          });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Render failed: ${res.status}`);
          }
          const data = await res.json();
          if (!data.jobId) throw new Error("No jobId returned");

          let done = false;
          while (!done) {
            await new Promise((r) => setTimeout(r, 2000));
            const poll = await apiFetch(`/api/render?jobId=${data.jobId}`);
            const status = await poll.json();

            updateJob(jobId, { progress: status.progress ?? 0 });

            if (status.error) throw new Error(status.error);

            if (status.done && status.url) {
              done = true;
              updateJob(jobId, { done: true, progress: 1, url: status.url });

              if (projectId) {
                const p = await getProject(projectId);
                if (p) await saveProject({ ...p, renderUrl: status.url });
              }
            }
          }
        } catch (err: unknown) {
          updateJob(jobId, { done: true, error: (err as Error).message });
        } finally {
          activeCount.current -= 1;
        }
      })();
    },
    [updateJob],
  );

  const dismissJob = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }, []);

  const dismissAllJobs = useCallback(() => {
    setJobs([]);
  }, []);

  const isRendering = jobs.some((j) => !j.done && !j.error);

  useEffect(() => {
    if (!isRendering) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRendering]);

  return (
    <RenderContext.Provider value={{ jobs, startRender, dismissJob, dismissAllJobs, isRendering }}>
      {children}
    </RenderContext.Provider>
  );
}
