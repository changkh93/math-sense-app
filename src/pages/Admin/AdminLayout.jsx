import { Link, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { LayoutDashboard, Globe, Layers, LogOut, Database, MessageSquare, Ghost, Users, ShieldAlert } from 'lucide-react';
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
          <Link to="/admin/clusters" className="nav-link">
            <Globe size={20} />
            <span>Multi-Verse (군집)</span>
          </Link>
          <Link to="/admin/users" className="nav-link">
            <Users size={20} />
            <span>User Access</span>
          </Link>
          <Link to="/admin/content" className="nav-link">
            <Layers size={20} />
            <span>Content Manager</span>
          </Link>
          <Link to="/admin/ghost-cleaner" className="nav-link">
            <Ghost size={20} />
            <span>Ghost Cleaner</span>
          </Link>
          <Link to="/admin/streak-fixer" className="nav-link">
            <ShieldAlert size={20} />
            <span>Streak Fixer</span>
          </Link>
          <Link to="/admin/qa" className="nav-link">
            <MessageSquare size={20} />
            <span>Q&A Manager</span>
          </Link>
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
