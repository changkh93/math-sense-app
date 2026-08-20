/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export const palette = {
  night: '#050816',
  navy: '#0b1230',
  cyan: '#19e6ff',
  mint: '#6dffd5',
  violet: '#9a7cff',
  pink: '#ff72d0',
  gold: '#ffd36a',
  white: '#f7fbff',
  muted: '#a9b8d6',
};

export const font = {
  fontFamily: '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
};

export const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

export const BrandBackground = ({accent = palette.cyan}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 78% 18%, ${accent}22, transparent 31%), radial-gradient(circle at 15% 88%, ${palette.violet}22, transparent 34%), linear-gradient(145deg, ${palette.night}, ${palette.navy})`,
        overflow: 'hidden',
      }}
    >
      {Array.from({length: 48}).map((_, index) => {
        const x = (index * 149) % 1920;
        const y = (index * 83 + frame * (0.09 + (index % 5) * 0.025)) % 1080;
        const size = 1 + (index % 4) * 0.7;
        return (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: '50%',
              background: index % 7 === 0 ? accent : 'rgba(255,255,255,0.72)',
              boxShadow: index % 7 === 0 ? `0 0 16px ${accent}` : 'none',
              opacity: 0.34 + (index % 4) * 0.12,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: 210,
          top: 120,
          width: 1500,
          height: 860,
          border: '1px solid rgba(121,175,255,0.08)',
          borderRadius: '50%',
          rotate: `${-8 + Math.sin(frame / 120) * 1.2}deg`,
        }}
      />
    </AbsoluteFill>
  );
};

export const BrandBug = ({label = 'META SENSE'}) => (
  <div
    style={{
      ...font,
      position: 'absolute',
      left: 86,
      top: 48,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      color: palette.white,
      fontSize: 24,
      fontWeight: 850,
      letterSpacing: '0.13em',
      textShadow: `0 0 20px ${palette.cyan}88`,
    }}
  >
    <Img src={staticFile('m-logo.svg')} style={{width: 36, height: 36, objectFit: 'contain'}} />
    {label}
  </div>
);

export const ScreenFrame = ({src, playbackRate = 1, trimBefore = 0, accent = palette.cyan, privacyMask = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const reveal = interpolate(frame, [0, 0.7 * fps], [0.94, 1], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const y = interpolate(frame, [0, 0.7 * fps], [26, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <div
      style={{
        position: 'absolute',
        left: 94,
        top: 128,
        width: 1732,
        height: 820,
        borderRadius: 34,
        overflow: 'hidden',
        border: `1px solid ${accent}88`,
        background: '#070b19',
        boxShadow: `0 36px 90px rgba(0,0,0,0.55), 0 0 48px ${accent}20`,
        scale: reveal,
        translate: `0 ${y}px`,
      }}
    >
      <OffthreadVideo
        src={staticFile(src)}
        trimBefore={trimBefore}
        playbackRate={playbackRate}
        volume={0}
        style={{
          position: 'absolute',
          left: -18,
          top: -102,
          width: 1768,
          height: 994.5,
          objectFit: 'cover',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(4,8,20,0.78) 0%, rgba(4,8,20,0.18) 42%, transparent 72%)',
          pointerEvents: 'none',
        }}
      />
      {privacyMask ? (
        <div
          style={{
            position: 'absolute',
            left: 470,
            top: 142,
            width: 690,
            height: 245,
            borderRadius: 26,
            background: 'linear-gradient(135deg, rgba(7,11,27,0.98), rgba(25,34,67,0.96))',
            border: '1px solid rgba(154,124,255,0.35)',
            boxShadow: '0 18px 55px rgba(0,0,0,0.42)',
          }}
        >
          <div style={{position: 'absolute', left: 44, top: 52, width: 220, height: 18, borderRadius: 99, background: 'rgba(255,255,255,0.12)'}} />
          <div style={{position: 'absolute', left: 44, top: 91, width: 390, height: 14, borderRadius: 99, background: 'rgba(255,255,255,0.07)'}} />
          <div style={{position: 'absolute', left: 44, top: 143, width: 560, height: 54, borderRadius: 15, background: 'rgba(109,255,213,0.08)', border: '1px solid rgba(109,255,213,0.16)'}} />
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 120,
          background: 'linear-gradient(transparent, rgba(3,6,18,0.84))',
        }}
      />
    </div>
  );
};

export const FeatureScene = ({
  number,
  eyebrow,
  headline,
  body,
  src,
  playbackRate,
  trimBefore,
  accent = palette.cyan,
  privacyMask = false,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const opacity = interpolate(
    frame,
    [0, 0.4 * fps, durationInFrames - 0.45 * fps, durationInFrames],
    [0, 1, 1, 0],
    clamp,
  );
  const copyY = interpolate(frame, [0.2 * fps, 0.9 * fps], [34, 0], {
    ...clamp,
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{opacity}}>
      <BrandBackground accent={accent} />
      <ScreenFrame
        src={src}
        playbackRate={playbackRate}
        trimBefore={trimBefore}
        accent={accent}
        privacyMask={privacyMask}
      />
      <BrandBug />
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 142,
          top: 520,
          width: 830,
          translate: `0 ${copyY}px`,
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 16, marginBottom: 19}}>
          <div
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 58,
              height: 58,
              borderRadius: 18,
              color: palette.night,
              background: accent,
              fontSize: 27,
              fontWeight: 950,
              boxShadow: `0 0 28px ${accent}77`,
            }}
          >
            {number}
          </div>
          <div style={{color: accent, fontSize: 25, fontWeight: 850, letterSpacing: '0.08em'}}>{eyebrow}</div>
        </div>
        <div
          style={{
            color: palette.white,
            fontSize: 82,
            lineHeight: 1.08,
            fontWeight: 920,
            letterSpacing: '-0.045em',
            whiteSpace: 'pre-line',
            textShadow: '0 5px 28px rgba(0,0,0,0.72)',
          }}
        >
          {headline}
        </div>
        <div
          style={{
            width: 720,
            marginTop: 24,
            color: palette.white,
            fontSize: 38,
            lineHeight: 1.4,
            fontWeight: 650,
            textShadow: '0 4px 18px rgba(0,0,0,0.82)',
          }}
        >
          {body}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 142,
          right: 142,
          bottom: 56,
          height: 3,
          borderRadius: 99,
          background: 'rgba(255,255,255,0.12)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${interpolate(frame, [0, durationInFrames], [0, 100], clamp)}%`,
            height: '100%',
            background: `linear-gradient(90deg, ${accent}, ${palette.violet})`,
            boxShadow: `0 0 14px ${accent}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
