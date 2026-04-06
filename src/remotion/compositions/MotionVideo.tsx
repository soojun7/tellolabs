import React from "react";
import { Series } from "remotion";
import { SceneSlide } from "./SceneSlide";
import type { VideoProps } from "../types";
import {
  SCENE_DURATION_FRAMES,
  TRANSITION_FRAMES,
  VIDEO_FPS,
  getSceneDurationFrames,
} from "../types";

export const MotionVideo: React.FC<VideoProps> = ({
  scenes,
  fps = VIDEO_FPS,
  sceneDurationFrames = SCENE_DURATION_FRAMES,
}) => {
  return (
    <Series>
      {scenes.map((scene, i) => {
        const dur = getSceneDurationFrames(scene, fps, sceneDurationFrames);
        const prevFade = i > 0 && scenes[i - 1].fadeEnabled === true;
        const currFade = scene.fadeEnabled === true;
        const offset = (prevFade && currFade) ? -TRANSITION_FRAMES : 0;
        return (
          <Series.Sequence
            key={i}
            durationInFrames={dur}
            offset={offset}
          >
            <SceneSlide scene={scene} index={i} />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};
