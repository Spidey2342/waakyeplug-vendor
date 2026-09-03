import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import AdminHome from './pages/AdminHome';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AdminHome />;
}