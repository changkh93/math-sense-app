import React from 'react';
import { motion as Motion } from 'framer-motion';
import StarField from './StarField';

const CLUSTER_IMAGES = {
  '중등수학': '/images/clusters/middle_math_hero.png',
  '고전 읽기': '/images/clusters/reading.png',
  '파이썬': '/images/clusters/python_hero.png',
  '초등수학': '/images/clusters/elementary_math.png'
};

function ClusterSelector({ clusters, onSelect, onEnterFrontier }) {
  return (
    <div className="space-bg" style={{ minHeight: '100vh', position: 'relative', padding: '20px' }}>
      <StarField count={200} />
      
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto', textAlign: 'center', paddingTop: '10vh' }}>
        <Motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ 
            color: 'var(--crystal-cyan, #00f3ff)', 
            fontSize: '3rem', 
            textShadow: '0 0 20px cyan',
            marginBottom: '1rem'
          }}
        >
          행성 군집 선택 (Multi-Verse)
        </Motion.h1>
        <Motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          style={{ color: 'var(--panel-text, #ccc)', fontSize: '1.2rem', marginBottom: '3rem' }}
        >
          탐험할 우주의 좌표를 설정하십시오.
        </Motion.p>

        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          gap: '30px',
          padding: '20px'
        }}>
          <Motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1, transition: { delay: 0.12 } }}
            whileHover={{ scale: 1.035, boxShadow: '0 0 55px rgba(109, 245, 176, 0.38)' }}
            whileTap={{ scale: 0.98 }}
            onClick={onEnterFrontier}
            style={{
              position: 'relative',
              width: 'min(700px, 100%)',
              minHeight: '350px',
              overflow: 'hidden',
              border: '1px solid rgba(109, 245, 176, 0.48)',
              borderRadius: '28px',
              padding: 0,
              cursor: 'pointer',
              color: 'white',
              textAlign: 'left',
              background: 'radial-gradient(circle at 72% 26%, rgba(109,245,176,0.32), transparent 23%), radial-gradient(circle at 58% 58%, rgba(73,150,255,0.28), transparent 32%), linear-gradient(145deg, #101a31, #071321 58%, #07100f)',
              boxShadow: '0 18px 55px rgba(0,0,0,0.48)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, opacity: 0.42, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '43px 43px' }} />
            <div style={{ position: 'absolute', right: '8%', top: '13%', width: '180px', aspectRatio: 1, borderRadius: '50%', background: 'radial-gradient(circle at 32% 25%, #dcffe8, #4bc389 34%, #216579 60%, #17284d 78%)', boxShadow: 'inset -25px -22px 35px rgba(0,0,0,.5), 0 0 60px rgba(80,235,177,.34)' }} />
            <div style={{ position: 'absolute', right: '4%', top: '33%', width: '260px', height: '58px', borderRadius: '50%', border: '1px solid rgba(175,248,255,.45)', transform: 'rotate(-13deg)' }} />
            <div style={{ position: 'relative', zIndex: 2, maxWidth: '390px', minHeight: '350px', boxSizing: 'border-box', padding: '2.2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <span style={{ color: '#75f3ba', fontSize: '.72rem', fontWeight: 900, letterSpacing: '.16em' }}>SOCIAL WORLD · LIVE</span>
              <h2 style={{ margin: '.5rem 0', fontSize: 'clamp(2.2rem, 5vw, 3.7rem)', lineHeight: 1, letterSpacing: '-.055em' }}>아스트라<br/>프론티어</h2>
              <p style={{ margin: '.6rem 0 1.3rem', color: '#b4c4d9', lineHeight: 1.55 }}>자유롭게 걸으며 나의 행성을 만들고,<br/>친구의 세계와 새로운 항로를 함께 개척하세요.</p>
              <strong style={{ alignSelf: 'flex-start', padding: '.7rem 1rem', borderRadius: '999px', color: '#071511', background: 'linear-gradient(135deg,#7ff4bd,#63dcff)', fontSize: '.8rem' }}>프론티어에 착륙하기 →</strong>
            </div>
          </Motion.button>

          {clusters.map((cluster, idx) => {
            const clusterImg = CLUSTER_IMAGES[cluster.name];
            
            return (
              <Motion.div
                key={cluster.id || cluster.docId}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 + idx * 0.1 } }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(0, 243, 255, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelect(cluster.docId || cluster.id)}
                style={{
                  background: 'rgba(5, 15, 30, 0.8)',
                  border: '1px solid rgba(0, 243, 255, 0.4)',
                  borderRadius: '24px',
                  padding: '1.5rem',
                  width: '320px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(15px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Image or Fallback */}
                <div style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: '16px',
                  marginBottom: '1.5rem',
                  overflow: 'hidden',
                  background: 'rgba(0,0,0,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  {clusterImg ? (
                    <img 
                      src={clusterImg} 
                      alt={cluster.name} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.background = 'radial-gradient(circle at 30% 30%, #4a90e2, #002244)';
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '60%', height: '60%', 
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 30% 30%, #4a90e2, #002244)',
                      boxShadow: '0 0 20px #4a90e2'
                    }} />
                  )}
                </div>

                <h2 style={{ 
                  color: 'white', 
                  margin: '0 0 8px 0', 
                  fontSize: '1.8rem', 
                  fontWeight: 800,
                  textShadow: '0 2px 10px rgba(0,0,0,0.5)' 
                }}>
                  {cluster.name}
                </h2>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '4px 12px',
                  background: 'rgba(0, 243, 255, 0.1)',
                  borderRadius: '100px',
                  border: '1px solid rgba(0, 243, 255, 0.2)'
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--crystal-cyan, #00f3ff)', boxShadow: '0 0 5px cyan' }} />
                  <p style={{ color: 'var(--crystal-cyan, #00f3ff)', margin: 0, fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                    접근 권한 활성화 됨
                  </p>
                </div>
              </Motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ClusterSelector;
