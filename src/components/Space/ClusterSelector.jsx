import React from 'react';
import { motion } from 'framer-motion';
import StarField from './StarField';

function ClusterSelector({ clusters, onSelect }) {
  return (
    <div className="space-bg" style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '20px' }}>
      <StarField count={200} />
      
      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1200px', margin: '0 auto', textAlign: 'center', paddingTop: '15vh' }}>
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
          style={{ color: 'var(--panel-text, #ccc)', fontSize: '1.2rem', marginBottom: '4rem' }}
        >
          탐험할 우주의 좌표를 설정하십시오.
        </motion.p>

        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          gap: '40px',
          padding: '20px'
        }}>
          {clusters.map((cluster, idx) => (
            <motion.div
              key={cluster.id || cluster.docId}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1, transition: { delay: 0.2 + idx * 0.1 } }}
              whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 243, 255, 0.4)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onSelect(cluster.docId || cluster.id)}
              style={{
                background: 'rgba(10, 20, 35, 0.7)',
                border: '1px solid rgba(0, 243, 255, 0.3)',
                borderRadius: '20px',
                padding: '40px 30px',
                width: '300px',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
              }}
            >
              <div style={{
                width: '100px', height: '100px', 
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #4a90e2, #002244)',
                boxShadow: '0 0 20px #4a90e2',
                marginBottom: '25px'
              }} />
              <h2 style={{ color: 'white', margin: '0 0 10px 0', fontSize: '1.6rem', textShadow: '0 0 10px rgba(255,255,255,0.5)' }}>
                {cluster.name}
              </h2>
              <p style={{ color: '#88aabb', margin: 0, fontSize: '0.9rem' }}>
                접근 권한 활성화 됨
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ClusterSelector;
