import { Navigate } from 'react-router-dom';
import { useAdmin } from '../hooks/useAdmin';

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAdmin();

  if (loading) {
    return <div>Loading Admin Access...</div>; // Or a proper loading spinner
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminRoute;
