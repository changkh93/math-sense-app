import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const font = {
  fontFamily:
    '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
};

const palette = {
  ink: '#0f172a',
  dusk: '#182235',
  night: '#0b1020',
  paper: '#f3ead8',
  warm: '#d7a766',
  gold: '#e7c06b',
  blue: '#7aa7ff',
  soft: '#e9edf7',
  white: '#ffffff',
};

const scenes = {
  open: 0,
  testimony: 300,
  distance: 760,
  realization: 1050,
  metasense: 1500,
  movement: 1820,
  phrase: 2220,
  ending: 2460,
};

const fade = (frame, start, end, from = 0, to = 1) =>
  interpolate(frame, [start, end], [from, to], clamp);

const inOut = (frame, start, midIn, midOut, end) =>
  interpolate(frame, [start, midIn, midOut, end], [0, 1, 1, 0], clamp);

const FilmGrain = () => {
  const frame = useCurrentFrame();
  const opacity = 0.06 + (frame % 5) * 0.006;
  return (
    <>
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          opacity,
          mixBlendMode: 'overlay',
          backgroundImage:
            'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.32) 0 1px, transparent 1px), radial-gradient(circle at 70% 50%, rgba(0,0,0,0.35) 0 1px, transparent 1px)',
          backgroundSize: '18px 18px, 23px 23px',
          transform: `translate(${frame % 3}px, ${frame % 4}px)`,
        }}
      />
      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 220px rgba(0,0,0,0.62)',
        }}
      />
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 86, background: '#050915'}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 86, background: '#050915'}} />
    </>
  );
};

const DocuAudio = () => (
  <>
    <Audio src={staticFile('metasense-promo/docu-sfx/room-tone.wav')} volume={0.22} loop />
    <Audio src={staticFile('metasense-promo/docu-sfx/low-piano.wav')} volume={0.58} />
    <Sequence from={1050}>
      <Audio src={staticFile('metasense-promo/docu-sfx/warm-strings.wav')} volume={0.48} />
    </Sequence>
    <Sequence from={1560}>
      <Audio src={staticFile('metasense-promo/docu-sfx/pencil.wav')} volume={0.48} />
    </Sequence>
    <Sequence from={1710}>
      <Audio src={staticFile('metasense-promo/docu-sfx/page.wav')} volume={0.36} />
    </Sequence>
    <Sequence from={1860}>
      <Audio src={staticFile('metasense-promo/docu-sfx/keys.wav')} volume={0.26} />
    </Sequence>
    <Sequence from={2220}>
      <Audio src={staticFile('metasense-promo/docu-sfx/breath-space.wav')} volume={0.45} />
    </Sequence>
    <Sequence from={2460}>
      <Audio src={staticFile('metasense-promo/docu-sfx/resolve.wav')} volume={0.54} />
    </Sequence>
  </>
);

const CinemaBg = ({tone = 'night'}) => {
  const frame = useCurrentFrame();
  const shift = Math.sin(frame / 90) * 20;
  const base =
    tone === 'warm'
      ? 'linear-gradient(135deg, #211b18 0%, #44301f 46%, #121827 100%)'
      : tone === 'paper'
        ? 'linear-gradient(135deg, #2a241d 0%, #57432e 48%, #172033 100%)'
        : 'linear-gradient(135deg, #050915 0%, #101827 52%, #1f2c46 100%)';
  return (
    <AbsoluteFill style={{background: base, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: -160 + shift,
          top: 120,
          width: 760,
          height: 760,
          borderRadius: '50%',
          background: tone === 'warm' ? 'rgba(231,192,107,0.17)' : 'rgba(122,167,255,0.12)',
          filter: 'blur(80px)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: -260 - shift,
          bottom: -140,
          width: 920,
          height: 740,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.30)',
          filter: 'blur(90px)',
        }}
      />
    </AbsoluteFill>
  );
};

const Caption = ({
  children,
  top,
  left = 140,
  width = 860,
  size = 56,
  delay = 0,
  end = 9999,
  color = palette.white,
  weight = 760,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [delay, delay + 22, end - 18, end], [0, 1, 1, 0], clamp);
  const y = interpolate(frame, [delay, delay + 30], [18, 0], clamp);
  return (
    <div
      style={{
        ...font,
        position: 'absolute',
        top,
        left,
        width,
        color,
        fontSize: size,
        lineHeight: 1.22,
        fontWeight: weight,
        letterSpacing: 0,
        opacity,
        transform: `translateY(${y}px)`,
        textShadow: '0 3px 18px rgba(0,0,0,0.55)',
      }}
    >
      {children}
    </div>
  );
};

const SmallLabel = ({children, top = 112, left = 142, delay = 0}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...font,
        position: 'absolute',
        top,
        left,
        color: 'rgba(255,255,255,0.62)',
        fontSize: 24,
        fontWeight: 650,
        letterSpacing: 0,
        opacity: fade(frame, delay, delay + 24),
      }}
    >
      {children}
    </div>
  );
};

const InterviewText = ({quote, role, from, to, side = 'left'}) => {
  const frame = useCurrentFrame();
  const opacity = inOut(frame, from, from + 26, to - 20, to);
  const x = side === 'left' ? 130 : 1030;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: 252,
        width: 760,
        opacity,
        transform: `translateY(${interpolate(frame, [from, from + 35], [18, 0], clamp)}px)`,
      }}
    >
      <div
        style={{
          ...font,
          color: 'rgba(255,255,255,0.58)',
          fontSize: 25,
          fontWeight: 650,
          marginBottom: 22,
        }}
      >
        {role}
      </div>
      <div
        style={{
          ...font,
          color: palette.white,
          fontSize: 54,
          lineHeight: 1.22,
          fontWeight: 820,
          textShadow: '0 4px 20px rgba(0,0,0,0.55)',
        }}
      >
        "{quote}"
      </div>
    </div>
  );
};

const Silhouette = ({left, top, scale = 1, warm = false, opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: 360 * scale,
      height: 500 * scale,
      opacity,
      filter: 'drop-shadow(0 22px 42px rgba(0,0,0,0.45))',
    }}
  >
    <div
      style={{
        position: 'absolute',
        left: 120 * scale,
        top: 12 * scale,
        width: 150 * scale,
        height: 150 * scale,
        borderRadius: '50%',
        background: warm ? '#c9976d' : '#263249',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 74 * scale,
        top: 145 * scale,
        width: 260 * scale,
        height: 320 * scale,
        borderRadius: `${90 * scale}px ${90 * scale}px ${38 * scale}px ${38 * scale}px`,
        background: warm ? '#7a4c31' : '#172033',
      }}
    />
    <div
      style={{
        position: 'absolute',
        left: 155 * scale,
        top: 76 * scale,
        width: 82 * scale,
        height: 10 * scale,
        borderRadius: 999,
        background: 'rgba(255,255,255,0.14)',
      }}
    />
  </div>
);

const DeskStill = ({mode = 'closed'}) => {
  const frame = useCurrentFrame();
  const push = interpolate(frame, [0, 2700], [1, 1.07], clamp);
  return (
    <AbsoluteFill style={{transform: `scale(${push})`, transformOrigin: 'center'}}>
      <div
        style={{
          position: 'absolute',
          left: 220,
          top: 210,
          width: 1180,
          height: 590,
          borderRadius: 28,
          background: 'linear-gradient(135deg, #4a3424, #251b16)',
          boxShadow: '0 38px 100px rgba(0,0,0,0.45)',
          transform: 'rotate(-2deg)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 380,
          top: 285,
          width: 620,
          height: 390,
          borderRadius: 14,
          background: palette.paper,
          boxShadow: '0 16px 36px rgba(0,0,0,0.30)',
          transform: 'rotate(3deg)',
        }}
      >
        {Array.from({length: 8}).map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: 48,
              right: 48,
              top: 54 + i * 39,
              height: 2,
              background: 'rgba(30,41,59,0.16)',
            }}
          />
        ))}
        <div
          style={{
            ...font,
            position: 'absolute',
            left: 56,
            top: 44,
            color: 'rgba(15,23,42,0.50)',
            fontSize: 28,
            fontWeight: 760,
          }}
        >
          수학 오답 노트
        </div>
        <div
          style={{
            position: 'absolute',
            left: 210,
            top: 168,
            width: 230,
            height: 38,
            borderTop: '8px solid rgba(15,23,42,0.28)',
            borderRadius: '50%',
            transform: 'rotate(-8deg)',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          right: 300,
          top: 330,
          width: 170,
          height: 170,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.10)',
          border: '10px solid rgba(255,255,255,0.16)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 1020,
          top: 600,
          width: 260,
          height: 20,
          borderRadius: 999,
          background: '#141923',
          transform: 'rotate(-18deg)',
        }}
      />
      {mode === 'door' ? (
        <div
          style={{
            position: 'absolute',
            right: 135,
            top: 180,
            width: 420,
            height: 620,
            background: 'linear-gradient(90deg, #202a3e, #0f172a)',
            boxShadow: '-28px 0 80px rgba(0,0,0,0.4)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: 46,
              top: 320,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: palette.gold,
            }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const OpenScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <CinemaBg />
      <DeskStill />
      <SmallLabel delay={24}>학부모 고민을 바탕으로 재구성한 인터뷰형 브랜드 필름</SmallLabel>
      <Caption top={360} left={142} width={950} size={54} delay={45} end={182}>
        아이에게 공부하라고 말하는 일이...
        <br />
        언제부터 이렇게 어려워졌을까요.
      </Caption>
      <InterviewText
        from={190}
        to={296}
        role="초등학교 6학년 자녀를 둔 어머니"
        quote="공부를 안 하는 아이는 아닌데요... 혼자서는 안 해요."
      />
      <div style={{position: 'absolute', right: 200, bottom: 20, opacity: fade(frame, 160, 220, 0, 0.52)}}>
        <Silhouette left={0} top={0} scale={1.25} />
      </div>
      <FilmGrain />
    </AbsoluteFill>
  );
};

const TestimonyScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <CinemaBg />
      <DeskStill />
      <div style={{position: 'absolute', right: 150, bottom: 18, opacity: 0.5}}>
        <Silhouette left={0} top={0} scale={1.2} />
      </div>
      <InterviewText from={20} to={125} role="초등학교 4학년 남학생의 어머니" quote="수학 문제만 보면 표정이 딱 굳어요." />
      <InterviewText from={132} to={235} role="중학교 2학년 여학생의 어머니" quote="틀리면 다시 생각하는 게 아니라, 그냥 덮어버려요." side="right" />
      <InterviewText from={242} to={345} role="중학교 1학년 남학생의 어머니" quote="학교 가기 싫다고 말한 날도 있었어요." />
      <InterviewText from={352} to={456} role="맞벌이 어머니" quote="퇴근하고 오면 저도 지쳐 있는데, 또 공부 얘기를 하게 돼요." side="right" />
      <Caption top={820} left={142} width={920} size={34} delay={80} end={456} color="rgba(255,255,255,0.66)" weight={640}>
        말하지 않는 순간의 표정이, 더 오래 남습니다.
      </Caption>
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 142,
          bottom: 118,
          color: 'rgba(255,255,255,0.52)',
          fontSize: 24,
          opacity: fade(frame, 24, 60),
        }}
      >
        reconstructed interviews / real concerns
      </div>
      <FilmGrain />
    </AbsoluteFill>
  );
};

const DistanceScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <CinemaBg />
      <DeskStill mode="door" />
      <Caption top={290} left={142} width={760} size={58} delay={0} end={150}>
        공부는 해야 하는데
        <br />
        아이 마음은 점점 멀어지고
      </Caption>
      <Caption top={520} left={142} width={720} size={52} delay={130} end={285} color={palette.gold}>
        부모의 말은
        <br />
        잔소리가 됩니다.
      </Caption>
      <InterviewText from={305} to={520} role="초등학교 6학년 자녀를 둔 어머니" quote="저도 잔소리하고 싶어서 하는 게 아니거든요. 불안해서 하는 거죠." />
      <div
        style={{
          position: 'absolute',
          right: 360,
          top: 420,
          width: 220,
          height: 80,
          borderRadius: 40,
          background: 'rgba(255,255,255,0.05)',
          opacity: inOut(frame, 250, 280, 520, 560),
        }}
      />
      <FilmGrain />
    </AbsoluteFill>
  );
};

const RealizationScene = () => (
  <AbsoluteFill>
    <CinemaBg tone="paper" />
    <DeskStill />
    <InterviewText from={25} to={145} role="중학교 2학년 자녀를 둔 어머니" quote="제가 더 세게 말하면 될 줄 알았어요." />
    <InterviewText from={158} to={274} role="같은 어머니" quote="그런데 아니더라고요." side="right" />
    <Caption top={360} left={170} width={840} size={60} delay={295} end={440}>
      아이에게 필요한 건
      <br />
      더 많은 지시가 아니라
    </Caption>
    <Caption top={566} left={170} width={900} size={62} delay={390} end={495} color={palette.gold}>
      다시 생각해볼 수 있는 시간.
    </Caption>
    <FilmGrain />
  </AbsoluteFill>
);

const AppScreen = ({from = 0}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [from, from + 240], [28, 74], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        right: 185,
        top: 145,
        width: 640,
        height: 760,
        borderRadius: 34,
        background: '#111827',
        padding: 18,
        boxShadow: '0 40px 110px rgba(0,0,0,0.46)',
      }}
    >
      <div style={{height: '100%', borderRadius: 24, background: '#f8fafc', overflow: 'hidden', ...font}}>
        <div style={{height: 96, background: '#1f4fbf', color: palette.white, padding: '22px 30px'}}>
          <div style={{fontSize: 30, fontWeight: 900}}>메타센스</div>
          <div style={{fontSize: 17, opacity: 0.84}}>오늘의 생각 기록</div>
        </div>
        <div style={{padding: 30, color: palette.ink}}>
          <div style={{fontSize: 26, fontWeight: 900}}>틀린 문제를 다시 열었습니다.</div>
          <div
            style={{
              marginTop: 18,
              borderRadius: 18,
              background: '#fff5d7',
              padding: 22,
              fontSize: 38,
              fontWeight: 900,
              textAlign: 'center',
            }}
          >
            3/4 + 1/8 = ?
          </div>
          <div style={{marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
            {['힌트 보기', '다시 도전'].map((item, index) => (
              <div
                key={item}
                style={{
                  borderRadius: 16,
                  background: index === 1 ? '#dceafe' : '#ffffff',
                  border: '2px solid #d7deeb',
                  padding: 16,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div style={{marginTop: 28, color: '#475569', fontSize: 21, lineHeight: 1.35, fontWeight: 650}}>
            정답만 알려주는 공부 말고,
            <br />
            생각하게 만드는 공부.
          </div>
          <div style={{marginTop: 28, height: 16, borderRadius: 999, background: '#dbe4f4'}}>
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #3b82f6, #e7c06b)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MetasenseScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <CinemaBg tone="warm" />
      <div style={{position: 'absolute', left: 170, top: 238, opacity: 0.7}}>
        <Silhouette left={0} top={0} scale={1.0} warm />
      </div>
      <AppScreen from={0} />
      <Caption top={164} left={150} width={690} size={54} delay={20} end={180}>
        시키는 공부에서
        <br />
        생각하는 공부로
      </Caption>
      <Caption top={694} left={150} width={720} size={35} delay={160} end={315} color="rgba(255,255,255,0.68)" weight={650}>
        메타센스는 아이에게 정답을 떠먹여 주지 않습니다.
        <br />
        스스로 생각하고, 다시 보고, 도전하게 합니다.
      </Caption>
      <div
        style={{
          position: 'absolute',
          left: 458,
          top: 680,
          width: 135,
          height: 18,
          borderRadius: 999,
          background: '#1a1f2e',
          transform: `rotate(${interpolate(frame, [0, 320], [-12, 1], clamp)}deg)`,
          opacity: 0.82,
        }}
      />
      <FilmGrain />
    </AbsoluteFill>
  );
};

const MovementScene = () => (
  <AbsoluteFill>
    <CinemaBg tone="warm" />
    <DeskStill />
    <Caption top={188} left={142} width={740} size={48} delay={10} end={145}>
      아이: "잠깐만...
      <br />
      왜 틀렸지?"
    </Caption>
    <Caption top={405} left={142} width={720} size={48} delay={142} end={276}>
      아이: "아,
      <br />
      이거 다시 해볼래."
    </Caption>
    <Caption top={625} left={142} width={760} size={48} delay={270} end={410} color={palette.gold}>
      아이: "엄마,
      <br />
      나 이거 하나만 더 하고."
    </Caption>
    <InterviewText from={412} to={640} role="초등학교 6학년 자녀를 둔 어머니" quote="처음엔 별거 아닌 줄 알았어요. 그런데 아이가 다시 보더라고요." side="right" />
    <FilmGrain />
  </AbsoluteFill>
);

const PhraseScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <CinemaBg />
      <DeskStill mode="door" />
      <div
        style={{
          position: 'absolute',
          left: 150,
          top: 245,
          opacity: interpolate(frame, [0, 80], [0, 0.58], clamp),
        }}
      >
        <Silhouette left={0} top={0} scale={1.08} />
      </div>
      <Caption top={305} left={700} width={740} size={80} delay={18} end={250} color={palette.white} weight={900}>
        냅둬유.
      </Caption>
      <Caption top={460} left={700} width={760} size={52} delay={92} end={355} color={palette.gold}>
        스스로 알아서 하게.
      </Caption>
      <Caption top={680} left={700} width={820} size={32} delay={156} end={430} color="rgba(255,255,255,0.62)" weight={620}>
        방치가 아닙니다.
        <br />
        아이 안의 생각하는 힘을 믿는 것입니다.
      </Caption>
      <FilmGrain />
    </AbsoluteFill>
  );
};

const EndingScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <CinemaBg tone="warm" />
      <Caption top={208} left={190} width={900} size={58} delay={12} end={165}>
        시키는 공부 말고
        <br />
        스스로 하는 공부
      </Caption>
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 190,
          top: 452,
          color: palette.white,
          fontSize: 110,
          lineHeight: 1,
          fontWeight: 920,
          opacity: fade(frame, 70, 105),
          textShadow: '0 8px 34px rgba(0,0,0,0.44)',
        }}
      >
        메타센스
      </div>
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 198,
          top: 592,
          color: palette.gold,
          fontSize: 48,
          fontWeight: 820,
          opacity: fade(frame, 100, 130),
        }}
      >
        msense.me
      </div>
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 190,
          bottom: 142,
          color: 'rgba(255,255,255,0.66)',
          fontSize: 33,
          fontWeight: 650,
          opacity: fade(frame, 150, 190),
        }}
      >
        스스로 생각하는 공부가 다시 움직입니다.
      </div>
      <FilmGrain />
    </AbsoluteFill>
  );
};

export const MetasenseDocuBrandFilm = () => (
  <AbsoluteFill style={{background: palette.night}}>
    <DocuAudio />
    <Sequence from={scenes.open} durationInFrames={300}>
      <OpenScene />
    </Sequence>
    <Sequence from={scenes.testimony} durationInFrames={460}>
      <TestimonyScene />
    </Sequence>
    <Sequence from={scenes.distance} durationInFrames={290}>
      <DistanceScene />
    </Sequence>
    <Sequence from={scenes.realization} durationInFrames={450}>
      <RealizationScene />
    </Sequence>
    <Sequence from={scenes.metasense} durationInFrames={320}>
      <MetasenseScene />
    </Sequence>
    <Sequence from={scenes.movement} durationInFrames={400}>
      <MovementScene />
    </Sequence>
    <Sequence from={scenes.phrase} durationInFrames={240}>
      <PhraseScene />
    </Sequence>
    <Sequence from={scenes.ending} durationInFrames={240}>
      <EndingScene />
    </Sequence>
  </AbsoluteFill>
);
