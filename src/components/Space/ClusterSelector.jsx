import React from 'react';
import { motion } from 'framer-motion';
import StarField from './StarField';

const CLUSTER_IMAGES = {
  '중등수학': '/images/clusters/middle_math_hero.png',
  '고전 읽기': '/images/clusters/reading.png',
  '파이썬': '/images/clusters/python.png',
  '초등수학': '/images/clusters/elementary_math.png'
};

function ClusterSelector({ clusters, onSelect }) {
  return (
    <div className="space-bg" style={{ minHeight: '100vh', position: 'relative', padding: '20px' }}>
      <StarField count={200} />
      
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1400px', margin: '0 auto', textAlign: 'center', paddingTop: '10vh' }}>
        <motion.h1 
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
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { delay: 0.2 } }}
          style={{ color: 'var(--panel-text, #ccc)', fontSize: '1.2rem', marginBottom: '3rem' }}
        >
          탐험할 우주의 좌표를 설정하십시오.
        </motion.p>

        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          gap: '30px',
          padding: '20px'
        }}>
          {clusters.map((cluster, idx) => {
            const clusterImg = CLUSTER_IMAGES[cluster.name];
            
            return (
              <motion.div
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
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ClusterSelector;
