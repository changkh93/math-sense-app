import { Link, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { LayoutDashboard, Globe, Layers, LogOut, Database, MessageSquare, Ghost, Users, ShieldAlert, BookOpenText, Activity, Phone, FileBarChart, UserCheck, ClipboardList, BookOpenCheck, Trophy, Tent } from 'lucide-react';
import './Admin.css'; // We'll create this next

const AdminLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar glass">
        <div className="admin-header">
          <h2>Math Sense</h2>
          <span className="badge">ADMIN</span>
        </div>
        
        <nav className="admin-nav">
          <Link to="/admin" className="nav-link">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/admin/live-status" className="nav-link">
            <Activity size={20} />
            <span>실시간 학습 현황</span>
          </Link>
          <Link to="/admin/clusters" className="nav-link">
            <Globe size={20} />
            <span>Multi-Verse (군집)</span>
          </Link>
          <Link to="/admin/users" className="nav-link">
            <Users size={20} />
            <span>User Access</span>
          </Link>
          <Link to="/admin/parents" className="nav-link">
            <Phone size={20} />
            <span>학부모 통합 관리</span>
          </Link>
          <Link to="/admin/applications" className="nav-link">
            <ClipboardList size={20} />
            <span>신청자 관리</span>
          </Link>
          <Link to="/admin/vacation-camp" className="nav-link">
            <Tent size={20} />
            <span>방학특강 관리</span>
          </Link>
          <Link to="/admin/crews" className="nav-link">
            <UserCheck size={20} />
            <span>스터디 크루 관리</span>
          </Link>
          <Link to="/admin/crew-guests" className="nav-link">
            <ShieldAlert size={20} />
            <span>게스트 회원 관리</span>
          </Link>
          <Link to="/admin/content" className="nav-link">
            <Layers size={20} />
            <span>Content Manager</span>
          </Link>
          <Link to="/admin/assignments" className="nav-link">
            <BookOpenText size={20} />
            <span>항행 일지 (과제 검토)</span>
          </Link>
          <Link to="/admin/monthly-evaluations" className="nav-link">
            <Trophy size={20} />
            <span>장학금, 상장</span>
          </Link>
          <Link to="/admin/mistake-notebook" className="nav-link">
            <BookOpenCheck size={20} />
            <span>오답노트 행성</span>
          </Link>
          <Link to="/admin/student-report" className="nav-link">
            <FileBarChart size={20} />
            <span>학생 성장 리포트</span>
          </Link>
          <Link to="/admin/ghost-cleaner" className="nav-link">
            <Ghost size={20} />
            <span>Ghost Cleaner</span>
          </Link>
          <Link to="/admin/streak-fixer" className="nav-link">
            <ShieldAlert size={20} />
            <span>Streak Fixer</span>
          </Link>
          <Link to="/admin/galaxy-ledger" className="nav-link">
            <Database size={20} />
            <span>아스라 광석 백필</span>
          </Link>
          <Link to="/admin/qa" className="nav-link">
            <MessageSquare size={20} />
            <span>Q&A Manager</span>
          </Link>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0', paddingTop: '10px' }}>
            <div style={{ padding: '0 1rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '5px' }}>Course Builders</div>
            <Link to="/admin/python-builder" className="nav-link">
              <Database size={20} />
              <span>Python Builder</span>
            </Link>
            <Link to="/admin/python-missions" className="nav-link">
              <BookOpenText size={20} />
              <span>Python Mission Control</span>
            </Link>
            <Link to="/admin/middle-math-builder" className="nav-link">
              <Database size={20} />
              <span>Middle Math Builder</span>
            </Link>
          </div>
        </nav>

        <div className="admin-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-content">
        <div className="content-wrapper glass">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
