import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '../../firebase';
import { Database, BookOpen, Layers, Users, RefreshCw } from 'lucide-react';
import { useAdminMutations } from '../../hooks/useContent';

const AdminDashboard = () => {
  const { repairClusters } = useAdminMutations();
  
  const handleRepair = async () => {
    if (window.confirm("기존 은하/행성 데이터를 새로운 행성 군집(초등수학)으로 연결하고 기본 설정을 복구하시겠습니까? (화면에 행성이 보이지 않을 때 유용합니다)")) {
      try {
        await repairClusters.mutateAsync();
        alert("데이터 복구가 완료되었습니다! 메인 화면을 확인해 보세요.");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("복구 실패: " + err.message);
      }
    }
  };

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      // ... stats fetching logic (already correct) ...
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

      <div className="card glass" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>시스템 데이터 복구</h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '10px' }}>
            새로운 멀티-버스 아키텍처에 맞게 기존 데이터를 최적화합니다. <br/>
            행성 군집 목록이 비어있거나 행성이 보이지 않을 경우 아래 버튼을 클릭하십시오.
          </p>
        </div>
        <button 
          className="primary-btn" 
          onClick={handleRepair}
          disabled={repairClusters.isPending}
          style={{ background: 'var(--planet-green, #50c878)', border: 'none' }}
        >
          <RefreshCw size={18} className={repairClusters.isPending ? 'spin' : ''} />
          {repairClusters.isPending ? '복구 중...' : '데이터 연결 및 복구'}
        </button>
      </div>

      <div className="card glass" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)' }}>
        <h3>시스템 안내</h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', marginTop: '10px' }}>
          • 행성 군집(Cluster) 기능을 통해 중등수학 등 새로운 교육 과정을 확장할 수 있습니다.<br />
          • 기존 사용자는 '초등수학' 군집에 자동으로 연결됩니다.<br />
          • 관제 센터(Admin)의 'Multi-Verse' 메뉴에서 신규 군집을 생성하고 초대 코드를 관리할 수 있습니다.
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
