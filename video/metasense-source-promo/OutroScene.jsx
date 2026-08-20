import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BrandBackground, clamp, font, palette} from './common.jsx';

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const rise = interpolate(frame, [0, 1.1 * fps], [46, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <AbsoluteFill>
      <BrandBackground accent={palette.mint} />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 920,
          height: 920,
          borderRadius: '50%',
          translate: '-50% -50%',
          background: `radial-gradient(circle, ${palette.cyan}20, transparent 66%)`,
          scale: interpolate(frame, [0, 5.8 * fps], [0.78, 1.18], clamp),
        }}
      />
      <div
        style={{
          ...font,
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          translate: `0 ${rise}px`,
          opacity: interpolate(frame, [0, 0.8 * fps, 5.45 * fps, 6 * fps], [0, 1, 1, 0], clamp),
        }}
      >
        <Img src={staticFile('m-logo.svg')} style={{width: 124, height: 124, filter: `drop-shadow(0 0 36px ${palette.cyan}88)`}} />
        <div style={{marginTop: 34, color: palette.cyan, fontSize: 31, fontWeight: 850, letterSpacing: '0.16em'}}>META SENSE</div>
        <div
          style={{
            marginTop: 34,
            color: palette.white,
            fontSize: 98,
            lineHeight: 1.12,
            fontWeight: 950,
            letterSpacing: '-0.052em',
            textAlign: 'center',
          }}
        >
          시키는 공부에서,<br />
          <span style={{color: palette.mint}}>스스로 떠나는 배움</span>으로
        </div>
        <div
          style={{
            marginTop: 54,
            padding: '22px 46px',
            borderRadius: 999,
            color: palette.night,
            background: `linear-gradient(110deg, ${palette.cyan}, ${palette.mint})`,
            fontSize: 38,
            fontWeight: 950,
            boxShadow: `0 0 38px ${palette.cyan}55`,
          }}
        >
          지금 무료체험 시작하기
        </div>
        <div style={{marginTop: 24, color: palette.white, fontSize: 34, fontWeight: 760, letterSpacing: '0.08em'}}>msense.me/trial</div>
      </div>
    </AbsoluteFill>
  );
};
