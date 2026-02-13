import React, { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Lucide from 'lucide-react';
import { useStarMessages } from '../../hooks/useQA';
import { auth } from '../../firebase';
import './AgoraLiveTicker.css';

const CATEGORY_MAP = {
  mood: '✨',
  resolve: '🚀',
  greeting: '👋',
  notice: '📡',
  math: '📐',
  general: '💫'
};

const SPARKLE_KEYWORDS = ['갓생', '천재', '부수고', '1등', 'AI'];

export default function AgoraLiveTicker() {
  const { data: qData, boost } = useStarMessages();
  const starMessages = qData?.data;
  const isLoading = qData?.isLoading;
  const currentUser = auth.currentUser;

  // Smart Queue Logic
  const messages = React.useMemo(() => {
    if (!starMessages || starMessages.length === 0) {
      if (isLoading) return [];
      return [
        { id: 'sys1', content: '수학 아고라 성단에 오신 것을 환영합니다! 🌌', category: 'notice', userName: 'SYSTEM' },
        { id: 'sys2', content: '오늘의 목표를 별자리 메시지로 남겨보세요. ✍️', category: 'notice', userName: 'SYSTEM' }
      ];
    }

    const now = Date.now();
    const THREE_HOURS = 3 * 60 * 60 * 1000;

    // 1. TTL Filter (3 hours)
    let processed = starMessages.filter(msg => {
      if (!msg.createdAt) return true; // keep if pending/optimistic
      const time = msg.createdAt.seconds ? msg.createdAt.seconds * 1000 : msg.createdAt;
      return (now - time) < THREE_HOURS;
    });

    // 2. Diversity: Only latest message per user
    const userBest = new Map();
    processed.forEach(msg => {
      // System messages use their own ID, users use their unique userId
      const diversityKey = msg.id.startsWith('sys') ? msg.id : (msg.userId || msg.id);
      
      if (!userBest.has(diversityKey) || 
         (msg.createdAt?.seconds > (userBest.get(diversityKey).createdAt?.seconds || 0))) {
        userBest.set(diversityKey, msg);
      }
    });
    processed = Array.from(userBest.values());

    // 3. Sorting (Priority: My Message > Top Boosted > New)
    processed.sort((a, b) => {
      const isMineA = a.userId === currentUser?.uid;
      const isMineB = b.userId === currentUser?.uid;
      if (isMineA && !isMineB) return -1;
      if (!isMineA && isMineB) return 1;

      const boostA = a.endorseCount || 0;
      const boostB = b.endorseCount || 0;
      if (boostA !== boostB) {
        return boostB - boostA;
      }

      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    });

    // 4. Limit Pool Size
    return processed.slice(0, 40);
  }, [starMessages, isLoading, currentUser]);

  const [lastBoostTime, setLastBoostTime] = useState(0);

  const handleBoost = (e, msg) => {
    e.stopPropagation();
    if (msg.id.startsWith('sys')) return;
    
    // Throttling: Prevent spam clicks (0.5s)
    const now = Date.now();
    if (now - lastBoostTime < 500) return;
    setLastBoostTime(now);

    // Check if already upvoted
    if (msg.upvotedBy?.includes(currentUser?.uid)) return;

    boost.mutate(msg.id);

    // Visual feedback
    const el = e.currentTarget;
    el.classList.add('boosted-anim');
    setTimeout(() => el.classList.remove('boosted-anim'), 1000);
  };

  // Dynamic animation duration based on message count
  const duration = Math.max(15, messages.length * 4.5);

  const renderMessage = (msg) => {
    const isMine = msg.userId === currentUser?.uid;
    const isUpvoted = msg.upvotedBy?.includes(currentUser?.uid);
    const hasSparkle = SPARKLE_KEYWORDS.some(kw => msg.content.includes(kw));
    const endorseCount = msg.endorseCount || 0;
    
    let displayContent = msg.content;
    if (msg.content.includes('목표') && !msg.content.includes('%')) {
      displayContent = `${msg.content} [▓▓░░░] 40%`;
    }

    const SparkleIcon = Lucide.Sparkle || Lucide.Sparkles || Lucide.Zap;

    return (
      <span 
        className={`ticker-item font-tech ${hasSparkle ? 'super-msg' : ''} ${isMine ? 'my-msg' : ''} ${isUpvoted ? 'is-upvoted' : ''}`}
        onClick={(e) => handleBoost(e, msg)}
      >
        <span className="msg-user">
          {isMine && <span className="me-badge">나</span>}
          [{msg.userName || '탐험가'}]:
        </span>
        <span className="msg-icon">{CATEGORY_MAP[msg.category] || '💫'}</span>
        <span className="msg-text">{displayContent}</span>
        {endorseCount > 0 && <span className="boost-badge">🚀{endorseCount}</span>}
        {hasSparkle && SparkleIcon && <SparkleIcon size={14} className="inline-sparkle" style={{ color: '#ffd700' }} />}
      </span>
    );
  };

  if (isLoading && messages.length === 0) return (
    <div className="live-ticker-wrap glass hud-border">
      <div className="ticker-label font-tech">SCANNING...</div>
      <div className="ticker-track"></div>
    </div>
  );

  return (
    <div className="live-ticker-wrap glass star-ticker-bg">
      <div className="ticker-label font-tech">STAR MESSAGES</div>
      <div className="ticker-track">
        <motion.div 
          className="ticker-content"
          animate={{ x: [0, -1500] }}
          transition={{ 
            duration, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {messages.map((msg, i) => (
            <Fragment key={`${msg.id}-${i}`}>
              {renderMessage(msg)}
            </Fragment>
          ))}
          {messages.map((msg, i) => (
            <Fragment key={`${msg.id}-cl1-${i}`}>
              {renderMessage(msg)}
            </Fragment>
          ))}
        </motion.div>
      </div>
      <div className="ticker-aurora"></div>
    </div>
  );
}

