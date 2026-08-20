import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BrandBackground, clamp, font, palette} from './common.jsx';

export const IntroScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill>
      <BrandBackground />
      <Img
        src={staticFile('m-logo.svg')}
        style={{
          position: 'absolute',
          left: 150,
          top: 130,
          width: 108,
          height: 108,
          opacity: interpolate(frame, [0, 0.7 * fps], [0, 1], clamp),
          scale: interpolate(frame, [0, 1.1 * fps], [0.72, 1], {
            ...clamp,
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          filter: `drop-shadow(0 0 30px ${palette.cyan}99)`,
        }}
      />
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 150,
          top: 306,
          width: 1480,
          color: palette.white,
          fontSize: 112,
          lineHeight: 1.08,
          fontWeight: 950,
          letterSpacing: '-0.055em',
          opacity: interpolate(frame, [0.35 * fps, 1.2 * fps, 4.5 * fps, 5 * fps], [0, 1, 1, 0], clamp),
          translate: `0 ${interpolate(frame, [0.35 * fps, 1.25 * fps], [42, 0], clamp)}px`,
        }}
      >
        오늘도,<br />
        <span style={{color: palette.cyan, textShadow: `0 0 36px ${palette.cyan}66`}}>공부하라는 말</span>부터<br />
        시작하셨나요?
      </div>
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 151,
          bottom: 126,
          color: palette.muted,
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: '0.12em',
          opacity: interpolate(frame, [1.4 * fps, 2.2 * fps], [0, 1], clamp),
        }}
      >
        META SENSE · SELF-DIRECTED LEARNING SYSTEM
      </div>
    </AbsoluteFill>
  );
};
