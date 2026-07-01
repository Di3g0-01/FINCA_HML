import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, LogOut, FileText, ShoppingCart, DollarSign, AlertCircle, Users, WalletCards, Menu, X, Activity, ChevronDown, ChevronRight, Briefcase, Beef } from 'lucide-react';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Lazy load components for better initial performance
const AnimalsView = lazy(() => import('../components/AnimalsView'));
const CalvingControlView = lazy(() => import('../components/CalvingControlView'));
const WorkersView = lazy(() => import('./WorkersView'));
const PayrollView = lazy(() => import('./PayrollView'));
const PurchasesView = lazy(() => import('./PurchasesView'));
const SalesView = lazy(() => import('./SalesView'));
const DeathsView = lazy(() => import('./DeathsView'));
const UsersView = lazy(() => import('./UsersView'));
const LogsView = lazy(() => import('./LogsView'));
const RequestsAdminView = lazy(() => import('./RequestsAdminView'));

export default function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ADMIN';
  const [expandedMenus, setExpandedMenus] = useState({ ganaderia: true, administracion: false });

  const handleLogout = () => navigate('/login');
  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleMenu = (menu) => setExpandedMenus(prev => ({ ...prev, [menu]: !prev[menu] }));

  const renderNavLink = (item, isSubItem = false) => (
    <Link 
      key={item.to} to={item.to} onClick={() => setIsSidebarOpen(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: isSubItem ? '8px 12px 8px 40px' : '10px 12px', borderRadius: '8px', color: location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.includes(item.to)) ? (item.color || 'var(--primary-color)') : 'var(--text-muted)', background: location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.includes(item.to)) ? (item.color ? `${item.color}1a` : 'rgba(76, 175, 80, 0.1)') : 'transparent', textDecoration: 'none', transition: 'all 0.2s', fontSize: '14px' }}>
      {item.icon} {item.label}
    </Link>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {/* Mobile Header */}
      <div className="mobile-only" style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '60px', background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', display: 'flex', alignItems: 'center', padding: '0 20px', zIndex: 900, borderBottom: '1px solid var(--panel-border)' }}>
        <button onClick={toggleSidebar} style={{ background: 'transparent', color: 'white' }}><Menu size={24} /></button>
        <span style={{ marginLeft: '16px', fontWeight: 'bold' }}>Finca HML</span>
      </div>

      {isSidebarOpen && <div className="mobile-only" onClick={toggleSidebar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} />}

      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-visible' : 'sidebar-hidden'}`} style={{ width: '260px', borderRight: '1px solid var(--panel-border)', background: '#0d1117', padding: '24px', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/src/assets/logo.png" alt="Logo Finca HML" style={{ width: '40px', height: '40px', objectFit: 'contain', background: '#fff', borderRadius: '50%' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>Finca HML</h3>
          </div>
          <button className="mobile-only" onClick={toggleSidebar} style={{ background: 'transparent', color: 'var(--text-muted)' }}><X size={24} /></button>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '4px' }} className="custom-scrollbar">
          {isAdmin ? (
            <>
              {renderNavLink({ to: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Inicio" })}
              {renderNavLink({ to: "/dashboard/requests", icon: <AlertCircle size={20} />, label: "Solicitudes Pendientes", color: '#E91E63' })}

              <div style={{ marginTop: '8px' }}>
                <button onClick={() => toggleMenu('ganaderia')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', color: 'white', padding: '10px 12px', cursor: 'pointer', borderRadius: '8px', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500', fontSize: '14px' }}>
                    <Beef size={20} color="#4CAF50" /> Ganadería
                  </div>
                  {expandedMenus.ganaderia ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {expandedMenus.ganaderia && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {renderNavLink({ to: "/dashboard/animals", icon: <FileText size={16} />, label: "Inventario General" }, true)}
                    {renderNavLink({ to: "/dashboard/calving-control", icon: <LayoutDashboard size={16} />, label: "Control de Partos", color: '#FF9800' }, true)}
                    {renderNavLink({ to: "/dashboard/purchases", icon: <ShoppingCart size={16} />, label: "Compras", color: '#2196F3' }, true)}
                    {renderNavLink({ to: "/dashboard/sales", icon: <DollarSign size={16} />, label: "Ventas", color: '#4CAF50' }, true)}
                    {renderNavLink({ to: "/dashboard/deaths", icon: <AlertCircle size={16} />, label: "Muertes / Bajas", color: '#ff9800' }, true)}
                  </div>
                )}
              </div>

              <div style={{ marginTop: '8px' }}>
                <button onClick={() => toggleMenu('administracion')} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 'none', color: 'white', padding: '10px 12px', cursor: 'pointer', borderRadius: '8px', ':hover': { background: 'rgba(255,255,255,0.05)' } }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '500', fontSize: '14px' }}>
                    <Briefcase size={20} color="#9C27B0" /> Administración
                  </div>
                  {expandedMenus.administracion ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                {expandedMenus.administracion && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {renderNavLink({ to: "/dashboard/workers", icon: <Users size={16} />, label: "Trabajadores" }, true)}
                    {renderNavLink({ to: "/dashboard/payroll", icon: <WalletCards size={16} />, label: "Pago de Planilla" }, true)}
                    {renderNavLink({ to: "/dashboard/users", icon: <Users size={16} />, label: "Gestión Usuarios" }, true)}
                    {renderNavLink({ to: "/dashboard/logs", icon: <Activity size={16} />, label: "Bitácora", color: '#10b981' }, true)}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {renderNavLink({ to: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Inicio" })}
              {renderNavLink({ to: "/dashboard/animals", icon: <FileText size={20} />, label: "Nacimientos" })}
              {renderNavLink({ to: "/dashboard/deaths", icon: <AlertCircle size={20} />, label: "Muertes / Bajas", color: '#ff9800' })}
            </>
          )}
        </nav>

        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', color: 'var(--danger-color)', background: 'transparent', width: '100%', textAlign: 'left', border: '1px solid transparent', marginTop: 'auto' }} className="logout-btn">
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </aside>

      <main className="main-content" style={{ flex: 1, padding: '40px', overflowY: 'auto', paddingTop: '80px' }}>
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

function DashboardHome() {
  const [animals, setAnimals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnimals = async () => {
      try {
        const res = await axios.get('http://localhost:3001/animals?limit=5000');
        setAnimals(res.data.data || res.data);
      } catch (error) {
        console.error('Error fetching animals:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnimals();
  }, []);

  const stats = useMemo(() => {
    const activos = animals.filter(a => a.status === 'ACTIVO');
    return {
      totalActivos: activos.length,
      totalVacas: activos.filter(a => a.type === 'VACA').length,
      totalToros: activos.filter(a => a.type === 'TORO').length,
      totalNovillas: activos.filter(a => a.type === 'NOVILLA').length,
      totalToretes: activos.filter(a => a.type === 'TORETE').length,
      totalChivos: activos.filter(a => ['CHIVA', 'CHIVO'].includes(a.type)).length,
      activos
    };
  }, [animals]);

  const latestAnimals = useMemo(() => {
    return [...animals]
      .map(a => {
        let movementDate = a.created_at;
        let movementType = a.origin === 'COMPRA' ? 'Compra' : 'Añadido';
        if (a.status === 'VENDIDO' && a.sale_date) { movementDate = a.sale_date; movementType = 'Venta'; } 
        else if (a.status === 'MUERTO' && a.death_date) { movementDate = a.death_date; movementType = 'Muerte'; }
        else if (a.origin === 'COMPRA' && a.purchase_date) { movementDate = a.purchase_date; movementType = 'Compra'; }
        return { ...a, movementDate, movementType };
      })
      .sort((a, b) => new Date(b.movementDate) - new Date(a.movementDate))
      .slice(0, 5);
  }, [animals]);

  const typeData = useMemo(() => {
    const counts = {};
    stats.activos.forEach(a => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.keys(counts).map(type => ({
      name: type,
      value: counts[type]
    })).filter(l => l.value > 0);
  }, [stats.activos]);

  const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#E91E63', '#795548', '#00BCD4'];

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '8px' }}>FINCA HERMANOS MARTÍNEZ LARA</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Gestión ganadera optimizada</p>

      {isLoading ? ( <div style={{ color: 'var(--text-muted)' }}>Cargando estadísticas...</div> ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '40px' }}>
            <div className="premium-card" style={{ padding: '20px', borderTop: '4px solid var(--primary-color)' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '8px' }}>TOTAL ACTIVOS</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalActivos}</div>
            </div>
            <div className="premium-card" style={{ padding: '20px', borderTop: '4px solid #4CAF50' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>VACAS</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalVacas}</div>
            </div>
            <div className="premium-card" style={{ padding: '20px', borderTop: '4px solid #E91E63' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>NOVILLAS</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalNovillas}</div>
            </div>
            <div className="premium-card" style={{ padding: '20px', borderTop: '4px solid #9C27B0' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>CHIVAS / CHIVOS</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalChivos}</div>
            </div>
            <div className="premium-card" style={{ padding: '20px', borderTop: '4px solid #2196F3' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>TORETES</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalToretes}</div>
            </div>
            <div className="premium-card" style={{ padding: '20px', borderTop: '4px solid #FF9800' }}>
              <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', color: 'var(--text-muted)', fontSize: '11px', marginBottom: '8px' }}>TOROS</h3>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalToros}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '24px' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Últimos Movimientos</h2>
              <div className="premium-card">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                      <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Identificador</th>
                      <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Animal</th>
                      <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Movimiento</th>
                      <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha Evento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestAnimals.length === 0 ? ( <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Sin movimientos recientes.</td></tr> ) : (
                      latestAnimals.map(animal => (
                        <tr key={animal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '16px', fontWeight: 'bold' }}>{animal.identifier || 'Sin ID'}</td>
                          <td style={{ padding: '16px' }}>{animal.type}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{ padding: '4px 12px', background: animal.movementType === 'Venta' ? 'rgba(76, 175, 80, 0.2)' : animal.movementType === 'Compra' ? 'rgba(33, 150, 243, 0.2)' : animal.movementType === 'Muerte' ? 'rgba(255, 87, 34, 0.2)' : 'rgba(255, 255, 255, 0.1)', color: animal.movementType === 'Venta' ? '#4CAF50' : animal.movementType === 'Compra' ? '#2196F3' : animal.movementType === 'Muerte' ? '#FF5722' : 'white', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                              {animal.movementType.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(animal.movementDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Distribución por Tipo</h2>
              <div className="premium-card" style={{ height: '350px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {typeData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : ( <div style={{ color: 'var(--text-muted)' }}>No hay animales activos.</div> )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
