import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Calendar,
  Heart,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Clock,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

export default function DashboardHome() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isOperator = user.role === 'OPERADOR';
  const isAdminOrSuper = user.role === 'ADMIN' || user.role === 'SUPERUSER';

  // --- QUERIES ---
  const fetchAnimals = async () => {
    const res = await axios.get('/animals?limit=5000');
    return res.data.data || res.data;
  };

  const fetchExternalExpenses = async () => {
    if (isOperator) return [];
    try {
      const res = await axios.get('/external-expenses');
      return res.data || [];
    } catch (e) {
      return [];
    }
  };

  const {
    data: animals = [],
    isLoading: isLoadingAnimals,
    isError: isErrorAnimals,
  } = useQuery({
    queryKey: ['animals'],
    queryFn: fetchAnimals,
  });

  const { data: externalExpenses = [] } = useQuery({
    queryKey: ['externalExpensesDashboard'],
    queryFn: fetchExternalExpenses,
    enabled: isAdminOrSuper,
  });

  // --- STATS COMPUTATION ---
  const stats = useMemo(() => {
    const activos = animals.filter((a) => a.status === 'ACTIVO');

    // Desglose por tipo
    const counts = {};
    activos.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });

    // Vacas / hembras gestantes próximas a parir
    const pregnantCows = activos
      .filter((a) => a.is_pregnant)
      .map((a) => {
        let months = a.pregnancy_months || 0;
        if (a.pregnancy_start_date) {
          const start = new Date(a.pregnancy_start_date);
          const diffDays =
            (new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          let m = diffDays / 30.4375;
          if (m > 10.0) m = 10.0;
          months = Math.round(m * 10) / 10;
        }

        let estimatedBirthDate;
        if (a.pregnancy_start_date) {
          const start = new Date(a.pregnancy_start_date);
          estimatedBirthDate = new Date(
            start.getTime() + 283 * 24 * 60 * 60 * 1000,
          );
        } else {
          const monthsLeft = 9 - months;
          const daysLeft = Math.round(monthsLeft * 30.4375);
          estimatedBirthDate = new Date();
          estimatedBirthDate.setDate(estimatedBirthDate.getDate() + daysLeft);
        }

        return {
          ...a,
          calculatedMonths: months,
          estimatedBirthDate,
          isNearCalving: months >= 7.5,
        };
      })
      .sort((a, b) => a.estimatedBirthDate - b.estimatedBirthDate);

    // Próximos cambios de estado por edad
    const upcomingAgeEvolutions = activos
      .filter((a) => a.birth_date && a.type !== 'CABALLO')
      .map((a) => {
        const birth = new Date(a.birth_date);
        const now = new Date();
        const ageDays = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
        const ageMonths = ageDays / 30.4375;

        const isMale =
          a.sex === 'M' ||
          ['TORO', 'TORETE', 'CHIVO', 'DESMADRE_MACHO'].includes(a.type);

        let nextType = null;
        let targetAgeMonths = null;

        if (isMale) {
          if (ageMonths <= 6.5) {
            nextType = 'DESMADRE_MACHO';
            targetAgeMonths = 6.5;
          } else if (ageMonths < 12) {
            nextType = 'TORETE';
            targetAgeMonths = 12;
          } else if (ageMonths < 24) {
            nextType = 'TORO';
            targetAgeMonths = 24;
          }
        } else {
          if (ageMonths <= 6.5) {
            nextType = 'DESMADRE_HEMBRA';
            targetAgeMonths = 6.5;
          } else if (ageMonths < 12) {
            nextType = 'NOVILLA';
            targetAgeMonths = 12;
          } else if (ageMonths < 24) {
            nextType = 'VACA';
            targetAgeMonths = 24;
          }
        }

        if (!nextType || targetAgeMonths === null) return null;

        const daysUntilTarget = (targetAgeMonths - ageMonths) * 30.4375;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + Math.round(daysUntilTarget));

        return {
          ...a,
          currentAgeMonths: Math.round(ageMonths * 10) / 10,
          nextType,
          targetDate,
          daysLeft: Math.round(daysUntilTarget),
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.targetDate - b.targetDate)
      .slice(0, 10);

    return {
      totalActivos: activos.length,
      counts,
      pregnantCows,
      upcomingAgeEvolutions,
    };
  }, [animals]);

  // --- FINANCIAL CALCULATIONS (ONLY FOR SUPERUSER / ADMIN) ---
  const financialStats = useMemo(() => {
    if (isOperator) return null;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Ventas del mes actual
    const salesThisMonth = animals.filter((a) => {
      if (a.status !== 'VENDIDO' || !a.sale_date) return false;
      const d = new Date(a.sale_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const incomeTotal = salesThisMonth.reduce(
      (sum, a) => sum + (parseFloat(a.sale_price) || 0),
      0,
    );

    // Compras del mes actual
    const purchasesThisMonth = animals.filter((a) => {
      if (a.origin !== 'COMPRA' || !a.purchase_date) return false;
      const d = new Date(a.purchase_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const purchasesTotal = purchasesThisMonth.reduce(
      (sum, a) => sum + (parseFloat(a.purchase_price) || 0),
      0,
    );

    // Gastos externos del mes actual
    const externalTotal = externalExpenses
      .filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return (
          d.getMonth() === currentMonth && d.getFullYear() === currentYear
        );
      })
      .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

    const expensesTotal = purchasesTotal + externalTotal;
    const netBalance = incomeTotal - expensesTotal;

    return {
      incomeTotal,
      expensesTotal,
      purchasesTotal,
      externalTotal,
      netBalance,
      salesCount: salesThisMonth.length,
      purchasesCount: purchasesThisMonth.length,
    };
  }, [animals, externalExpenses, isOperator]);

  // Últimos movimientos generales
  const latestMovements = useMemo(() => {
    return [...animals]
      .map((a) => {
        let movementDate = a.created_at;
        let movementType = a.origin === 'COMPRA' ? 'Compra' : 'Nacimiento';
        if (a.status === 'VENDIDO' && a.sale_date) {
          movementDate = a.sale_date;
          movementType = 'Venta';
        } else if (a.status === 'MUERTO' && a.death_date) {
          movementDate = a.death_date;
          movementType = 'Muerte';
        } else if (a.origin === 'COMPRA' && a.purchase_date) {
          movementDate = a.purchase_date;
          movementType = 'Compra';
        }
        return { ...a, movementDate, movementType };
      })
      .sort((a, b) => new Date(b.movementDate) - new Date(a.movementDate))
      .slice(0, 6);
  }, [animals]);

  const COLORS = {
    CHIVA: '#4CAF50',
    CHIVO: '#2196F3',
    DESMADRE_HEMBRA: '#FF9800',
    DESMADRE_MACHO: '#9C27B0',
    NOVILLA: '#00BCD4',
    TORETE: '#E91E63',
    VACA: '#10B981',
    TORO: '#F44336',
    CABALLO: '#795548',
  };

  return (
    <div className="fade-in" style={{ paddingBottom: '40px' }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', marginBottom: '4px' }}>
            FINCA MARTÍNEZ
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {isOperator
              ? 'Panel Operativo de Control Ganadero'
              : 'Panel General de Control Fincas & Finanzas'}
          </p>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '8px 16px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isOperator ? '#3B82F6' : '#10B981',
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>Rol de Acceso:</span>
          <strong style={{ color: '#fff' }}>{user.role || 'USUARIO'}</strong>
        </div>
      </div>

      {isLoadingAnimals ? (
        <div style={{ color: 'var(--text-muted)', padding: '40px 0' }}>
          Cargando panel de información...
        </div>
      ) : isErrorAnimals ? (
        <div style={{ color: 'var(--danger-color)', padding: '40px 0' }}>
          Ocurrió un error al cargar los datos del sistema.
        </div>
      ) : (
        <>
          {/* TOP KPI CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isOperator
                ? 'repeat(auto-fit, minmax(220px, 1fr))'
                : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            {/* Total Activos */}
            <div
              className="premium-card"
              style={{
                padding: '20px',
                borderTop: '4px solid #3B82F6',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                  }}
                >
                  TOTAL GANADO ACTIVO
                </span>
                <Layers size={20} color="#3B82F6" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold' }}>
                {stats.totalActivos}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Animales registrados
              </span>
            </div>

            {/* Vacas Próximas a Parir */}
            <div
              className="premium-card"
              style={{
                padding: '20px',
                borderTop: '4px solid #FF9800',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <span
                  style={{
                    color: '#FF9800',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                  }}
                >
                  VACAS POR PARIR
                </span>
                <Heart size={20} color="#FF9800" />
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#FF9800' }}>
                {stats.pregnantCows.length}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {stats.pregnantCows.filter((c) => c.isNearCalving).length} a punto de parir (&gt;= 7.5 m)
              </span>
            </div>

            {/* FINANCIAL CARDS - ONLY SUPERUSER / ADMIN */}
            {isAdminOrSuper && financialStats && (
              <>
                <div
                  className="premium-card"
                  style={{
                    padding: '20px',
                    borderTop: '4px solid #10B981',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span
                      style={{
                        color: '#10B981',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                      }}
                    >
                      INGRESOS MES ACTUAL
                    </span>
                    <TrendingUp size={20} color="#10B981" />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#10B981' }}>
                    Q {financialStats.incomeTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {financialStats.salesCount} ventas realizadas
                  </span>
                </div>

                <div
                  className="premium-card"
                  style={{
                    padding: '20px',
                    borderTop: '4px solid #EF4444',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span
                      style={{
                        color: '#EF4444',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                      }}
                    >
                      GASTOS MES ACTUAL
                    </span>
                    <TrendingDown size={20} color="#EF4444" />
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#EF4444' }}>
                    Q {financialStats.expensesTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Compras + Gastos Operativos
                  </span>
                </div>

                <div
                  className="premium-card"
                  style={{
                    padding: '20px',
                    borderTop: `4px solid ${financialStats.netBalance >= 0 ? '#10B981' : '#EF4444'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                      }}
                    >
                      BALANCE NETO
                    </span>
                    <DollarSign size={20} color={financialStats.netBalance >= 0 ? '#10B981' : '#EF4444'} />
                  </div>
                  <div
                    style={{
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      color: financialStats.netBalance >= 0 ? '#10B981' : '#EF4444',
                    }}
                  >
                    Q {financialStats.netBalance.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Diferencia del mes
                  </span>
                </div>
              </>
            )}
          </div>

          {/* DESGLOSE POR TIPO DE ANIMAL */}
          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={20} color="#3B82F6" /> Desglose de Ganado Activo por Categoría
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '12px',
              }}
            >
              {Object.keys(stats.counts).map((typeKey) => {
                const color = COLORS[typeKey] || '#94A3B8';
                return (
                  <div
                    key={typeKey}
                    className="premium-card"
                    style={{
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderLeft: `4px solid ${color}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                      }}
                    >
                      {typeKey.replace(/_/g, ' ')}
                    </span>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>
                      {stats.counts[typeKey]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CLASIFICACIÓN POR EDAD Y PRÓXIMOS CAMBIOS DE ESTADO */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
              gap: '24px',
              marginBottom: '36px',
            }}
          >
            {/* Tabla de Reglas de Clasificación por Edad */}
            <div className="premium-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={20} /> Reglas de Clasificación por Edad
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Los animales evolucionan de categoría automáticamente en el sistema según su edad biológica:
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '10px 12px' }}>Rango de Edad</th>
                      <th style={{ padding: '10px 12px' }}>Categoría Macho</th>
                      <th style={{ padding: '10px 12px' }}>Categoría Hembra</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#38BDF8' }}>0 a 6.5 meses</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(33,150,243,0.15)', color: '#2196F3', fontWeight: 'bold' }}>CHIVO</span></td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(76,175,80,0.15)', color: '#4CAF50', fontWeight: 'bold' }}>CHIVA</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#38BDF8' }}>6.5 a 12 meses</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(156,39,176,0.15)', color: '#9C27B0', fontWeight: 'bold' }}>DESMADRE MACHO</span></td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 'bold' }}>DESMADRE HEMBRA</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#38BDF8' }}>1 a 2 años (12-24m)</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(233,30,99,0.15)', color: '#E91E63', fontWeight: 'bold' }}>TORETE</span></td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(0,188,212,0.15)', color: '#00BCD4', fontWeight: 'bold' }}>NOVILLA</span></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: '#38BDF8' }}>&gt; 2 años (&gt; 24m)</td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(244,67,54,0.15)', color: '#F44336', fontWeight: 'bold' }}>TORO</span></td>
                      <td style={{ padding: '12px' }}><span style={{ padding: '2px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 'bold' }}>VACA</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Próximos Cambios de Estado por Edad (Lista) */}
            <div className="premium-card" style={{ padding: '24px' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} /> Próximos Cambios de Estado (Evolución)
              </h2>
              {stats.upcomingAgeEvolutions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                  No hay animales jóvenes con fecha de nacimiento próxima a cambiar de estado.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '10px' }}>ID Animal</th>
                        <th style={{ padding: '10px' }}>Tipo Actual</th>
                        <th style={{ padding: '10px' }}>Edad</th>
                        <th style={{ padding: '10px' }}>Próximo Estado</th>
                        <th style={{ padding: '10px' }}>Fecha Est. Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.upcomingAgeEvolutions.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px', fontWeight: 'bold' }}>{item.identifier}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.type}</span>
                          </td>
                          <td style={{ padding: '10px' }}>{item.currentAgeMonths} m</td>
                          <td style={{ padding: '10px' }}>
                            <span style={{ padding: '2px 8px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: '6px', fontWeight: 'bold', fontSize: '11px' }}>
                              {item.nextType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '10px', color: '#fff', fontWeight: '500' }}>
                            {item.targetDate.toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* VACAS PRÓXIMAS A PARIR (TABLA DETALLADA) */}
          <div className="premium-card" style={{ padding: '24px', marginBottom: '36px' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '16px', color: '#FF9800', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={20} color="#FF9800" /> Vacas Próximas a Parir (Predicción)
            </h2>
            {stats.pregnantCows.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px', textAlign: 'center' }}>
                No hay vacas o novillas actualmente registradas en gestación activa.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '12px' }}>Identificador</th>
                      <th style={{ padding: '12px' }}>Clasificación</th>
                      <th style={{ padding: '12px' }}>Lote</th>
                      <th style={{ padding: '12px' }}>Gestación Actual</th>
                      <th style={{ padding: '12px' }}>Predicción de Parto</th>
                      <th style={{ padding: '12px' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.pregnantCows.map((cow) => (
                      <tr key={cow.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px', fontWeight: 'bold' }}>{cow.identifier}</td>
                        <td style={{ padding: '12px' }}>{cow.type}</td>
                        <td style={{ padding: '12px', color: 'var(--text-muted)' }}>{cow.lote || 'GENERAL'}</td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#FF9800' }}>
                          {cow.calculatedMonths} meses
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', color: '#10B981' }}>
                          {cow.estimatedBirthDate.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {cow.isNearCalving ? (
                            <span style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                              A PUNTO DE PARIR
                            </span>
                          ) : (
                            <span style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                              EN GESTACIÓN
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECCIÓN FINANCIERA & MOVIMIENTOS (SOLO PARA SUPERUSUARIOS Y ADMINISTRADORES) */}
          {isAdminOrSuper && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
                gap: '24px',
              }}
            >
              {/* Últimos Movimientos de Ganado */}
              <div className="premium-card" style={{ padding: '24px' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>
                  Últimos Movimientos de Ganado
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Identificador</th>
                        <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Tipo</th>
                        <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Evento</th>
                        <th style={{ padding: '10px', color: 'var(--text-muted)' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestMovements.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Sin movimientos recientes.
                          </td>
                        </tr>
                      ) : (
                        latestMovements.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '10px', fontWeight: 'bold' }}>{a.identifier || 'S/N'}</td>
                            <td style={{ padding: '10px' }}>{a.type}</td>
                            <td style={{ padding: '10px' }}>
                              <span
                                style={{
                                  padding: '4px 10px',
                                  background:
                                    a.movementType === 'Venta'
                                      ? 'rgba(76, 175, 80, 0.2)'
                                      : a.movementType === 'Compra'
                                        ? 'rgba(33, 150, 243, 0.2)'
                                        : a.movementType === 'Muerte'
                                          ? 'rgba(255, 87, 34, 0.2)'
                                          : 'rgba(255, 255, 255, 0.1)',
                                  color:
                                    a.movementType === 'Venta'
                                      ? '#4CAF50'
                                      : a.movementType === 'Compra'
                                        ? '#2196F3'
                                        : a.movementType === 'Muerte'
                                          ? '#FF5722'
                                          : 'white',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                }}
                              >
                                {a.movementType.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '10px', color: 'var(--text-muted)' }}>
                              {new Date(a.movementDate).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Resumen de Flujo de Caja del Mes */}
              {financialStats && (
                <div className="premium-card" style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: '#10B981' }}>
                    Resumen Financiero del Mes Actual
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#10B981' }}>Ventas de Ganado</div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{financialStats.salesCount} ventas registadas</span>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10B981' }}>
                        + Q {financialStats.incomeTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#EF4444' }}>Compras de Ganado</div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{financialStats.purchasesCount} compras este mes</span>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#EF4444' }}>
                        - Q {financialStats.purchasesTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#EF4444' }}>Gastos Operativos Externos</div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Facturas y gastos generales</span>
                      </div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#EF4444' }}>
                        - Q {financialStats.externalTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', borderTop: '2px solid var(--panel-border)', marginTop: '8px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Balance Neto Mensual</div>
                      <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: financialStats.netBalance >= 0 ? '#10B981' : '#EF4444' }}>
                        Q {financialStats.netBalance.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
