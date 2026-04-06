import React from "react";
import {
  Img,
  Audio,
  OffthreadVideo,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import type { SceneData } from "../types";
import { VIDEO_WIDTH, VIDEO_HEIGHT } from "../types";
import { ChunkedSubtitle } from "../animations/ChunkedSubtitle";

interface ImageSceneProps {
  scene: SceneData;
  index: number;
}

export const ImageScene: React.FC<ImageSceneProps> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const hasVideo = !!scene.videoClipUrl;

  const zoomDir = scene.zoom ?? "in";
  const scaleStart = zoomDir === "in" ? 1.05 : 1.18;
  const scaleEnd = zoomDir === "in" ? 1.18 : 1.05;
  const scale = interpolate(frame, [0, durationInFrames], [scaleStart, scaleEnd], {
    extrapolateRight: "clamp",
  });

  const fadeOn = scene.fadeEnabled === true;
  let opacity = 1;
  if (fadeOn) {
    const fadeIn = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
    const fadeOut = interpolate(
      frame,
      [durationInFrames - 15, durationInFrames],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    opacity = fadeIn * fadeOut;
  }

  const narrationText = scene.narration || scene.line;

  return (
    <div
      style={{
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0a0a0a",
        opacity,
      }}
    >
      {hasVideo ? (
        <OffthreadVideo
          src={scene.videoClipUrl!}
          style={{
            position: "absolute",
            width: VIDEO_WIDTH,
            height: VIDEO_HEIGHT,
            objectFit: "cover",
          }}
          muted
          toneMapped={false}
        />
      ) : scene.mainImage ? (
        <Img
          src={scene.mainImage}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            filter: "brightness(0.85) saturate(1.1)",
          }}
        />
      ) : null}

      <ChunkedSubtitle
        text={narrationText}
        startDelay={0}
        position={scene.subtitlePosition ?? "bottom"}
        x={scene.subtitleX}
        y={scene.subtitleY}
        fontSize={scene.subtitleSize}
        fontId={scene.subtitleFont}
        language={scene.language}
        color={scene.subtitleColor}
        bg={scene.subtitleBg}
        stroke={scene.subtitleStroke !== false}
        strokeWidth={scene.subtitleStrokeWidth}
      />

      {scene.audioUrl && <Audio src={scene.audioUrl} />}
      {scene.sfxUrl && <Audio src={scene.sfxUrl} volume={scene.sfxVolume ?? 0.15} />}
    </div>
  );
};
