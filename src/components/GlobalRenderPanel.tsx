"use client";

import { useRender } from "@/context/RenderContext";
import RenderPanel from "./RenderPanel";

export default function GlobalRenderPanel() {
  const { jobs, dismissJob, dismissAllJobs } = useRender();
  return <RenderPanel jobs={jobs} onDismiss={dismissJob} onDismissAll={dismissAllJobs} />;
}
