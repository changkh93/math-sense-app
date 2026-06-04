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

const C = {
  ink: '#121827',
  navy: '#17264d',
  blue: '#246bff',
  cyan: '#1ccfff',
  yellow: '#ffd633',
  red: '#ff365c',
  orange: '#ff8b3d',
  green: '#28d878',
  white: '#ffffff',
  cream: '#fff7df',
};

const font = {
  fontFamily:
    '"Apple SD Gothic Neo", "Pretendard", "Noto Sans KR", system-ui, sans-serif',
};

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
};

const s = {
  hook: 0,
  fail: 120,
  freeze: 300,
  product: 420,
  shock: 660,
  ending: 840,
};

const pop = (frame, fps, start = 0, stiffness = 190) =>
  spring({
    frame: frame - start,
    fps,
    config: {damping: 10, mass: 0.55, stiffness},
  });

const thudScale = (frame, fps, start) => 0.78 + pop(frame, fps, start, 230) * 0.22;

const MemeAudio = () => (
  <>
    <Audio src={staticFile('metasense-promo/remote-sfx/panic-bed.wav')} volume={0.55} />
    <Sequence from={420}>
      <Audio src={staticFile('metasense-promo/remote-sfx/relief-bed.wav')} volume={0.46} />
    </Sequence>
    {[85, 132, 172, 214, 246].map((from) => (
      <Sequence key={`beep-${from}`} from={from}>
        <Audio src={staticFile('metasense-promo/remote-sfx/remote-beep.wav')} volume={1.35} />
      </Sequence>
    ))}
    {[152, 202, 258].map((from) => (
      <Sequence key={`error-${from}`} from={from}>
        <Audio src={staticFile('metasense-promo/remote-sfx/error-buzz.wav')} volume={1.1} />
      </Sequence>
    ))}
    <Sequence from={298}>
      <Audio src={staticFile('metasense-promo/remote-sfx/tape-stop.wav')} volume={1.2} />
    </Sequence>
    <Sequence from={334}>
      <Audio src={staticFile('metasense-promo/remote-sfx/deep-hit.wav')} volume={1.35} />
    </Sequence>
    {[428, 488, 548, 612, 672, 744, 850, 920].map((from) => (
      <Sequence key={`pop-${from}`} from={from}>
        <Audio src={staticFile('metasense-promo/remote-sfx/bouncy-pop.wav')} volume={1.05} />
      </Sequence>
    ))}
    <Sequence from={620}>
      <Audio src={staticFile('metasense-promo/remote-sfx/success-rise.wav')} volume={1.05} />
    </Sequence>
    <Sequence from={840}>
      <Audio src={staticFile('metasense-promo/remote-sfx/final-switch.wav')} volume={1.15} />
    </Sequence>
  </>
);

const Bg = ({mode = 'home'}) => {
  const frame = useCurrentFrame();
  const wobble = Math.sin(frame / 13) * 14;
  const grad =
    mode === 'panic'
      ? 'linear-gradient(160deg, #fff0f2 0%, #ffe9d6 48%, #eef7ff 100%)'
      : mode === 'freeze'
        ? 'linear-gradient(160deg, #f7fbff 0%, #dff6ff 56%, #ffffff 100%)'
        : mode === 'dark'
          ? 'linear-gradient(160deg, #10192f 0%, #17386e 62%, #111827 100%)'
          : 'linear-gradient(160deg, #fff5d6 0%, #e8fbff 58%, #f9fff1 100%)';

  return (
    <AbsoluteFill style={{background: grad, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(18,24,39,0.045) 2px, transparent 2px), linear-gradient(90deg, rgba(18,24,39,0.045) 2px, transparent 2px)',
          backgroundSize: '76px 76px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 540,
          height: 920,
          left: -170,
          top: 250 + wobble,
          transform: 'rotate(-10deg)',
          background: mode === 'panic' ? 'rgba(255,54,92,0.12)' : 'rgba(36,107,255,0.1)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 520,
          height: 760,
          right: -120,
          bottom: 60 - wobble,
          transform: 'rotate(14deg)',
          background: mode === 'dark' ? 'rgba(255,214,51,0.11)' : 'rgba(255,214,51,0.22)',
        }}
      />
    </AbsoluteFill>
  );
};

const CardText = ({
  children,
  top,
  size = 70,
  bg = C.white,
  color = C.ink,
  delay = 0,
  rotate = 0,
  width = 900,
  border = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = thudScale(frame, fps, delay);
  const opacity = interpolate(frame, [delay, delay + 7], [0, 1], clamp);
  return (
    <div
      style={{
        ...font,
        position: 'absolute',
        top,
        left: (1080 - width) / 2,
        width,
        padding: '24px 32px',
        borderRadius: 28,
        background: bg,
        color,
        fontSize: size,
        fontWeight: 1000,
        lineHeight: 1.08,
        textAlign: 'center',
        border: border ? `7px solid ${C.ink}` : 'none',
        boxShadow: '0 18px 0 rgba(18,24,39,0.20), 0 28px 60px rgba(18,24,39,0.20)',
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      {children}
    </div>
  );
};

const Face = ({mood = 'boss', shirt = C.blue, size = 220}) => {
  const mouth =
    mood === 'tired'
      ? {width: 70, height: 26, borderTop: `9px solid ${C.ink}`, borderRadius: '50%'}
      : mood === 'shock'
        ? {width: 48, height: 48, border: `9px solid ${C.ink}`, borderRadius: '50%'}
        : mood === 'focus'
          ? {width: 82, height: 22, borderTop: `8px solid ${C.ink}`, borderRadius: '50%', transform: 'translateX(-50%) rotate(180deg)'}
          : {width: 82, height: 40, borderBottom: `9px solid ${C.ink}`, borderRadius: '50%'};
  const brow = mood === 'boss' || mood === 'shock';

  return (
    <div style={{position: 'relative', width: size, height: size + 170}}>
      <div
        style={{
          position: 'absolute',
          left: size * 0.13,
          top: size * 0.78,
          width: size * 0.74,
          height: 170,
          background: shirt,
          borderRadius: '48px 48px 22px 22px',
          boxShadow: 'inset 0 -18px rgba(18,24,39,0.14)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          background: '#ffd0b2',
          border: `8px solid ${C.ink}`,
          boxShadow: '0 15px 0 rgba(18,24,39,0.14)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: size * 0.27,
            top: size * 0.39,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: C.ink,
            boxShadow: `${size * 0.32}px 0 ${C.ink}`,
          }}
        />
        {brow ? (
          <>
            <div
              style={{
                position: 'absolute',
                left: size * 0.18,
                top: size * 0.28,
                width: 76,
                height: 9,
                borderRadius: 99,
                background: C.ink,
                transform: mood === 'shock' ? 'rotate(12deg)' : 'rotate(-15deg)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: size * 0.18,
                top: size * 0.28,
                width: 76,
                height: 9,
                borderRadius: 99,
                background: C.ink,
                transform: mood === 'shock' ? 'rotate(-12deg)' : 'rotate(15deg)',
              }}
            />
          </>
        ) : null}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: size * 0.63,
            transform: 'translateX(-50%)',
            ...mouth,
          }}
        />
      </div>
    </div>
  );
};

const Remote = ({pressed = -1, angry = false}) => {
  const buttons = ['공부 시작', '집중', '오답 확인', '문제 하나 더', '핸드폰 끄기', '시험 잘 보기'];
  return (
    <div
      style={{
        position: 'absolute',
        width: 410,
        height: 820,
        left: 335,
        top: 690,
        borderRadius: 68,
        background: angry ? '#2b1722' : '#1b2237',
        border: `9px solid ${C.ink}`,
        boxShadow: '0 36px 0 rgba(18,24,39,0.34)',
        padding: 36,
      }}
    >
      <div
        style={{
          ...font,
          height: 96,
          borderRadius: 30,
          background: '#89f2ff',
          color: C.ink,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 1000,
          fontSize: 34,
          marginBottom: 28,
          boxShadow: 'inset 0 -10px rgba(18,24,39,0.12)',
        }}
      >
        STUDY CTRL
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18}}>
        {buttons.map((label, i) => {
          const isPressed = i === pressed;
          return (
            <div
              key={label}
              style={{
                ...font,
                minHeight: 118,
                borderRadius: 26,
                background: isPressed ? C.red : i % 2 ? C.yellow : C.white,
                color: C.ink,
                border: `5px solid ${C.ink}`,
                boxShadow: isPressed ? '0 3px 0 rgba(18,24,39,0.8)' : '0 12px 0 rgba(18,24,39,0.35)',
                transform: isPressed ? 'translateY(9px) scale(0.97)' : 'translateY(0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: 12,
                fontSize: label.length > 5 ? 25 : 31,
                lineHeight: 1.08,
                fontWeight: 980,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 150,
          bottom: 30,
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: C.red,
          border: `7px solid ${C.ink}`,
          boxShadow: '0 14px 0 rgba(18,24,39,0.36)',
        }}
      />
    </div>
  );
};

const Alert = ({text, top, left, delay, bg = C.red, rotate = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = thudScale(frame, fps, delay);
  const opacity = interpolate(frame, [delay, delay + 4, delay + 78, delay + 90], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        ...font,
        position: 'absolute',
        top,
        left,
        width: 520,
        padding: '22px 26px',
        borderRadius: 18,
        background: bg,
        color: C.white,
        fontSize: 48,
        lineHeight: 1.08,
        fontWeight: 1000,
        border: `6px solid ${C.ink}`,
        boxShadow: '0 12px 0 rgba(18,24,39,0.25)',
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      }}
    >
      <div style={{fontSize: 24, opacity: 0.82, marginBottom: 8}}>SYSTEM ERROR</div>
      {text}
    </div>
  );
};

const GlitchText = ({children, top, delay = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const shake = Math.sin(frame * 2.8) * 8;
  const scale = thudScale(frame, fps, delay);
  const opacity = interpolate(frame, [delay, delay + 8], [0, 1], clamp);
  return (
    <div
      style={{
        ...font,
        position: 'absolute',
        top,
        left: 80,
        right: 80,
        color: C.white,
        fontSize: 178,
        lineHeight: 1,
        fontWeight: 1000,
        textAlign: 'center',
        textShadow: `${shake}px 0 ${C.red}, ${-shake}px 0 ${C.cyan}, 0 18px 0 rgba(0,0,0,0.24)`,
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      {children}
    </div>
  );
};

const HookScene = () => {
  const frame = useCurrentFrame();
  const pressed = frame > 82 ? 0 : -1;
  const zoom = interpolate(frame, [0, 105], [1, 1.07], clamp);
  return (
    <AbsoluteFill style={{transform: `scale(${zoom})`}}>
      <Bg />
      <CardText top={110} size={58} bg={C.yellow} delay={3} rotate={-2}>
        아이 공부시키는
        <br />
        비밀병기?
      </CardText>
      <div style={{position: 'absolute', left: 86, top: 580, transform: 'scale(0.82) rotate(-6deg)'}}>
        <Face mood="boss" shirt={C.orange} />
      </div>
      <Remote pressed={pressed} />
      <CardText top={1510} size={50} bg={C.ink} color={C.white} delay={82} width={820}>
        부모: "자, 공부 시작 버튼!"
      </CardText>
      <CardText top={1015} size={82} bg={C.red} color={C.white} delay={88} width={330} rotate={8} border>
        삑!
      </CardText>
    </AbsoluteFill>
  );
};

const FailScene = () => {
  const frame = useCurrentFrame();
  const pressed = frame < 36 ? 1 : frame < 78 ? 2 : frame < 120 ? 3 : 4;
  const shake = Math.sin(frame * 1.9) * interpolate(frame, [0, 180], [4, 22], clamp);
  const redFlash = frame % 18 < 7 ? 0.18 : 0;
  return (
    <AbsoluteFill style={{transform: `translate(${shake}px, ${-shake * 0.35}px)`}}>
      <Bg mode="panic" />
      <div style={{position: 'absolute', left: 92, bottom: 230, transform: 'scale(0.88)'}}>
        <Face mood="boss" shirt={C.orange} />
      </div>
      <div style={{position: 'absolute', right: 128, bottom: 260, transform: 'scale(0.94) rotate(2deg)'}}>
        <Face mood="tired" shirt={C.blue} />
      </div>
      <Remote pressed={pressed} angry />
      <CardText top={96} size={54} bg={C.ink} color={C.white} delay={0} width={880}>
        부모 리모컨 연타 중
      </CardText>
      <Alert text="학습 의욕 -10" top={250} left={72} delay={24} rotate={-4} />
      <Alert text="집중력 오류" top={470} left={500} delay={64} bg="#8b35ff" rotate={5} />
      <Alert text="잔소리 감지" top={705} left={72} delay={102} bg={C.orange} rotate={-3} />
      <Alert text="강제 종료 위기" top={930} left={504} delay={132} bg="#111827" rotate={4} />
      <CardText top={1450} size={48} bg={C.white} delay={146} width={860} rotate={-2}>
        아이: "아... 더 하기 싫어졌어."
      </CardText>
      <AbsoluteFill style={{background: `rgba(255, 54, 92, ${redFlash})`}} />
    </AbsoluteFill>
  );
};

const FreezeScene = () => {
  const frame = useCurrentFrame();
  const blink = frame < 28 ? frame % 8 < 4 : false;
  return (
    <AbsoluteFill>
      <Bg mode="dark" />
      {blink ? <AbsoluteFill style={{background: '#ffffff', opacity: 0.7}} /> : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 3px, transparent 3px, transparent 9px)',
        }}
      />
      <GlitchText top={360} delay={32}>
        냅둬유.
      </GlitchText>
      <CardText top={730} size={58} bg={C.white} color={C.ink} delay={76} width={900}>
        아이 공부는
        <br />
        리모컨으로 안 됩니다.
      </CardText>
      <CardText top={1010} size={45} bg={C.yellow} color={C.ink} delay={105} width={850} rotate={-1}>
        냅둬유, 스스로 알아서 하게.
      </CardText>
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 90,
          right: 90,
          bottom: 150,
          color: '#e5efff',
          fontSize: 38,
          fontWeight: 780,
          lineHeight: 1.2,
          textAlign: 'center',
          opacity: interpolate(frame, [58, 88], [0, 1], clamp),
        }}
      >
        진짜 공부는 조종이 아니라,
        <br />
        스스로 움직일 때 시작됩니다.
      </div>
    </AbsoluteFill>
  );
};

const AppPanel = ({active = 0}) => (
  <div
    style={{
      position: 'absolute',
      left: 115,
      top: 345,
      width: 850,
      height: 1030,
      borderRadius: 52,
      background: C.ink,
      padding: 22,
      boxShadow: '0 34px 90px rgba(18,24,39,0.32)',
    }}
  >
    <div style={{position: 'relative', height: '100%', borderRadius: 36, background: '#f7fbff', overflow: 'hidden'}}>
      <div style={{height: 124, background: `linear-gradient(90deg, ${C.blue}, ${C.cyan})`, padding: '28px 36px', ...font, color: C.white}}>
        <div style={{fontSize: 38, fontWeight: 1000}}>메타센스</div>
        <div style={{fontSize: 23, fontWeight: 750, opacity: 0.9}}>생각 스위치 ON</div>
      </div>
      <div style={{padding: 34, ...font, color: C.ink}}>
        <div style={{fontSize: 34, fontWeight: 950, marginBottom: 16}}>Q. 왜 틀렸을까?</div>
        <div
          style={{
            borderRadius: 26,
            background: '#fff1c6',
            border: `6px solid ${C.yellow}`,
            padding: '26px 24px',
            fontSize: 58,
            fontWeight: 1000,
            textAlign: 'center',
          }}
        >
          3/4 + 1/8 = ?
        </div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24}}>
          {['힌트 보기', '다시 도전'].map((label, i) => (
            <div
              key={label}
              style={{
                borderRadius: 22,
                background: active === i ? C.green : C.white,
                border: `5px solid ${active === i ? C.ink : 'rgba(18,24,39,0.12)'}`,
                padding: '20px 14px',
                textAlign: 'center',
                fontSize: 30,
                fontWeight: 950,
                transform: active === i ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {label}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 24,
            borderRadius: 28,
            background: C.white,
            border: '5px solid rgba(18,24,39,0.1)',
            padding: 24,
            fontSize: 31,
            lineHeight: 1.24,
            fontWeight: 820,
          }}
        >
          분모를 같게 만들면
          <br />
          생각이 보입니다.
        </div>
        <div style={{marginTop: 26, height: 42, borderRadius: 999, background: '#dbe7ff', overflow: 'hidden'}}>
          <div
            style={{
              width: `${48 + active * 22}%`,
              height: '100%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${C.green}, ${C.cyan})`,
            }}
          />
        </div>
        <div style={{display: 'flex', gap: 14, marginTop: 20}}>
          {['오답 피드백', '생각 정리', '진행률'].map((tag) => (
            <div
              key={tag}
              style={{
                borderRadius: 999,
                background: '#edf4ff',
                padding: '12px 16px',
                fontSize: 24,
                fontWeight: 850,
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ProductScene = () => {
  const frame = useCurrentFrame();
  const active = frame < 90 ? 0 : 1;
  const phoneScale = interpolate(frame, [0, 24], [0.82, 1], clamp);
  return (
    <AbsoluteFill>
      <Bg />
      <div style={{transform: `scale(${phoneScale})`, transformOrigin: 'center'}}>
        <AppPanel active={active} />
      </div>
      <CardText top={95} size={66} bg={C.yellow} delay={3} rotate={-2}>
        그래서,
        <br />
        메타센스.
      </CardText>
      <CardText top={1410} size={42} bg={C.ink} color={C.white} delay={70} width={900}>
        정답만 알려주는 공부 말고
        <br />
        생각하게 만드는 공부
      </CardText>
      <CardText top={1585} size={43} bg={C.white} delay={128} width={780} rotate={2}>
        아이: "한 문제만 더."
      </CardText>
    </AbsoluteFill>
  );
};

const ShockScene = () => {
  const frame = useCurrentFrame();
  const parentMove = interpolate(frame, [0, 120], [0, -95], clamp);
  return (
    <AbsoluteFill>
      <Bg mode="freeze" />
      <div style={{position: 'absolute', left: 110 + parentMove, bottom: 250, transform: 'scale(0.9) rotate(-5deg)'}}>
        <Face mood="shock" shirt={C.orange} />
      </div>
      <div style={{position: 'absolute', right: 150, bottom: 250, transform: 'scale(1.02)'}}>
        <Face mood="focus" shirt={C.blue} />
      </div>
      <CardText top={135} size={61} bg={C.white} delay={0} rotate={-2}>
        어?
        <br />
        내가 안 눌렀는데?
      </CardText>
      <CardText top={490} size={55} bg={C.ink} color={C.white} delay={82} width={820} rotate={2}>
        아이: "쉿.
        <br />
        지금 내가 하는 중이야."
      </CardText>
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 135,
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 16,
        }}
      >
        {['시키지 않았는데', '다시 보고', '생각하고', '도전한다'].map((text, i) => (
          <div
            key={text}
            style={{
              height: 92,
              borderRadius: 24,
              background: i % 2 ? C.yellow : C.white,
              color: C.ink,
              border: `5px solid ${C.ink}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 48,
              fontWeight: 1000,
              boxShadow: '0 10px 0 rgba(18,24,39,0.18)',
              opacity: interpolate(frame, [92 + i * 16, 104 + i * 16], [0, 1], clamp),
              transform: `translateX(${interpolate(frame, [92 + i * 16, 112 + i * 16], [120, 0], clamp)}px)`,
            }}
          >
            {text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Toggle = ({label, on, top, delay}) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [delay, delay + 24], [0, on ? 86 : 0], clamp);
  return (
    <div
      style={{
        ...font,
        position: 'absolute',
        top,
        left: 155,
        width: 770,
        height: 108,
        borderRadius: 999,
        background: on ? C.green : '#34405e',
        border: `6px solid ${C.white}`,
        boxShadow: '0 16px 0 rgba(0,0,0,0.22)',
        color: C.white,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 44,
        fontWeight: 1000,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 14 + x,
          width: 82,
          height: 82,
          borderRadius: '50%',
          background: C.white,
          boxShadow: '0 8px 0 rgba(0,0,0,0.18)',
        }}
      />
      {label}
    </div>
  );
};

const EndingScene = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Bg mode="dark" />
      <CardText top={82} size={92} bg={C.yellow} delay={0} width={850} rotate={-2}>
        냅둬유.
      </CardText>
      <CardText top={285} size={55} bg={C.white} delay={32} width={870}>
        스스로 알아서 하게.
      </CardText>
      <CardText top={505} size={42} bg={C.ink} color={C.white} delay={64} width={870}>
        부모: "그럼... 진짜 냅둬유?"
        <br />
        아이: "응. 메타센스 켜놔유."
      </CardText>
      <Toggle label="공부 잔소리 OFF" on={false} top={830} delay={88} />
      <Toggle label="생각 스위치 ON" on top={970} delay={112} />
      <div
        style={{
          ...font,
          position: 'absolute',
          left: 80,
          right: 80,
          bottom: 225,
          color: C.white,
          textAlign: 'center',
        }}
      >
        <div style={{fontSize: 56, fontWeight: 900, opacity: interpolate(frame, [78, 98], [0, 1], clamp)}}>
          조종하지 말고, 작동하게.
        </div>
        <div
          style={{
            marginTop: 44,
            fontSize: 132,
            lineHeight: 1,
            fontWeight: 1000,
            textShadow: '0 16px 0 rgba(0,0,0,0.24)',
            opacity: interpolate(frame, [92, 112], [0, 1], clamp),
          }}
        >
          메타센스
        </div>
        <div
          style={{
            marginTop: 28,
            display: 'inline-flex',
            borderRadius: 999,
            background: C.yellow,
            color: C.ink,
            padding: '22px 44px',
            fontSize: 62,
            fontWeight: 1000,
            boxShadow: '0 14px 0 rgba(0,0,0,0.24)',
            opacity: interpolate(frame, [106, 126], [0, 1], clamp),
          }}
        >
          msense.me
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const MetasenseRemotePromo = () => (
  <AbsoluteFill style={{background: C.white}}>
    <MemeAudio />
    <Sequence from={s.hook} durationInFrames={120}>
      <HookScene />
    </Sequence>
    <Sequence from={s.fail} durationInFrames={180}>
      <FailScene />
    </Sequence>
    <Sequence from={s.freeze} durationInFrames={120}>
      <FreezeScene />
    </Sequence>
    <Sequence from={s.product} durationInFrames={240}>
      <ProductScene />
    </Sequence>
    <Sequence from={s.shock} durationInFrames={180}>
      <ShockScene />
    </Sequence>
    <Sequence from={s.ending} durationInFrames={150}>
      <EndingScene />
    </Sequence>
  </AbsoluteFill>
);
