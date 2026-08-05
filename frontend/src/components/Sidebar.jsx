import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  FileText,
  ShoppingCart,
  DollarSign,
  AlertCircle,
  Users,
  WalletCards,
  X,
  Activity,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Beef,
} from 'lucide-react';
import './Sidebar.css';
export default function Sidebar({
  isSidebarOpen,
  toggleSidebar,
  isAdmin,
  location,
  handleLogout,
}) {
  // --- STATE & HOOKS ---
  const [expandedMenus, setExpandedMenus] = useState({
    ganaderia: true,
    administracion: false,
  });

  // --- FUNCTIONS & HANDLERS ---
  const toggleMenu = (menu) =>
    setExpandedMenus((prev) => ({ ...prev, [menu]: !prev[menu] }));

  // Ocultar texto y ajustar padding si el sidebar está "colapsado" en desktop (no implementado visualmente con width dinámico aún,
  // pero el requerimiento dice "que la barra lateral se pueda esconder a la hora de darle click al logo").
  // Podemos manejar la clase 'sidebar-collapsed' y por CSS ocultar los labels, o si isSidebarOpen false en desktop significa oculto.

  const renderNavLink = (item, isSubItem = false) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={() => {
        if (window.innerWidth <= 768) toggleSidebar();
      }}
      aria-label={item.label}
      title={item.label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: isSubItem ? '8px 12px 8px 40px' : '10px 12px',
        borderRadius: '8px',
        color:
          location.pathname === item.to ||
          (item.to !== '/dashboard' && location.pathname.includes(item.to))
            ? item.color || 'var(--primary-color)'
            : 'var(--text-muted)',
        background:
          location.pathname === item.to ||
          (item.to !== '/dashboard' && location.pathname.includes(item.to))
            ? item.color
              ? `${item.color}1a`
              : 'rgba(76, 175, 80, 0.1)'
            : 'transparent',
        textDecoration: 'none',
        transition: 'all 0.2s',
        fontSize: '14px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      {item.icon} <span className="sidebar-label">{item.label}</span>
    </Link>
  );

  // --- MAIN RENDER ---
  return (
    <aside
      className={`sidebar ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}
      style={{
        width: isSidebarOpen ? '260px' : '80px',
        borderRight: '1px solid var(--panel-border)',
        background: '#0d1117',
        padding: isSidebarOpen ? '24px' : '24px 12px',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        transition: 'width 0.3s ease',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarOpen ? 'space-between' : 'center',
          marginBottom: '40px',
        }}
      >
        <div
          onClick={toggleSidebar}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
          }}
          role="button"
          aria-label="Alternar menú lateral"
          tabIndex={0}
        >
          <img
            src="/logo.png"
            alt="Logo Finca HM"
            width="40"
            height="40"
            style={{
              width: '40px',
              height: '40px',
              objectFit: 'contain',
              background: '#fff',
              borderRadius: '50%',
              minWidth: '40px',
            }}
          />
          {isSidebarOpen && (
            <h3
              style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}
            >
              Finca HM
            </h3>
          )}
        </div>
        <button
          className="mobile-only"
          onClick={toggleSidebar}
          aria-label="Cerrar menú"
          style={{ background: 'transparent', color: 'var(--text-muted)' }}
        >
          <X size={24} />
        </button>
      </div>

      <nav
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
          paddingRight: '4px',
          overflowX: 'hidden',
        }}
        className="custom-scrollbar"
      >
        {isAdmin ? (
          <>
            {renderNavLink({
              to: '/dashboard',
              icon: <LayoutDashboard size={20} />,
              label: 'Inicio',
            })}
            {renderNavLink({
              to: '/dashboard/requests',
              icon: <AlertCircle size={20} />,
              label: 'Solicitudes Pendientes',
              color: '#E91E63',
            })}

            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => {
                  if (!isSidebarOpen) toggleSidebar();
                  else toggleMenu('ganaderia');
                }}
                aria-expanded={expandedMenus.ganaderia}
                aria-label="Menú Ganadería"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isSidebarOpen ? 'space-between' : 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  ':hover': { background: 'rgba(255,255,255,0.05)' },
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  <Beef
                    size={20}
                    color="#4CAF50"
                    style={{ minWidth: '20px' }}
                  />
                  {isSidebarOpen && <span>Ganadería</span>}
                </div>
                {isSidebarOpen &&
                  (expandedMenus.ganaderia ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>
              {expandedMenus.ganaderia && isSidebarOpen && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px',
                  }}
                >
                  {renderNavLink(
                    {
                      to: '/dashboard/animals',
                      icon: <FileText size={16} />,
                      label: 'Inventario General',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/calving-control',
                      icon: <LayoutDashboard size={16} />,
                      label: 'Control de Partos',
                      color: '#FF9800',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/purchases',
                      icon: <ShoppingCart size={16} />,
                      label: 'Compras',
                      color: '#2196F3',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/sales',
                      icon: <DollarSign size={16} />,
                      label: 'Ventas',
                      color: '#4CAF50',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/deaths',
                      icon: <AlertCircle size={16} />,
                      label: 'Muertes / Bajas',
                      color: '#ff9800',
                    },
                    true,
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '8px' }}>
              <button
                onClick={() => {
                  if (!isSidebarOpen) toggleSidebar();
                  else toggleMenu('administracion');
                }}
                aria-expanded={expandedMenus.administracion}
                aria-label="Menú Administración"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isSidebarOpen ? 'space-between' : 'center',
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  ':hover': { background: 'rgba(255,255,255,0.05)' },
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '500',
                    fontSize: '14px',
                  }}
                >
                  <Briefcase
                    size={20}
                    color="#9C27B0"
                    style={{ minWidth: '20px' }}
                  />
                  {isSidebarOpen && <span>Administración</span>}
                </div>
                {isSidebarOpen &&
                  (expandedMenus.administracion ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  ))}
              </button>
              {expandedMenus.administracion && isSidebarOpen && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginTop: '4px',
                  }}
                >
                  {renderNavLink(
                    {
                      to: '/dashboard/workers',
                      icon: <Users size={16} />,
                      label: 'Trabajadores',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/payroll',
                      icon: <WalletCards size={16} />,
                      label: 'Pago de Planilla',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/users',
                      icon: <Users size={16} />,
                      label: 'Gestión Usuarios',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/external-expenses',
                      icon: <DollarSign size={16} />,
                      label: 'Gastos Externos',
                      color: '#ef4444',
                    },
                    true,
                  )}
                  {renderNavLink(
                    {
                      to: '/dashboard/logs',
                      icon: <Activity size={16} />,
                      label: 'Bitácora',
                      color: '#10b981',
                    },
                    true,
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {renderNavLink({
              to: '/dashboard',
              icon: <LayoutDashboard size={20} />,
              label: 'Inicio',
            })}
            {renderNavLink({
              to: '/dashboard/animals',
              icon: <FileText size={20} />,
              label: 'Nacimientos',
            })}
            {renderNavLink({
              to: '/dashboard/deaths',
              icon: <AlertCircle size={20} />,
              label: 'Muertes / Bajas',
              color: '#ff9800',
            })}
          </>
        )}
      </nav>

      <button
        onClick={handleLogout}
        aria-label="Cerrar sesión"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isSidebarOpen ? 'flex-start' : 'center',
          gap: '12px',
          padding: '12px',
          borderRadius: '8px',
          color: 'var(--danger-color)',
          background: 'transparent',
          width: '100%',
          textAlign: 'left',
          border: '1px solid transparent',
          marginTop: 'auto',
        }}
        className="logout-btn"
      >
        <LogOut size={20} style={{ minWidth: '20px' }} />
        {isSidebarOpen && <span>Cerrar Sesión</span>}
      </button>
    </aside>
  );
}
