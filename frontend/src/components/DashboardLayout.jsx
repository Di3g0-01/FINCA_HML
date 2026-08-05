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

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    // Si la cookie es HttpOnly, el backend la debe borrar, así que aquí solo limpiamos localStorage y navegamos
    // o llamamos a un endpoint de logout si existe. Por ahora, solo navegamos a login.
    navigate('/login');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Mobile Header */}
      <div className="mobile-only" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 900, borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button onClick={toggleSidebar} aria-label="Abrir menú" style={{ background: 'transparent', color: 'white', border: 'none', padding: 0 }}><Menu size={24} /></button>
          <span style={{ marginLeft: '16px', fontWeight: 'bold' }}>Finca HM</span>
        </div>
        <div style={{ flex: 1 }} />
        <NotificationBell />
      </div>

      {/* Desktop Notification Bell */}
      <div className="desktop-only" style={{ position: 'fixed', top: '20px', right: '30px', zIndex: 990 }}>
        <NotificationBell />
      </div>

      {isSidebarOpen && window.innerWidth <= 768 && <div className="mobile-only" onClick={toggleSidebar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />}

      <Sidebar 
        isSidebarOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        isAdmin={isAdmin} 
        location={location} 
        handleLogout={handleLogout} 
      />

      <main className={`main-content ${isSidebarOpen ? 'sidebar-expanded-content' : 'sidebar-collapsed-content'}`} style={{ 
        flex: 1, 
        padding: '40px', 
        overflowY: 'auto', 
        paddingTop: window.innerWidth <= 768 ? '80px' : '40px',
        transition: 'all 0.3s ease'
      }}>
        <Suspense fallback={<div style={{ padding: '20px', color: 'var(--text-muted)' }}>Cargando vista...</div>}>
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
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
