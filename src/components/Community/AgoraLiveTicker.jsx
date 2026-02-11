import React from 'react';
import { motion } from 'framer-motion';
import './AgoraLiveTicker.css';

export default function AgoraLiveTicker({ questions }) {
  // Take last 5 questions or active ones
  const recentActivity = questions?.slice(0, 5).map(q => ({
    id: q.id,
    text: `🛰️ [${q.userName || '탐험가'}]님이 새로운 질문 별을 쏘아올렸습니다: "${q.content.substring(0, 20)}..."`,
    type: 'new-question'
  })) || [];

  if (recentActivity.length === 0) return null;

  return (
    <div className="live-ticker-wrap glass hud-border">
      <div className="ticker-label font-tech">LIVE ACTIVITY</div>
      <div className="ticker-track">
        <motion.div 
          className="ticker-content"
          animate={{ x: [0, -1000] }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        >
          {recentActivity.map(act => (
            <span key={act.id} className="ticker-item font-tech">
              {act.text}
            </span>
          ))}
          {/* Duplicate for seamless scroll */}
          {recentActivity.map(act => (
            <span key={`${act.id}-clone`} className="ticker-item font-tech">
              {act.text}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
