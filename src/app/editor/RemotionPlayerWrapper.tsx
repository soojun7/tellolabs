"use client";

import React, { useEffect, useRef, useMemo, useCallback } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { MotionVideo } from "@/remotion/compositions/MotionVideo";
import type { VideoProps } from "@/remotion/types";
import { VIDEO_WIDTH, VIDEO_HEIGHT, VIDEO_FPS } from "@/remotion/types";

interface Props {
  videoProps: VideoProps;
  totalFrames: number;
  seekToFrame?: number;
}

const RemotionPlayerWrapper: React.FC<Props> = ({
  videoProps,
  totalFrames,
  seekToFrame,
}) => {
  const playerRef = useRef<PlayerRef>(null);
  const lastSeekRef = useRef<number | undefined>(seekToFrame);

  const seekTo = useCallback((frame: number, play = false) => {
    const trySeek = (retries = 0) => {
      if (playerRef.current) {
        playerRef.current.seekTo(frame);
        if (play) playerRef.current.play();
      } else if (retries < 5) {
        setTimeout(() => trySeek(retries + 1), 60);
      }
    };
    trySeek();
  }, []);

  useEffect(() => {
    if (seekToFrame !== undefined) {
      lastSeekRef.current = seekToFrame;
      seekTo(seekToFrame, true);
    }
  }, [seekToFrame, seekTo]);

  const playerKey = useMemo(() => {
    return videoProps.scenes
      .map((s) =>
        `${s.subtitleSize ?? 54}_${s.subtitleX ?? 50}_${s.subtitleY ?? 88}_${s.subtitleFont ?? "d"}_${s.fadeEnabled ?? true}_${s.fontId ?? "d"}_${s.fontSize ?? 0}_${s.subtitleColor ?? "w"}_${s.subtitleBg ?? "n"}_${s.subtitleStroke ?? true}_${s.subtitleStrokeWidth ?? 0}`
      )
      .join("|");
  }, [videoProps.scenes]);

  useEffect(() => {
    if (lastSeekRef.current !== undefined) {
      seekTo(lastSeekRef.current);
    }
  }, [playerKey, seekTo]);

  return (
    <Player
      key={playerKey}
      ref={playerRef}
      component={MotionVideo as React.ComponentType<any>}
      inputProps={videoProps}
      durationInFrames={Math.max(totalFrames, 1)}
      compositionWidth={VIDEO_WIDTH}
      compositionHeight={VIDEO_HEIGHT}
      fps={VIDEO_FPS}
      style={{
        width: "100%",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
      }}
      controls
      autoPlay
      loop
    />
  );
};

export default RemotionPlayerWrapper;
