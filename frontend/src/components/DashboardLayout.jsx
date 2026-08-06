import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import DashboardHome from '../pages/DashboardHome';
import NotificationBell from './NotificationBell';

// Lazy load components for better initial performance
const AnimalsView = lazy(() => import('./AnimalsView'));
const CalvingControlView = lazy(() => import('./CalvingControlView'));
const WorkersView = lazy(() => import('../pages/WorkersView'));
const PayrollView = lazy(() => import('../pages/PayrollView'));
const PurchasesView = lazy(() => import('../pages/PurchasesView'));
const SalesView = lazy(() => import('../pages/SalesView'));
const DeathsView = lazy(() => import('../pages/DeathsView'));
const UsersView = lazy(() => import('../pages/UsersView'));
const LogsView = lazy(() => import('../pages/LogsView'));
const RequestsAdminView = lazy(() => import('../pages/RequestsAdminView'));
const ExternalExpensesView = lazy(
  () => import('../pages/ExternalExpensesView'),
);

export default function DashboardLayout() {
  // --- STATE & HOOKS ---
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN' || user.role === 'SUPERUSER';
  const isSuperuser = user.role === 'SUPERUSER';

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- FUNCTIONS & HANDLERS ---
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // --- MAIN RENDER ---
  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Mobile Header */}
      <div
        className="mobile-only"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          zIndex: 900,
          borderBottom: '1px solid var(--panel-border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={toggleSidebar}
            aria-label="Abrir menú"
            style={{
              background: 'transparent',
              color: 'white',
              border: 'none',
              padding: 0,
            }}
          >
            <Menu size={24} />
          </button>
          <span style={{ marginLeft: '16px', fontWeight: 'bold' }}>
            Finca HM
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <NotificationBell />
      </div>

      {/* Desktop Header */}
      <div
        className="desktop-only"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          left: isSidebarOpen ? '260px' : '80px',
          height: '70px',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 30px',
          zIndex: 900,
          borderBottom: '1px solid var(--panel-border)',
          transition: 'left 0.3s ease',
        }}
      >
        <NotificationBell />
      </div>

      {isSidebarOpen && window.innerWidth <= 768 && (
        <div
          className="mobile-only"
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 999,
          }}
        />
      )}

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={toggleSidebar}
        isAdmin={isAdmin}
        isSuperuser={isSuperuser}
        location={location}
        handleLogout={handleLogout}
      />

      <main
        className={`main-content ${isSidebarOpen ? 'sidebar-expanded-content' : 'sidebar-collapsed-content'}`}
        style={{
          flex: 1,
          padding: '40px',
          overflowY: 'auto',
          paddingTop: '80px',
          transition: 'all 0.3s ease',
        }}
      >
        <Suspense
          fallback={
            <div style={{ padding: '20px', color: 'var(--text-muted)' }}>
              Cargando vista...
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/animals" element={<AnimalsView />} />
            <Route path="/calving-control" element={<CalvingControlView />} />
            <Route path="/workers" element={<WorkersView />} />
            <Route path="/payroll" element={<PayrollView />} />
            <Route path="/purchases" element={<PurchasesView />} />
            <Route path="/sales" element={<SalesView />} />
            <Route path="/deaths" element={<DeathsView />} />
            <Route path="/users" element={<UsersView />} />
            <Route path="/logs" element={<LogsView />} />
            <Route path="/requests" element={<RequestsAdminView />} />
            <Route
              path="/external-expenses"
              element={<ExternalExpensesView />}
            />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
