import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
  ArrowRight,
} from 'lucide-react';

export default function DashboardHome() {
  const navigate = useNavigate();
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

    // Próximos cambios de estado por edad (Máximo 5)
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
      .sort((a, b) => a.targetDate - b.targetDate);

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
    const currentMonth = now.getMonth(); // 0-indexed (9 for October)
    const currentYear = now.getFullYear();

    // Helper para extracción segura de año y mes de cadenas de fecha (YYYY-MM-DD o ISO)
    const parseYearMonth = (dateStr) => {
      if (!dateStr) return null;
      if (typeof dateStr === 'string') {
        const cleanStr = dateStr.split('T')[0];
        const parts = cleanStr.split('-');
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1; // 0-indexed
          if (!isNaN(y) && !isNaN(m)) {
            return { year: y, month: m };
          }
        }
      }
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      return { year: d.getFullYear(), month: d.getMonth() };
    };

    // Ventas del mes actual
    const salesThisMonth = animals.filter((a) => {
      if (a.status !== 'VENDIDO' || !a.sale_date) return false;
      const parsed = parseYearMonth(a.sale_date);
      return parsed && parsed.month === currentMonth && parsed.year === currentYear;
    });

    const incomeTotal = salesThisMonth.reduce(
      (sum, a) => sum + (parseFloat(a.sale_price) || 0),
      0,
    );

    // Compras del mes actual
    const purchasesThisMonth = animals.filter((a) => {
      if (a.origin === 'COMPRA' && a.purchase_date) {
        const parsed = parseYearMonth(a.purchase_date);
        return parsed && parsed.month === currentMonth && parsed.year === currentYear;
      }
      return false;
    });

    const purchasesTotal = purchasesThisMonth.reduce(
      (sum, a) => sum + (parseFloat(a.purchase_price) || 0),
      0,
    );

    // Gastos externos del mes actual
    const externalThisMonth = externalExpenses.filter((e) => {
      if (!e.date) return false;
      const parsed = parseYearMonth(e.date);
      return parsed && parsed.month === currentMonth && parsed.year === currentYear;
    });

    const externalTotal = externalThisMonth.reduce(
      (sum, e) => sum + (parseFloat(e.amount) || 0),
      0,
    );

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

  // Últimos movimientos generales (Máximo 4)
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
      .slice(0, 4);
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

  const displayedPregnantCows = stats.pregnantCows.slice(0, 5);
  const displayedEvolutions = stats.upcomingAgeEvolutions.slice(0, 5);

  return (
    <div className="fade-in" style={{ paddingBottom: '32px' }}>
      {/* HEADER */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', marginBottom: '4px' }}>
            FINCA MARTÍNEZ
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {isOperator
              ? 'Panel Operativo de Control Ganadero'
              : 'Panel General de Control Fincas & Finanzas'}
          </p>
        </div>
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOperator ? '#3B82F6' : '#10B981',
            }}
          />
          <span style={{ color: 'var(--text-muted)' }}>Rol:</span>
          <strong style={{ color: '#fff' }}>{user.role || 'USUARIO'}</strong>
        </div>
      </div>

      {isLoadingAnimals ? (
        <div style={{ color: 'var(--text-muted)', padding: '30px 0' }}>
          Cargando panel de información...
        </div>
      ) : isErrorAnimals ? (
        <div style={{ color: 'var(--danger-color)', padding: '30px 0' }}>
          Ocurrió un error al cargar los datos del sistema.
        </div>
      ) : (
        <>
          {/* TOP KPI CARDS */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isOperator
                ? 'repeat(auto-fit, minmax(200px, 1fr))'
                : 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            {/* Total Activos */}
            <div
              className="premium-card"
              style={{
                padding: '16px 20px',
                borderTop: '4px solid #3B82F6',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                  }}
                >
                  TOTAL GANADO ACTIVO
                </span>
                <Layers size={18} color="#3B82F6" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                {stats.totalActivos}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Animales en la finca
              </span>
            </div>

            {/* Vacas Próximas a Parir */}
            <div
              className="premium-card"
              style={{
                padding: '16px 20px',
                borderTop: '4px solid #FF9800',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    color: '#FF9800',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    letterSpacing: '0.05em',
                  }}
                >
                  VACAS POR PARIR
                </span>
                <Heart size={18} color="#FF9800" />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#FF9800' }}>
                {stats.pregnantCows.length}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {stats.pregnantCows.filter((c) => c.isNearCalving).length} a punto de parir (&gt;= 7.5 m)
              </span>
            </div>

            {/* FINANCIAL CARDS - ONLY SUPERUSER / ADMIN */}
            {isAdminOrSuper && financialStats && (
              <>
                <div
                  className="premium-card"
                  style={{
                    padding: '16px 20px',
                    borderTop: '4px solid #10B981',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        color: '#10B981',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                      }}
                    >
                      INGRESOS MES ACTUAL
                    </span>
                    <TrendingUp size={18} color="#10B981" />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10B981' }}>
                    Q {financialStats.incomeTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {financialStats.salesCount} ventas
                  </span>
                </div>

                <div
                  className="premium-card"
                  style={{
                    padding: '16px 20px',
                    borderTop: '4px solid #EF4444',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        color: '#EF4444',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                      }}
                    >
                      GASTOS MES ACTUAL
                    </span>
                    <TrendingDown size={18} color="#EF4444" />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#EF4444' }}>
                    Q {financialStats.expensesTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Compras + Gastos
                  </span>
                </div>

                <div
                  className="premium-card"
                  style={{
                    padding: '16px 20px',
                    borderTop: `4px solid ${financialStats.netBalance >= 0 ? '#10B981' : '#EF4444'}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        letterSpacing: '0.05em',
                      }}
                    >
                      BALANCE NETO
                    </span>
                    <DollarSign size={18} color={financialStats.netBalance >= 0 ? '#10B981' : '#EF4444'} />
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: 'bold',
                      color: financialStats.netBalance >= 0 ? '#10B981' : '#EF4444',
                    }}
                  >
                    Q {financialStats.netBalance.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Diferencia del mes
                  </span>
                </div>
              </>
            )}
          </div>

          {/* DESGLOSE POR TIPO DE ANIMAL */}
          <div style={{ marginBottom: '28px' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#3B82F6" /> Desglose por Categoría
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '10px',
              }}
            >
              {Object.keys(stats.counts).map((typeKey) => {
                const color = COLORS[typeKey] || '#94A3B8';
                return (
                  <div
                    key={typeKey}
                    className="premium-card"
                    style={{
                      padding: '12px 14px',
                      background: 'rgba(255,255,255,0.02)',
                      borderLeft: `4px solid ${color}`,
                      display: 'flex',
                      alignItems: 'center',
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
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#fff' }}>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
              gap: '20px',
              marginBottom: '28px',
            }}
          >
            {/* Tabla de Reglas de Clasificación por Edad */}
            <div className="premium-card" style={{ padding: '20px' }}>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '12px', color: '#38BDF8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={18} /> Reglas de Clasificación por Edad
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 10px' }}>Rango Edad</th>
                      <th style={{ padding: '8px 10px' }}>Macho</th>
                      <th style={{ padding: '8px 10px' }}>Hembra</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#38BDF8' }}>0 a 6.5 meses</td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(33,150,243,0.15)', color: '#2196F3', fontWeight: 'bold' }}>CHIVO</span></td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(76,175,80,0.15)', color: '#4CAF50', fontWeight: 'bold' }}>CHIVA</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#38BDF8' }}>6.5 a 12 meses</td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(156,39,176,0.15)', color: '#9C27B0', fontWeight: 'bold' }}>DESMADRE M.</span></td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,152,0,0.15)', color: '#FF9800', fontWeight: 'bold' }}>DESMADRE H.</span></td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#38BDF8' }}>1 a 2 años (12-24m)</td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(233,30,99,0.15)', color: '#E91E63', fontWeight: 'bold' }}>TORETE</span></td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,188,212,0.15)', color: '#00BCD4', fontWeight: 'bold' }}>NOVILLA</span></td>
                    </tr>
                    <tr>
                      <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#38BDF8' }}>&gt; 2 años (&gt; 24m)</td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(244,67,54,0.15)', color: '#F44336', fontWeight: 'bold' }}>TORO</span></td>
                      <td style={{ padding: '8px 10px' }}><span style={{ padding: '2px 6px', borderRadius: '4px', background: 'rgba(16,185,129,0.15)', color: '#10B981', fontWeight: 'bold' }}>VACA</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Próximos Cambios de Estado por Edad (Lista reducida a 5) */}
            <div className="premium-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '1.15rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={18} /> Próximos Cambios de Estado
                </h2>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Top 5 Próximos</span>
              </div>
              {displayedEvolutions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '16px', textAlign: 'center', fontSize: '13px' }}>
                  No hay animales jóvenes próximos a cambiar de estado.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px' }}>ID</th>
                        <th style={{ padding: '8px' }}>Actual</th>
                        <th style={{ padding: '8px' }}>Edad</th>
                        <th style={{ padding: '8px' }}>Próximo Estado</th>
                        <th style={{ padding: '8px' }}>Fecha Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedEvolutions.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>{item.identifier}</td>
                          <td style={{ padding: '8px', color: 'var(--text-muted)' }}>{item.type}</td>
                          <td style={{ padding: '8px' }}>{item.currentAgeMonths} m</td>
                          <td style={{ padding: '8px' }}>
                            <span style={{ padding: '2px 6px', background: 'rgba(245,158,11,0.15)', color: '#F59E0B', borderRadius: '4px', fontWeight: 'bold', fontSize: '10px' }}>
                              {item.nextType.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td style={{ padding: '8px', color: '#fff', fontWeight: '500' }}>
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

          {/* VACAS PRÓXIMAS A PARIR (TABLA REDUCIDA A 5) */}
          <div className="premium-card" style={{ padding: '20px', marginBottom: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <h2 style={{ fontSize: '1.2rem', color: '#FF9800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#FF9800" /> Vacas Próximas a Parir
              </h2>
              {stats.pregnantCows.length > 5 && (
                <button
                  onClick={() => navigate('/calving-control')}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#FF9800', borderColor: 'rgba(255,152,0,0.3)' }}
                >
                  Ver todas ({stats.pregnantCows.length}) <ArrowRight size={14} />
                </button>
              )}
            </div>
            {stats.pregnantCows.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '16px', textAlign: 'center', fontSize: '13px' }}>
                No hay vacas o novillas actualmente registradas en gestación activa.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--panel-border)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 10px' }}>ID Vaca</th>
                      <th style={{ padding: '8px 10px' }}>Tipo</th>
                      <th style={{ padding: '8px 10px' }}>Lote</th>
                      <th style={{ padding: '8px 10px' }}>Gestación</th>
                      <th style={{ padding: '8px 10px' }}>Predicción Parto</th>
                      <th style={{ padding: '8px 10px' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPregnantCows.map((cow) => (
                      <tr key={cow.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold' }}>{cow.identifier}</td>
                        <td style={{ padding: '8px 10px' }}>{cow.type}</td>
                        <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{cow.lote || 'GENERAL'}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#FF9800' }}>
                          {cow.calculatedMonths} meses
                        </td>
                        <td style={{ padding: '8px 10px', fontWeight: 'bold', color: '#10B981' }}>
                          {cow.estimatedBirthDate.toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          {cow.isNearCalving ? (
                            <span style={{ padding: '2px 8px', background: 'rgba(239, 68, 68, 0.2)', color: '#EF4444', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
                              A PUNTO DE PARIR
                            </span>
                          ) : (
                            <span style={{ padding: '2px 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10B981', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }}>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 460px), 1fr))',
                gap: '20px',
              }}
            >
              {/* Últimos Movimientos (Top 4) */}
              <div className="premium-card" style={{ padding: '20px' }}>
                <h2 style={{ fontSize: '1.15rem', marginBottom: '12px' }}>
                  Últimos Movimientos de Ganado
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                        <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Identificador</th>
                        <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Tipo</th>
                        <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Evento</th>
                        <th style={{ padding: '8px', color: 'var(--text-muted)' }}>Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latestMovements.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Sin movimientos recientes.
                          </td>
                        </tr>
                      ) : (
                        latestMovements.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '8px', fontWeight: 'bold' }}>{a.identifier || 'S/N'}</td>
                            <td style={{ padding: '8px' }}>{a.type}</td>
                            <td style={{ padding: '8px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
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
                                  borderRadius: '10px',
                                  fontSize: '10px',
                                  fontWeight: 'bold',
                                }}
                              >
                                {a.movementType.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
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
                <div className="premium-card" style={{ padding: '20px' }}>
                  <h2 style={{ fontSize: '1.15rem', marginBottom: '12px', color: '#10B981' }}>
                    Resumen Financiero del Mes
                  </h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#10B981', fontSize: '13px' }}>Ventas de Ganado</div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{financialStats.salesCount} ventas</span>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#10B981' }}>
                        + Q {financialStats.incomeTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#EF4444', fontSize: '13px' }}>Compras de Ganado</div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{financialStats.purchasesCount} compras</span>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#EF4444' }}>
                        - Q {financialStats.purchasesTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#EF4444', fontSize: '13px' }}>Gastos Operativos</div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Facturas y gastos generales</span>
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#EF4444' }}>
                        - Q {financialStats.externalTotal.toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', borderTop: '2px solid var(--panel-border)', marginTop: '4px' }}>
                      <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>Balance Neto</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 'bold', color: financialStats.netBalance >= 0 ? '#10B981' : '#EF4444' }}>
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
