import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { getRandomNickname } from '../../utils/qaUtils';
import './AgoraStarMap.css';

export default function AgoraStarMap({ questions, onQuestionClick }) {
  const queryClient = useQueryClient();

  // FUNDAMENTAL IMPROVEMENT: Proactive pre-fetching on hover
  const handlePrefetch = async (questionId) => {
    // 1. Prefetch Question Detail
    queryClient.prefetchQuery({
      queryKey: ['question', questionId],
      queryFn: async () => {
        const snap = await getDoc(doc(db, 'questions', questionId));
        return { ...snap.data(), id: snap.id };
      },
      staleTime: 1000 * 60
    });

    // 2. Prefetch Answers
    queryClient.prefetchQuery({
      queryKey: ['answers', questionId],
      queryFn: async () => {
        const q = query(
          collection(db, 'answers'),
          where('questionId', '==', questionId),
          orderBy('createdAt', 'asc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      },
      staleTime: 1000 * 60
    });
  };

  // Generate stable random positions for stars based on their IDs
  const starPositions = useMemo(() => {
    return questions.map(q => {
      // Use string hash or simple math for stable "randomness"
      const hash = q.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return {
        id: q.id,
        x: (hash % 80) + 10, // 10% to 90%
        y: ((hash * 13) % 80) + 10,
        size: q.upvotes > 5 ? 120 : q.upvotes > 2 ? 90 : 70,
        delay: (hash % 20) / 10
      };
    });
  }, [questions]);

  if (!questions || questions.length === 0) return null;

  return (
    <div className="agora-viewport">
      <motion.div 
        className="nebula-canvas"
        drag
        dragConstraints={{ left: -500, right: 500, top: -500, bottom: 500 }}
      >
        {starPositions.map((pos, idx) => {
          const q = questions[idx];
          const isSOS = q.status === 'open';
          const isSolved = q.status === 'resolved';
          const isHot = q.upvotes > 3 || q.answerCount > 2;

          return (
            <motion.div
              key={pos.id}
              className={`question-star-node ${isSOS ? 'sos' : ''} ${isSolved ? 'solved' : ''} ${isHot ? 'hot' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${pos.size}px`,
                height: `${pos.size}px`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.2, zIndex: 100 }}
              onMouseEnter={() => handlePrefetch(q.id)}
              onClick={() => onQuestionClick(q.id)}
            >
              <div className="star-core">
                {isHot && <div className="orbital-ring" />}
              </div>
              
              <div className="star-label-popup">
                <div className="popup-header">
                   <span className="author">{getRandomNickname(q.userId)}</span>
                   <span className="status-dot" />
                </div>
                <p className="summary line-clamp-2">{q.content}</p>
                <div className="popup-footer">
                  <span>💬 {q.answerCount || 0}</span>
                  <span>❤️ {q.upvotes || 0}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
      
      <div className="exploration-hint font-tech">
        🖱️ 드래그하여 아고라 성단을 탐험하세요 (줌은 개발 예정)
      </div>
    </div>
  );
}
