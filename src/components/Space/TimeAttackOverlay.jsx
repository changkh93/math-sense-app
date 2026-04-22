import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SUCCESS_MESSAGES = [
  "초신성 폭발급 반사신경! ⚡️",
  "블랙홀로 빨려 들어가기 직전 구출! 🌌",
  "우주 최고 집중력 폼 미쳤다 😎",
  "정확한 타이밍에 빔 발사 성공! 🎯",
  "웜홀을 통과하는 빛의 속도! ✨"
];

const FAIL_MESSAGES = [
  "앗... 우주의 먼지로 산화되었습니다. ⏳",
  "지나간 광석은 돌아오지 않아요... 🥲",
  "블랙홀이 광석을 삼켜버렸습니다. 🕳️",
  "통신 연결 지연! 광석을 놓쳤습니다. 📡"
];

export default function TimeAttackOverlay({ onHit, onMiss, currentCombo = 0 }) {
  const [position, setPosition] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [status, setStatus] = useState('active'); // 'active', 'hit', 'miss'
  const [message, setMessage] = useState('');
  
  const width = 180;
  const height = 100;

  useEffect(() => {
    // Determine random safe zone position
    const containerW = window.innerWidth * 0.8; // Approximate video container size
    const containerH = window.innerHeight * 0.7; // Approximate video container size
    
    // 0: Top, 1: Bottom, 2: Right Center
    const zone = Math.floor(Math.random() * 3);
    let x, y;

    if (zone === 0) { // Top 15%
      x = Math.random() * (containerW - width);
      y = Math.random() * (containerH * 0.15 - height);
    } else if (zone === 1) { // Bottom 15%
      x = Math.random() * (containerW - width);
      y = containerH * 0.85 + Math.random() * (containerH * 0.15 - height);
    } else { // Right Center
      x = containerW * 0.8 + Math.random() * (containerW * 0.2 - width);
      y = containerH * 0.3 + Math.random() * (containerH * 0.4 - height);
    }

    // Fallback to center-ish if dimensions are weirdly negative
    if (x < 0 || y < 0) {
      x = 50; y = 50;
    }

    setPosition({ x, y });
  }, []);

  useEffect(() => {
    if (status !== 'active') return;

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
  }, [status]);

  const handleHit = () => {
    if (status !== 'active') return;
    setStatus('hit');
    setMessage(SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]);
    
    setTimeout(() => {
      onHit();
    }, 1500); // give time for animation
  };

  const handleMiss = () => {
    if (status !== 'active') return;
    setStatus('miss');
    setMessage(FAIL_MESSAGES[Math.floor(Math.random() * FAIL_MESSAGES.length)]);
    
    setTimeout(() => {
      onMiss();
    }, 2000); // give time for dust animation
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
            
            {/* Progress Bar */}
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
            transition={{ duration: 1.5 }}
            className="time-attack-feedback"
            style={{
              background: status === 'hit' ? 'rgba(5, 10, 25, 0.9)' : 'rgba(255, 77, 77, 0.9)',
              border: `2px solid ${status === 'hit' ? 'var(--neon-blue)' : 'var(--alert-red)'}`,
              padding: '12px 20px',
              borderRadius: '12px',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              textAlign: 'center',
              boxShadow: '0 0 20px rgba(0,0,0,0.5)',
              textShadow: '0 2px 4px rgba(0,0,0,1)'
            }}
          >
            {message}
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
