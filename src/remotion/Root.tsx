import React from "react";
import { Composition } from "remotion";
import { MotionVideo } from "./compositions/MotionVideo";
import {
  VIDEO_WIDTH,
  VIDEO_HEIGHT,
  VIDEO_FPS,
  SCENE_DURATION_FRAMES,
  TRANSITION_FRAMES,
  getSceneDurationFrames,
} from "./types";
import type { VideoProps, SceneData } from "./types";

const defaultProps: VideoProps = {
  scenes: [
    {
      line: "대본을 넣으면 자동으로 모션 그래픽을 생성합니다",
      keywords: ["텔로스튜디오", "모션"],
      backgroundImage: "",
      mainImage: "",
      mainImageSource: "",
      type: "google",
      sceneType: "motion",
      motionStyle: "quote",
    },
    {
      line: "밈, 스톡, 구글 이미지를 활용한 영상 제작",
      keywords: ["밈", "스톡"],
      backgroundImage: "",
      mainImage: "",
      mainImageSource: "",
      type: "meme",
      sceneType: "image",
      motionStyle: "bottomCaption",
      narration: "밈, 스톡, 구글 이미지를 활용한 영상 제작",
      zoom: "in",
    },
  ],
  fps: VIDEO_FPS,
  sceneDurationFrames: SCENE_DURATION_FRAMES,
};

function calcTotalDuration(scenes: SceneData[], fps: number, defaultDur: number, transition: number) {
  if (scenes.length <= 0) return defaultDur;
  const total = scenes.reduce(
    (acc, s) => acc + getSceneDurationFrames(s, fps, defaultDur),
    0,
  );
  let overlaps = 0;
  for (let i = 0; i < scenes.length - 1; i++) {
    if (scenes[i].fadeEnabled === true && scenes[i + 1].fadeEnabled === true) {
      overlaps += transition;
    }
  }
  return total - overlaps;
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotionVideo"
        component={MotionVideo as any}
        durationInFrames={calcTotalDuration(
          defaultProps.scenes,
          VIDEO_FPS,
          defaultProps.sceneDurationFrames,
          TRANSITION_FRAMES,
        )}
        fps={VIDEO_FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
        defaultProps={defaultProps}
        calculateMetadata={async ({ props }: { props: any }) => {
          const dur = calcTotalDuration(
            props.scenes,
            props.fps || VIDEO_FPS,
            props.sceneDurationFrames || SCENE_DURATION_FRAMES,
            TRANSITION_FRAMES,
          );
          return { durationInFrames: dur };
        }}
      />
    </>
  );
};
