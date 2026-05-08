import { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { getAttendanceDockingStatus } from '../../utils/attendanceUtils';

export default function WarpGateDocking({ clusterData, user, userData, attendanceMutation, todayAttendance, todayKST, onDockingSuccess }) {
  const [status, setStatus] = useState({ state: 'invalid', message: '', countdown: null });

  useEffect(() => {
    const syncStatus = () => {
      setStatus(getAttendanceDockingStatus({ clusterData, todayAttendance }));
    };

    syncStatus();
    const timer = setInterval(syncStatus, 1000);

    return () => clearInterval(timer);
  }, [clusterData, todayAttendance]);

  const handleDocking = async () => {
    if (status.state === 'invalid' || !user || !clusterData) return;
    const clusterId = clusterData.id || clusterData.docId;

    try {
      await attendanceMutation.mutateAsync({
        userId: user.uid,
        userName: userData?.studentName || user.displayName || user.email?.split('@')[0],
        clusterId,
        clusterName: clusterData.name,
        date: todayKST,
        timestamp: new Date(),
        status: status.state === 'late' ? 'late' : 'present'
      });
      if (onDockingSuccess) onDockingSuccess();
      alert(status.state === 'late' ? '지각 도킹되었습니다. 다음에는 서둘러주세요!' : '정상적으로 도킹(출석)되었습니다. 즐거운 탐험 되세요!');
    } catch (err) {
      console.error('Docking failed:', err);
      alert('도킹 시스템 오류가 발생했습니다.');
    }
  };

  if (status.state === 'invalid') {
    return (
      <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>
        📡 {status.message}
      </div>
    );
  }

  if (status.state === 'completed') {
    return (
      <div className="font-tech" style={{
        padding: '0.8rem 2rem',
        fontSize: '1.1rem',
        borderColor: 'var(--crystal-cyan)',
        color: 'var(--crystal-cyan)',
        boxShadow: `0 0 15px var(--crystal-cyan)`,
        background: 'rgba(0, 212, 255, 0.1)',
        fontWeight: 'bold',
        borderRadius: '4px',
        border: '1px solid var(--crystal-cyan)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        ✨ {status.message}
      </div>
    );
  }

  let btnColor = 'var(--neon-blue)';
  if (status.state === 'closing') btnColor = 'var(--planet-orange)';
  if (status.state === 'late') btnColor = '#ff4500';

  return (
    <Motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleDocking}
      className="space-btn cosmic-btn font-tech"
      style={{
        padding: '0.8rem 2rem',
        fontSize: '1.1rem',
        borderColor: btnColor,
        color: btnColor,
        boxShadow: `0 0 15px ${btnColor}`,
        background: 'rgba(0,0,0,0.4)',
        fontWeight: 'bold'
      }}
    >
      🚀 {status.message}
    </Motion.button>
  );
}
