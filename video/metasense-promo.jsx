import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const colors = {
  ink: '#172033',
  navy: '#1c2a4a',
  blue: '#2878ff',
  cyan: '#26d3ff',
  yellow: '#ffd84d',
  peach: '#ff8f70',
  green: '#35d07f',
  white: '#ffffff',
  soft: '#f5f8ff',
};

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const scene = {
  nagging: 0,
  reversal: 180,
  product: 360,
  change: 600,
  family: 900,
  ending: 1110,
};

const baseFont = {
  fontFamily:
    '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
};

const pop = (frame, fps, start = 0, strength = 1) =>
  spring({
    frame: frame - start,
    fps,
    config: {
      damping: 11,
      mass: 0.55,
      stiffness: 180 * strength,
    },
  });

const SoundBed = () => (
  <>
    <Audio src={staticFile('metasense-promo/sfx/beat.wav')} volume={0.16} />
    {[0, 21, 42, 63, 84, 108, 132].map((from) => (
      <Sequence key={`notify-${from}`} from={from}>
        <Audio src={staticFile('metasense-promo/sfx/notify.wav')} volume={0.45} />
      </Sequence>
    ))}
    {[180, 222, 318, 390, 450, 510, 640, 696, 756, 915, 975, 1110].map((from) => (
      <Sequence key={`pop-${from}`} from={from}>
        <Audio src={staticFile('metasense-promo/sfx/pop.wav')} volume={0.58} />
      </Sequence>
    ))}
    {[178, 198, 218].map((from) => (
      <Sequence key={`drop-${from}`} from={from}>
        <Audio src={staticFile('metasense-promo/sfx/drop.wav')} volume={0.5} />
      </Sequence>
    ))}
    <Sequence from={900}>
      <Audio src={staticFile('metasense-promo/sfx/success.wav')} volume={0.65} />
    </Sequence>
    <Sequence from={1110}>
      <Audio src={staticFile('metasense-promo/sfx/sparkle.wav')} volume={0.55} />
    </Sequence>
  </>
);

const Background = ({tone = 'warm'}) => {
  const frame = useCurrentFrame();
  const wave = Math.sin(frame / 24) * 18;
  const palette =
    tone === 'cool'
      ? ['#e8f8ff', '#d9edff', '#ffffff']
      : tone === 'dark'
        ? ['#142039', '#1d3865', '#223c73']
        : ['#fff3d8', '#eaf7ff', '#fffdf6'];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${palette[0]}, ${palette[1]} 52%, ${palette[2]})`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: -180,
          top: 260 + wave,
          width: 520,
          height: 900,
          transform: 'rotate(-10deg)',
          background: 'rgba(40, 120, 255, 0.09)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -160,
          bottom: 80 - wave,
          width: 460,
          height: 740,
          transform: 'rotate(12deg)',
          background: 'rgba(255, 216, 77, 0.18)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(23,32,51,0.035) 2px, transparent 2px), linear-gradient(90deg, rgba(23,32,51,0.035) 2px, transparent 2px)',
          backgroundSize: '72px 72px',
        }}
      />
    </AbsoluteFill>
  );
};

const BigCaption = ({
  children,
  top,
  size = 86,
  color = colors.ink,
  bg = colors.white,
  rotate = 0,
  delay = 0,
  width = 900,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = pop(frame, fps, delay);
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], clamp);
  return (
    <div
      style={{
        ...baseFont,
        position: 'absolute',
        top,
        left: (1080 - width) / 2,
        width,
        padding: '24px 34px',
        borderRadius: 30,
        background: bg,
        color,
        fontSize: size,
        lineHeight: 1.08,
        fontWeight: 950,
        textAlign: 'center',
        boxShadow: '0 18px 0 rgba(23,32,51,0.16), 0 26px 50px rgba(23,32,51,0.18)',
        transform: `scale(${0.8 + s * 0.2}) rotate(${rotate}deg)`,
        opacity,
      }}
    >
      {children}
    </div>
  );
};

const SpeechBubble = ({text, x, y, delay, color = colors.white, textColor = colors.ink, rotate = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - delay;
  const s = spring({frame: local, fps, config: {damping: 10, stiffness: 160}});
  const yMove = interpolate(local, [0, 70], [90, -10], clamp);
  const opacity = interpolate(local, [0, 6, 96, 112], [0, 1, 1, 0], clamp);

  return (
    <div
      style={{
        ...baseFont,
        position: 'absolute',
        left: x,
        top: y + yMove,
        maxWidth: 520,
        padding: '22px 28px',
        borderRadius: 34,
        background: color,
        color: textColor,
        fontSize: 48,
        lineHeight: 1.12,
        fontWeight: 900,
        border: '5px solid rgba(23,32,51,0.15)',
        boxShadow: '0 12px 0 rgba(23,32,51,0.18)',
        transform: `scale(${0.7 + s * 0.3}) rotate(${rotate}deg)`,
        opacity,
      }}
    >
      {text}
      <div
        style={{
          position: 'absolute',
          bottom: -22,
          left: 70,
          width: 38,
          height: 38,
          background: color,
          borderRight: '5px solid rgba(23,32,51,0.15)',
          borderBottom: '5px solid rgba(23,32,51,0.15)',
          transform: 'rotate(45deg)',
        }}
      />
    </div>
  );
};

const Face = ({mood = 'tired', size = 210, shirt = colors.blue}) => {
  const eye = mood === 'focused' ? '8px solid #172033' : '10px solid #172033';
  const mouth =
    mood === 'tired'
      ? {width: 52, height: 22, borderTop: '8px solid #172033', borderRadius: '50%'}
      : mood === 'wow'
        ? {width: 42, height: 42, border: '8px solid #172033', borderRadius: '50%'}
        : {width: 72, height: 36, borderBottom: '8px solid #172033', borderRadius: '50%'};

  return (
    <div style={{position: 'relative', width: size, height: size + 170}}>
      <div
        style={{
          position: 'absolute',
          left: size * 0.16,
          top: size * 0.78,
          width: size * 0.68,
          height: 170,
          background: shirt,
          borderRadius: '44px 44px 24px 24px',
          boxShadow: 'inset 0 -16px rgba(23,32,51,0.12)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#ffd2b8',
          border: '8px solid #172033',
          boxShadow: '0 16px 0 rgba(23,32,51,0.12)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: size * 0.25,
            top: size * 0.36,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#172033',
            boxShadow: `${size * 0.32}px 0 #172033`,
            border: eye,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: size * 0.62,
            transform: 'translateX(-50%)',
            ...mouth,
          }}
        />
      </div>
    </div>
  );
};

const Desk = () => (
  <div
    style={{
      position: 'absolute',
      left: 110,
      bottom: 200,
      width: 860,
      height: 160,
      borderRadius: 36,
      background: '#9b6a43',
      boxShadow: '0 28px 0 #6f472a',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 190,
        top: -110,
        width: 500,
        height: 120,
        borderRadius: 20,
        background: '#ffffff',
        border: '8px solid #172033',
        transform: 'rotate(-2deg)',
      }}
    />
  </div>
);

const NaggingScene = () => {
  const frame = useCurrentFrame();
  const shake = frame < 170 ? Math.sin(frame * 1.7) * 7 : 0;
  return (
    <AbsoluteFill style={{transform: `translateX(${shake}px)`}}>
      <Background />
      <Desk />
      <div style={{position: 'absolute', left: 425, bottom: 320}}>
        <Face mood="tired" shirt="#7aa8ff" />
      </div>
      <div style={{position: 'absolute', left: 74, top: 900, transform: 'scale(0.82) rotate(5deg)'}}>
        <Face mood="wow" shirt={colors.peach} />
      </div>
      <SpeechBubble text="숙제했어?" x={120} y={120} delay={0} rotate={-4} />
      <SpeechBubble text="문제 풀었어?" x={420} y={250} delay={22} color="#fff0b8" rotate={5} />
      <SpeechBubble text="틀린 거 다시 봤어?" x={70} y={430} delay={44} color="#e8fbff" rotate={-5} />
      <SpeechBubble text="공부 좀 해라!" x={400} y={600} delay={66} color="#ffe0e0" rotate={3} />
      <BigCaption top={1310} size={54} bg="#172033" color="#ffffff" delay={118} rotate={-2}>
        아이: "아... 또 시작이야..."
      </BigCaption>
    </AbsoluteFill>
  );
};

const ReversalScene = () => {
  const frame = useCurrentFrame();
  const local = frame;
  const frozen = local < 22 ? interpolate(local, [0, 22], [1, 0], clamp) : 0;
  const drop = interpolate(local, [0, 52], [-40, 520], clamp);

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <div style={{position: 'absolute', inset: 0, filter: `grayscale(${frozen})`}}>
        <div style={{position: 'absolute', left: 130, top: 210 + drop, opacity: interpolate(local, [0, 50], [1, 0], clamp)}}>
          <SpeechBubble text="잔소리 폭탄" x={0} y={0} delay={0} color="#ffe0e0" rotate={-9} />
        </div>
      </div>
      <BigCaption top={390} size={150} bg={colors.yellow} color={colors.ink} delay={10} rotate={-2}>
        냅둬유.
      </BigCaption>
      <BigCaption top={660} size={82} bg={colors.white} delay={58} rotate={2}>
        스스로 알아서 하게.
      </BigCaption>
      <BigCaption top={910} size={54} bg="#172033" color="#ffffff" delay={104}>
        냅둬유, 스스로 알아서 하게.
      </BigCaption>
      <BigCaption top={1190} size={52} bg="#e8fbff" delay={128} width={780} rotate={-1}>
        부모: "냅두라고요?"
      </BigCaption>
      <div
        style={{
          ...baseFont,
          position: 'absolute',
          left: 92,
          bottom: 140,
          width: 896,
          color: colors.navy,
          fontSize: 42,
          lineHeight: 1.18,
          fontWeight: 850,
          textAlign: 'center',
          opacity: interpolate(local, [118, 142], [0, 1], clamp),
        }}
      >
        진짜 공부는, 시켜서 하는 게 아니라
        <br />
        스스로 움직일 때 시작됩니다.
      </div>
    </AbsoluteFill>
  );
};

const QuizPhone = ({progress = 0, mode = 'wrong'}) => {
  const choiceColor = mode === 'right' ? colors.green : colors.peach;
  return (
    <div
      style={{
        position: 'absolute',
        left: 165,
        top: 360,
        width: 750,
        height: 1080,
        borderRadius: 58,
        background: '#172033',
        padding: 24,
        boxShadow: '0 38px 80px rgba(23,32,51,0.35)',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 42,
          background: '#f7fbff',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div style={{height: 124, background: colors.blue, color: '#fff', padding: '34px 42px', ...baseFont}}>
          <div style={{fontSize: 36, fontWeight: 950}}>메타센스 퀴즈</div>
          <div style={{fontSize: 23, opacity: 0.88}}>내가 왜 틀렸는지 돌아보기</div>
        </div>
        <div style={{padding: 42, ...baseFont, color: colors.ink}}>
          <div style={{fontSize: 34, fontWeight: 900, marginBottom: 18}}>Q. 다음 식의 값은?</div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 950,
              background: '#fff3d8',
              borderRadius: 26,
              padding: '26px 30px',
              textAlign: 'center',
              border: '6px solid #ffd84d',
            }}
          >
            3/4 + 1/8
          </div>
          <div style={{marginTop: 36, display: 'grid', gap: 18}}>
            {['5/8', '7/8', '4/12'].map((item, idx) => (
              <div
                key={item}
                style={{
                  height: 86,
                  borderRadius: 24,
                  background: idx === 1 ? choiceColor : '#ffffff',
                  color: idx === 1 ? '#fff' : colors.ink,
                  border: '5px solid rgba(23,32,51,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 38,
                  fontWeight: 900,
                  transform: idx === 1 ? `scale(${1 + progress * 0.035})` : 'scale(1)',
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div style={{marginTop: 36, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16}}>
            <div style={{borderRadius: 22, background: '#e8fbff', padding: 20, fontSize: 28, fontWeight: 850}}>
              힌트 보기
            </div>
            <div style={{borderRadius: 22, background: '#e9ffef', padding: 20, fontSize: 28, fontWeight: 850}}>
              다시 도전
            </div>
          </div>
          <div
            style={{
              marginTop: 32,
              borderRadius: 26,
              background: '#ffffff',
              border: '5px solid rgba(23,32,51,0.08)',
              padding: 24,
              fontSize: 28,
              lineHeight: 1.28,
              fontWeight: 760,
            }}
          >
            분모를 같게 만들면
            <br />
            왜 7/8이 되는지 생각해봐요.
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductScene = () => {
  const frame = useCurrentFrame();
  const local = frame;
  const phoneScale = interpolate(local, [0, 22], [0.86, 1], clamp);
  const progress = pop(local, 30, 62);

  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <div style={{transform: `scale(${phoneScale})`, transformOrigin: 'center'}}>
        <QuizPhone progress={progress} mode={local > 110 ? 'right' : 'wrong'} />
      </div>
      <BigCaption top={120} size={76} bg={colors.yellow} delay={2}>
        그래서, 메타센스.
      </BigCaption>
      <BigCaption top={1450} size={49} bg="#172033" color="#ffffff" delay={78} width={900}>
        정답만 알려주는 공부?
        <br />
        아니요.
      </BigCaption>
      <BigCaption top={1640} size={45} bg="#ffffff" delay={134} width={930}>
        정답만 알려주는 공부가 아니라,
        <br />
        생각하게 만드는 공부.
      </BigCaption>
    </AbsoluteFill>
  );
};

const ChangeScene = () => {
  const frame = useCurrentFrame();
  const local = frame;
  const glow = interpolate(Math.sin(local / 8), [-1, 1], [0.72, 1], clamp);

  return (
    <AbsoluteFill>
      <Background />
      <Desk />
      <div style={{position: 'absolute', left: 390, bottom: 320, transform: `scale(${1 + glow * 0.02})`}}>
        <Face mood="happy" shirt={colors.green} />
      </div>
      <div style={{position: 'absolute', right: 70, top: 760, transform: 'scale(0.7) rotate(-6deg)'}}>
        <Face mood="wow" shirt={colors.peach} />
      </div>
      <BigCaption top={132} size={56} bg="#172033" color="#ffffff" delay={0}>
        시키는 공부 말고,
        <br />
        스스로 하는 공부.
      </BigCaption>
      <BigCaption top={380} size={54} bg="#ffffff" delay={44} rotate={-2} width={760}>
        아이: "어? 왜 틀렸지?"
      </BigCaption>
      <BigCaption top={560} size={58} bg="#e9ffef" delay={96} rotate={2} width={760}>
        "아하! 이거였네!"
      </BigCaption>
      <BigCaption top={742} size={60} bg="#fff0b8" delay={146} rotate={-1} width={760}>
        "한 문제만 더!"
      </BigCaption>
      <BigCaption top={1120} size={45} bg="#e8fbff" delay={198} width={830}>
        부모: "어... 내가 안 시켰는데?"
      </BigCaption>
      <div
        style={{
          ...baseFont,
          position: 'absolute',
          left: 90,
          bottom: 120,
          width: 900,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 18,
          opacity: interpolate(local, [210, 240], [0, 1], clamp),
        }}
      >
        {['다시 보고', '생각하고', '도전하는 아이'].map((item) => (
          <div
            key={item}
            style={{
              minHeight: 120,
              borderRadius: 26,
              background: colors.white,
              border: '5px solid rgba(23,32,51,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 18,
              color: colors.ink,
              fontSize: 36,
              lineHeight: 1.12,
              fontWeight: 950,
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const FamilyScene = () => {
  const frame = useCurrentFrame();
  const local = frame;
  return (
    <AbsoluteFill>
      <Background tone="cool" />
      <div style={{position: 'absolute', left: 130, bottom: 260, transform: 'scale(0.85)'}}>
        <Face mood="wow" shirt={colors.peach} />
      </div>
      <div style={{position: 'absolute', right: 150, bottom: 260, transform: 'scale(0.95)'}}>
        <Face mood="focused" shirt={colors.blue} />
      </div>
      <BigCaption top={190} size={66} bg="#ffffff" delay={8} rotate={-2}>
        우리 애가...
        <br />
        스스로 공부를?
      </BigCaption>
      <BigCaption top={570} size={56} bg="#172033" color="#ffffff" delay={72} rotate={2}>
        아이: "쉿.
        <br />
        지금 집중 중이야."
      </BigCaption>
      <BigCaption top={980} size={110} bg={colors.yellow} delay={118} rotate={-1}>
        냅둬유.
      </BigCaption>
      <BigCaption top={1235} size={60} bg="#ffffff" delay={150} width={880}>
        스스로 크는 중이니까.
      </BigCaption>
      <div
        style={{
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 90,
          height: 26,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${colors.blue}, ${colors.cyan}, ${colors.green})`,
          transform: `scaleX(${interpolate(local, [0, 190], [0.2, 1], clamp)})`,
          transformOrigin: 'left center',
        }}
      />
    </AbsoluteFill>
  );
};

const EndingScene = () => {
  const frame = useCurrentFrame();
  const local = frame;
  const brandScale = 0.82 + pop(local, 30, 10, 0.8) * 0.18;

  return (
    <AbsoluteFill>
      <Background tone="dark" />
      <div
        style={{
          ...baseFont,
          position: 'absolute',
          left: 80,
          right: 80,
          top: 260,
          color: colors.white,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontSize: 54,
            lineHeight: 1.15,
            fontWeight: 880,
            opacity: interpolate(local, [0, 24], [0, 1], clamp),
          }}
        >
          아이의 공부 감각을 깨우다
        </div>
        <div
          style={{
            marginTop: 120,
            fontSize: 150,
            lineHeight: 1,
            fontWeight: 1000,
            color: colors.white,
            textShadow: '0 18px 0 rgba(0,0,0,0.22)',
            transform: `scale(${brandScale})`,
          }}
        >
          메타센스
        </div>
        <div
          style={{
            marginTop: 38,
            display: 'inline-flex',
            padding: '24px 44px',
            borderRadius: 999,
            background: colors.yellow,
            color: colors.ink,
            fontSize: 66,
            fontWeight: 980,
            boxShadow: '0 18px 0 rgba(0,0,0,0.22)',
            opacity: interpolate(local, [38, 64], [0, 1], clamp),
          }}
        >
          msense.me
        </div>
      </div>
      <BigCaption top={1260} size={58} bg="#ffffff" color={colors.ink} delay={80} width={930}>
        냅둬유,
        <br />
        메타센스가 생각하게 합니다.
      </BigCaption>
      <div
        style={{
          ...baseFont,
          position: 'absolute',
          left: 92,
          right: 92,
          bottom: 110,
          color: '#dfeaff',
          fontSize: 38,
          lineHeight: 1.22,
          fontWeight: 760,
          textAlign: 'center',
          opacity: interpolate(local, [112, 140], [0, 1], clamp),
        }}
      >
        공부하라고 말하기 전에,
        <br />
        스스로 하게 만들어 주세요.
      </div>
    </AbsoluteFill>
  );
};

export const MetasensePromo = () => (
  <AbsoluteFill style={{background: '#ffffff'}}>
    <SoundBed />
    <Sequence from={scene.nagging} durationInFrames={180}>
      <NaggingScene />
    </Sequence>
    <Sequence from={scene.reversal} durationInFrames={180}>
      <ReversalScene />
    </Sequence>
    <Sequence from={scene.product} durationInFrames={240}>
      <ProductScene />
    </Sequence>
    <Sequence from={scene.change} durationInFrames={300}>
      <ChangeScene />
    </Sequence>
    <Sequence from={scene.family} durationInFrames={210}>
      <FamilyScene />
    </Sequence>
    <Sequence from={scene.ending} durationInFrames={150}>
      <EndingScene />
    </Sequence>
  </AbsoluteFill>
);
