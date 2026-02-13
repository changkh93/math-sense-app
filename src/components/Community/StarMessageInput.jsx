import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendHorizontal, Sparkles, Target, MessageCircle, Smile, X } from 'lucide-react';
import { useStarMessages } from '../../hooks/useQA';
import './StarMessageInput.css';

const CATEGORIES = [
  { id: 'mood', label: '지금 내 기분', icon: <Smile size={16} />, color: '#00f3ff' },
  { id: 'resolve', label: '빡공 다짐', icon: <Target size={16} />, color: '#ff4d4d' },
  { id: 'social', label: '티키타카', icon: <MessageCircle size={16} />, color: '#adff2f' },
];

const TEMPLATES = {
  mood: [
    { content: '집중력 미쳤다.. 거의 AI급 연산 중 🤖', tag: '#AI모드' },
    { content: '로그 그리다가 내 멘탈도 로그아웃됨 🫠', tag: '#멘탈바사삭' },
    { content: '중요한 건 꺾여도 그냥 푸는 마음.. (눈물)', tag: '#중꺾마' },
    { content: '수학은 죄가 없다, 모르는 내가 죄지 😇', tag: '#해탈' },
    { content: '당 떨어짐. 누가 초콜릿 좀 직구해줘 🍫', tag: '#당충전' },
  ],
  resolve: [
    { content: '오늘 오답 노트 다 부수고 잔다. 말리지 마 👁️👁️', tag: '#맑눈광' },
    { content: '딱 30분만 조지고 쉰다. 질문 받는다.', tag: '#효율충' },
    { content: '어제의 나보다 0.1%만 더 똑똑해지기! 📈', tag: '#성장캐' },
    { content: '이 문제 풀 때까지 숨 참음. (흡!) 🙊', tag: '#존버' },
  ],
  social: [
    { content: '방금 난제 해결! 나 좀 천재인 듯? 😎', tag: '#자랑타임' },
    { content: '수학 고수님들, 저 좀 살려주세요.. 🫶', tag: '#구조요청' },
    { content: '아고라 1등 도착! 다들 공부 안 함? 😏', tag: '#출첵' },
    { content: '다들 수고가 많다~ 대학 가서 미팅 가자! 🚀', tag: '#응원' },
  ]
};

export default function StarMessageInput() {
  const [panelState, setPanelState] = useState('closed'); // closed, category, templates
  const [selectedCat, setSelectedCat] = useState(null);
  const [customText, setCustomText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { post } = useStarMessages();

  const handlePost = async (content, category = 'general') => {
    if (!content.trim() || isSubmitting) return;
    
    console.log('Sending shoutout:', { content, category });
    setIsSubmitting(true);
    try {
      const result = await post.mutateAsync({ 
        content: content.length > 40 ? content.substring(0, 37) + '...' : content, 
        category 
      });
      console.log('Post successful:', result);
      setCustomText('');
      setPanelState('closed');
      setSelectedCat(null);
    } catch (err) {
      console.error('Shoutout post error:', err);
      alert('메시지 전송에 실패했습니다. 로그인을 확인해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    // Prevent double-firing on Korean IME and only trigger on non-empty text
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && customText.trim()) {
      handlePost(customText, 'general');
    }
  };

  return (
    <div className="star-message-input-container">
      <motion.button 
        className={`trigger-btn glass ${panelState !== 'closed' ? 'active' : ''}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setPanelState(panelState === 'closed' ? 'category' : 'closed')}
      >
        <Sparkles size={16} className="sparkle-icon" />
        <span>한마디 남기기</span>
      </motion.button>

      <AnimatePresence>
        {panelState !== 'closed' && (
          <motion.div 
            className="input-panel-v2 glass"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
          >
            <div className="panel-header">
              <span className="step-indicator">
                {panelState === 'category' ? 'STEP 1: 감정 주파수 선택' : 'STEP 2: 메시지 쏘아올리기'}
              </span>
              <button onClick={() => setPanelState('closed')} className="close-btn"><X size={16} /></button>
            </div>

            {panelState === 'category' ? (
              <div className="category-grid">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.id} 
                    className="cat-card"
                    style={{ '--cat-color': cat.color }}
                    onClick={() => {
                      setSelectedCat(cat.id);
                      setPanelState('templates');
                    }}
                  >
                    <div className="cat-icon">{cat.icon}</div>
                    <div className="cat-label">{cat.label}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="template-view">
                <button className="back-link" onClick={() => setPanelState('category')}>← 카테고리 다시 선택</button>
                <div className="templates-scroll">
                  {TEMPLATES[selectedCat]?.map((tpl, i) => (
                    <button 
                      key={i} 
                      className="tpl-item"
                      onClick={() => handlePost(tpl.content, selectedCat)}
                      disabled={isSubmitting}
                    >
                      <span className="tpl-text">{tpl.content}</span>
                      <span className="tpl-tag">{tpl.tag}</span>
                    </button>
                  ))}
                </div>
                <div className="custom-input-section">
                  <input 
                    type="text" 
                    placeholder="내용을 입력하세요 (최대 40자)"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={40}
                  />
                  <button 
                    className="send-btn" 
                    onClick={() => handlePost(customText, 'general')}
                    disabled={isSubmitting || !customText.trim()}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ pointerEvents: 'none' }}
                    >
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


