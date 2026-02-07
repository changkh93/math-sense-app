import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { Database, BookOpen, Layers, Users } from 'lucide-react';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const regions = await getCountFromServer(collection(db, 'regions'));
      const chapters = await getCountFromServer(collection(db, 'chapters'));
      const units = await getCountFromServer(collection(db, 'units'));
      const quizzes = await getCountFromServer(collection(db, 'quizzes'));
      
      return {
        regions: regions.data().count,
        chapters: chapters.data().count,
        units: units.data().count,
        quizzes: quizzes.data().count
      };
    }
  });

  return (
    <div className="admin-dashboard">
      <header className="section-header">
        <h1>Admin Dashboard</h1>
        <p>Operation Tool Overview</p>
      </header>
      
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '2rem' }}>
        <StatCard icon={<Database size={24} />} label="Regions" value={isLoading ? '...' : stats?.regions ?? 0} />
        <StatCard icon={<Layers size={24} />} label="Chapters" value={isLoading ? '...' : stats?.chapters ?? 0} />
        <StatCard icon={<BookOpen size={24} />} label="Units" value={isLoading ? '...' : stats?.units ?? 0} />
        <StatCard icon={<Database size={24} />} label="Quizzes" value={isLoading ? '...' : stats?.quizzes ?? 0} />
      </div>

      <div className="card glass" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)' }}>
        <h3>시스템 안내</h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '10px' }}>
          • 화면이 어두워 글자가 보이지 않던 문제를 해결했습니다.<br />
          • 데이터 로딩 최적화를 위해 쿼리를 조정했습니다.<br />
          • 위 통계 숫자가 0이라면 마이그레이션 도구(/migrate)를 다시 실행해 주세요.
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div className="card glass" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)' }}>
    <div style={{ color: '#4834d4' }}>{icon}</div>
    <div>
      <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{value}</div>
    </div>
  </div>
);

export default AdminDashboard;
