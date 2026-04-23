import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const MESSAGE_DATABASE = {
  humor: [
    "오~ {name} 폼 미쳤다! 집중력 찢었다! 🔥",
    "이 광석은 {name} 제 겁니다. 제 마음대로 할 수 있는 겁니다.",
    "혹시 집중력 천재? 아니면 클릭 매크로? (농담😉)",
    "우주경찰 출동! 너무 집중해서 체포합니다 삐용삐용 🚓",
    "방금 클릭 속도, 거의 빛의 속도였음. ㄴㅇㄱ",
    "공부하다 말고 광석 줍는 {name}, 완전 럭키비키잖아? 🍀",
    "이 광석을 획득하다니, 완전 갓벽한 타이밍!",
    "졸음 세포가 우주 밖으로 쫓겨났습니다.",
    "광석 줍기 달인으로 인정합니다. (도장 쾅!)",
    "{name} 반사신경에 10점 만점에 100점 드립니다.",
    "이 구역의 클릭왕은 나야 나! 👑",
    "혹시 전생에 우주 광부...? 손놀림이 예사롭지 않아요.",
    "딴짓 안 하고 클릭한 당신, 칭찬 스티커 100만 개!",
    "광석 줍다 보니 어느새 수학 천재가 되어가는 중 🧠",
    "엄마! 나 우주에서 광석 주웠어!!"
  ],
  space: [
    "블랙홀의 중력을 이겨내고 광석 획득 성공! 🕳️",
    "안드로메다 은하에서 날아온 희귀 광석입니다.",
    "지구 본부에서 {name} 집중력을 칭찬하고 있습니다. 🌍",
    "외계인도 탐내는 광석을 지켜냈군요!",
    "워프(Warp) 준비 완료! 다음 진도로 날아가 볼까요? 🚀",
    "우주선 연료가 +10 충전되었습니다.",
    "삐빅- 현재 대원님의 뇌파는 100% 학습 모드입니다.",
    "초신성 폭발보다 빛나는 {name} 대원님의 눈빛! ✨",
    "이 광석은 우주의 비밀을 푸는 열쇠가 될지도 몰라요.",
    "태양계 최고 집중력 상을 수여합니다.",
    "은하계 경찰청: 불법 딴짓 검문 중... 통과! 👮‍♂️",
    "우주 먼지가 될 뻔한 광석을 구출했습니다.",
    "화성 개척 기지에서 {name} 대원님을 응원합니다.",
    "별빛이 내린다~ 샤라랄라 랄랄라~ 광석도 내린다~ 🌠",
    "현재 시속 30만 km로 수학 지식이 뇌에 꽂히는 중!"
  ],
  comfort: [
    "오늘 하루도 책상 앞에 앉은 {name} 네가 정말 대견해. 💖",
    "많이 피곤하죠? 이 광석 보면서 딱 3초만 기지개 켜봐요!",
    "어려운 부분 꾹 참고 듣는 모습, 진짜 멋있어요.",
    "조금 느려도 괜찮아. 우주는 끝없이 넓으니까! 🌌",
    "오늘 {name} 너의 노력은 절대 널 배신하지 않을 거야.",
    "공부하기 싫은 마음 이겨낸 당신이 오늘의 영웅 🦸‍♂️",
    "머리에 쥐가 날 것 같다고요? 광석 비타민 먹고 힘내요!",
    "아무도 안 보는 것 같아도, 우주가 당신을 응원하고 있어요.",
    "틀려도 괜찮아. 지구도 둥글고 정답도 돌고 도는 거니까!",
    "지금 흘린 땀방울이 모여 은하수가 될 거예요. ✨",
    "잠깐 눈 감고 심호흡 한 번 하세요. 쓰담쓰담.",
    "오늘 참 힘들었지? 잘 버텨줘서 고마워요.",
    "포기하고 싶은 순간을 넘긴 네가 진짜 어른이다.",
    "너의 가능성은 저 우주보다 훨씬 더 크단다. 🚀",
    "수학이 널 괴롭히면 우주선 타고 도망치자! (농담!)"
  ],
  praise: [
    "천재 아니야? 어떻게 한 번도 안 놓치지?!",
    "이대로만 하면 전교 1등은 시간문제! 💯",
    "너의 잠재력이 방금 10% 더 폭발했습니다.",
    "진짜 대단하다... 선생님도 방금 건 놀랐어! 😲",
    "매일매일 기록을 경신하는 중! 너튜브 각인데?",
    "완벽 그 자체. 더 이상 설명이 필요 없습니다. 👏",
    "오늘 공부의 주인공은 바로 {name} 너야 너!",
    "당신의 성실함이 빛나는 순간입니다. 💎",
    "이런 속도라면 하버드 우주항공학과 프리패스!",
    "광석이 너의 집중력에 감동해서 스스로 굴러왔어.",
    "너의 뇌는 지금 가장 섹시하게 일하는 중 🧠✨",
    "칭찬해! 내일은 오늘보다 더 대단할 거야.",
    "기립 박수! 👏👏👏 (지금 진짜로 치고 있음)",
    "너의 끈기에 우주가 감동의 눈물을 흘립니다.",
    "성공의 맛이 느껴지나요? 이게 바로 너의 실력!"
  ],
  fact: [
    "딴짓하려고 마우스 올린 거 다 봤다~ 👀",
    "카톡 확인하려다가 광석 클릭한 거 아니지? 📱",
    "눈 깜빡이지 마! 다음 광석이 널 지켜보고 있어.",
    "지금 일시정지 누르고 화장실 가려던 사람 손! ✋",
    "어머니가 지켜보고 계십니다. (진짜일지도? 👩‍🏫)",
    "1분만 늦었어도 이 광석은 공기 중으로 날아갔음.",
    "침 흘리는 거 아니죠? 입 닦고 다시 화면 보기!",
    "유튜브 알고리즘의 유혹을 이겨낸 자 독하다 독해! 🐍",
    "지금 딴 생각한 거 우주 본부 서버에 다 기록됨. 삐빅.",
    "광석만 줍고 강의 안 듣는 건 아니겠죠...? 🤨",
    "선생님 설명할 때 딴 데 보면 우주 미아 됩니다.",
    "손가락만 움직이지 말고 뇌도 같이 움직이세요! 🧠",
    "앗, 방금 영혼이 잠시 가출했다 돌아온 것 같은데?",
    "광석은 핑계고 사실 내 얼굴 보려고 클릭한 거 다 앎."
  ],
  time: {
    morning: [
      "굿모닝 {name} 대원님! 오늘 하루도 우주급으로 상쾌하게 시작! ☀️",
      "아침부터 수학이라니, {name} 너의 부지런함에 건배 🥛"
    ],
    afternoon: [
      "점심 먹고 졸릴 시간인데, 대단한 집중력이네요! 🥱🚫",
      "나른한 오후, 광석 하나 줍고 에너지 충전! ⚡"
    ],
    evening: [
      "저녁밥은 든든히 먹었어요? 이제 지식을 채울 시간! 🍚",
      "오늘 하루의 마무리를 수학감각과 함께하다니, 갓생러! 👍"
    ],
    night: [
      "이 시간까지 깨어있다니... {name} 올빼미 대원님 존경합니다. 🦉",
      "모두가 잠든 밤, {name} 너의 뇌는 가장 밝게 빛나고 있어. 🌟"
    ],
    dawn: [
      "새벽 감성엔 역시 수학이지! (근데 잠은 자면서 해 ㅠㅠ) 🛌"
    ],
    weekend: [
      "남들 다 노는 주말에 공부하는 {name}, 무조건 성공한다! 🎉"
    ]
  },
  quiz: [
    "폭풍 전야... 곧 엄청난 보물 상자가 나타날 것 같은 느낌! ⚡",
    "우주 레이더에 거대한 에너지파가 감지되었습니다. 준비하세요!",
    "손가락 스트레칭 실시! 곧 퀴즈가 쏟아집니다. ☝️",
    "광석을 이렇게 잘 줍다니, 보물 상자도 열 자격이 충분해.",
    "이 구역의 연산 왕이 누구인지 곧 테스트가 시작됩니다. 👑",
    "삐빅- 해킹 시도 감지. 암호를 풀 준비를 하십시오. 💻",
    "지금까지는 워밍업이었습니다. 진짜 승부는 이제부터!"
  ]
};

const FAIL_MESSAGES = [
  "앗... 우주의 먼지로 산화되었습니다. ⏳",
  "지나간 광석은 돌아오지 않아요... 🥲",
  "블랙홀이 광석을 삼켜버렸습니다. 🕳️",
  "통신 연결 지연! 광석을 놓쳤습니다. 📡",
  "조금만 더 빨리! 집중력 부스터 온! 🚀"
];

export default function TimeAttackOverlay({ onHit, onMiss, currentCombo = 0, userName = "", isVideoPaused = false }) {
  const [position, setPosition] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [status, setStatus] = useState('active'); // 'active', 'hit', 'miss'
  const [message, setMessage] = useState('');
  
  const width = 180;
  const height = 100;

  useEffect(() => {
    // Determine random safe zone position
    // Use window dimensions but with strict margins to avoid HUD elements
    const containerW = window.innerWidth; 
    const containerH = window.innerHeight; 
    
    // Safety Margins:
    // - Top: 120px (Title, Back button)
    // - Bottom: 100px (Video controls)
    // - Sides: 60px
    const marginT = 120;
    const marginB = 100;
    const marginL = 60;
    const marginR = 60;

    const safeW = Math.max(200, containerW - marginL - marginR - width);
    const safeH = Math.max(200, containerH - marginT - marginB - height);

    const zone = Math.floor(Math.random() * 3);
    let x, y;

    if (zone === 0) { // Top-ish area (but below HUD)
      x = marginL + Math.random() * safeW;
      y = marginT + Math.random() * (safeH * 0.2);
    } else if (zone === 1) { // Bottom-ish area (but above controls)
      x = marginL + Math.random() * safeW;
      y = marginT + safeH * 0.8 + Math.random() * (safeH * 0.2);
    } else { // Center-Right area
      x = marginL + safeW * 0.6 + Math.random() * (safeW * 0.4);
      y = marginT + safeH * 0.2 + Math.random() * (safeH * 0.6);
    }

    if (x < 0 || y < 0) {
      x = 100; y = 200;
    }

    setPosition({ x, y });
  }, []);

  useEffect(() => {
    if (status !== 'active' || isVideoPaused) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleMiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, isVideoPaused]);

  const getRandomSuccessMessage = () => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const name = userName || "우리";

    let timePool = [];
    if (isWeekend) {
      timePool = MESSAGE_DATABASE.time.weekend;
    } else if (hour >= 5 && hour < 11) {
      timePool = MESSAGE_DATABASE.time.morning;
    } else if (hour >= 11 && hour < 17) {
      timePool = MESSAGE_DATABASE.time.afternoon;
    } else if (hour >= 17 && hour < 22) {
      timePool = MESSAGE_DATABASE.time.evening;
    } else if (hour >= 22 || hour < 2) {
      timePool = MESSAGE_DATABASE.time.night;
    } else {
      timePool = MESSAGE_DATABASE.time.dawn;
    }

    const categories = ['humor', 'space', 'comfort', 'praise', 'fact', 'quiz'];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // 30% chance for time-based, 70% for category-based
    const useTimePool = timePool.length > 0 && Math.random() < 0.3;
    const pool = useTimePool ? timePool : MESSAGE_DATABASE[randomCategory];
    
    const rawMsg = pool[Math.floor(Math.random() * pool.length)];
    return rawMsg.replace(/{name}/g, name);
  };

  const handleHit = () => {
    if (status !== 'active') return;
    setStatus('hit');
    setMessage(getRandomSuccessMessage());
    
    setTimeout(() => {
      onHit();
    }, 3000); 
  };

  const handleMiss = () => {
    if (status !== 'active') return;
    setStatus('miss');
    setMessage(FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)]);
    
    setTimeout(() => {
      onMiss();
    }, 3000); 
  };

  if (!position) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: status === 'miss' ? 0.3 : 1, 
          scale: status === 'hit' ? 1.2 : 1,
          x: position.x,
          y: position.y
        }}
        exit={{ opacity: 0, scale: 0.5 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 50,
          pointerEvents: status === 'active' ? 'auto' : 'none'
        }}
      >
        {status === 'active' ? (
          <motion.div 
            className="time-attack-crystal"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleHit}
            style={{
              background: 'rgba(5, 10, 25, 0.8)',
              border: '1px solid var(--neon-blue)',
              borderRadius: '15px',
              padding: '10px 15px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: currentCombo >= 2 ? '0 0 20px var(--star-gold)' : '0 0 10px var(--neon-blue)',
              backdropFilter: 'blur(5px)'
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '5px' }}>
              {currentCombo >= 2 ? '🌟' : '💎'}
            </div>
            
            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / 30) * 100}%` }}
                transition={{ duration: 0.5 }}
                style={{ 
                  height: '100%', 
                  background: timeLeft <= 10 ? 'var(--alert-red)' : 'var(--crystal-cyan)'
                }}
              />
            </div>
            <div className="font-tech" style={{ color: 'var(--text-bright)', fontSize: '0.8rem', marginTop: '5px' }}>
              {timeLeft}초
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ y: 0, opacity: 1 }}
            animate={{ y: status === 'hit' ? -30 : 20, opacity: 0 }}
            transition={{ duration: 3.0 }}
            className="time-attack-feedback"
            style={{
              background: status === 'hit' ? 'rgba(5, 10, 25, 0.9)' : 'rgba(255, 77, 77, 0.9)',
              border: `2px solid ${status === 'hit' ? 'var(--neon-blue)' : 'var(--alert-red)'}`,
              padding: '12px 20px',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)',
              textShadow: '0 2px 4px rgba(0,0,0,1)',
              maxWidth: '300px',
              whiteSpace: 'normal',
              lineHeight: '1.4'
            }}
          >
            {message}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
