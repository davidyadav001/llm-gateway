import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="mark" />
        <div>
          <div className="name">Gateway Console</div>
          <div className="sub">access-control · v1</div>
        </div>
      </div>

      <nav className="nav-group">
        <a className="nav-link active" href="/">
          {user?.role === 'Admin' ? 'Monitoring' : 'My activity'}
        </a>
      </nav>

      {user && (
        <div className="sidebar-user">
          <div className="email">{user.email}</div>
          <span className="role-badge">{user.role}</span>
          <div>
            <button onClick={() => logout()}>Sign out</button>
          </div>
        </div>
      )}
    </aside>
  );
}

function ProtectedShell() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div className="login-shell" aria-busy="true" />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <DashboardPage />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedShell />} />
    </Routes>
  );
}
