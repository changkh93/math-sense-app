import { Link, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { LayoutDashboard, Map, BookOpen, Layers, LogOut } from 'lucide-react';
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
          <Link to="/admin/content" className="nav-link">
            <Layers size={20} />
            <span>Content Manager</span>
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
