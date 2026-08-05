import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function DashboardHome() {
  const fetchAnimals = async () => {
    // Usamos URL relativa porque la baseURL está configurada en App.jsx
    const res = await axios.get('/animals?limit=5000');
    return res.data.data || res.data;
  };

  const {
    data: animals = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['animals'],
    queryFn: fetchAnimals,
  });

  const stats = useMemo(() => {
    const activos = animals.filter((a) => a.status === 'ACTIVO');
    return {
      totalActivos: activos.length,
      activos,
    };
  }, [animals]);

  const latestAnimals = useMemo(() => {
    return [...animals]
      .map((a) => {
        let movementDate = a.created_at;
        let movementType = a.origin === 'COMPRA' ? 'Compra' : 'Añadido';
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
      .slice(0, 5);
  }, [animals]);

  const typeData = useMemo(() => {
    const counts = {};
    stats.activos.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.keys(counts)
      .map((type) => ({
        name: type,
        value: counts[type],
      }))
      .filter((l) => l.value > 0);
  }, [stats.activos]);

  const COLORS = [
    '#4CAF50',
    '#2196F3',
    '#FF9800',
    '#9C27B0',
    '#F44336',
    '#E91E63',
    '#795548',
    '#00BCD4',
  ];

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '8px' }}>
        FINCA MARTÍNEZ
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
        Gestión ganadera optimizada
      </p>

      {isLoading ? (
        <div style={{ color: 'var(--text-muted)' }}>
          Cargando estadísticas...
        </div>
      ) : isError ? (
        <div style={{ color: 'var(--danger-color)' }}>
          Ocurrió un error al cargar las estadísticas.
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '16px',
              marginBottom: '40px',
            }}
          >
            <div
              className="premium-card"
              style={{
                padding: '20px',
                borderTop: '4px solid var(--primary-color)',
              }}
            >
              <h3
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  paddingBottom: '8px',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  marginBottom: '8px',
                }}
              >
                TOTAL ACTIVOS
              </h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {stats.totalActivos}
              </div>
            </div>
            {typeData.map((data, index) => (
              <div
                key={data.name}
                className="premium-card"
                style={{
                  padding: '20px',
                  borderTop: `4px solid ${COLORS[index % COLORS.length]}`,
                }}
              >
                <h3
                  style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '8px',
                    color: 'var(--text-muted)',
                    fontSize: '11px',
                    marginBottom: '8px',
                    textTransform: 'uppercase',
                  }}
                >
                  {data.name.replace('_', ' ')}
                </h3>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {data.value}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(min(100%, 400px), 1fr))',
              gap: '24px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
                Últimos Movimientos
              </h2>
              <div className="premium-card">
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                  }}
                >
                  <thead>
                    <tr
                      style={{ borderBottom: '1px solid var(--panel-border)' }}
                    >
                      <th
                        style={{
                          padding: '16px',
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                        }}
                      >
                        Identificador
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                        }}
                      >
                        Animal
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                        }}
                      >
                        Movimiento
                      </th>
                      <th
                        style={{
                          padding: '16px',
                          color: 'var(--text-muted)',
                          fontWeight: '500',
                        }}
                      >
                        Fecha Evento
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestAnimals.length === 0 ? (
                      <tr>
                        <td
                          colSpan="4"
                          style={{
                            padding: '24px',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                          }}
                        >
                          Sin movimientos recientes.
                        </td>
                      </tr>
                    ) : (
                      latestAnimals.map((animal) => (
                        <tr
                          key={animal.id}
                          style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <td style={{ padding: '16px', fontWeight: 'bold' }}>
                            {animal.identifier || 'Sin ID'}
                          </td>
                          <td style={{ padding: '16px' }}>{animal.type}</td>
                          <td style={{ padding: '16px' }}>
                            <span
                              style={{
                                padding: '4px 12px',
                                background:
                                  animal.movementType === 'Venta'
                                    ? 'rgba(76, 175, 80, 0.2)'
                                    : animal.movementType === 'Compra'
                                      ? 'rgba(33, 150, 243, 0.2)'
                                      : animal.movementType === 'Muerte'
                                        ? 'rgba(255, 87, 34, 0.2)'
                                        : 'rgba(255, 255, 255, 0.1)',
                                color:
                                  animal.movementType === 'Venta'
                                    ? '#4CAF50'
                                    : animal.movementType === 'Compra'
                                      ? '#2196F3'
                                      : animal.movementType === 'Muerte'
                                        ? '#FF5722'
                                        : 'white',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                              }}
                            >
                              {animal.movementType.toUpperCase()}
                            </span>
                          </td>
                          <td
                            style={{
                              padding: '16px',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {new Date(animal.movementDate).toLocaleDateString(
                              'es-ES',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              },
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>
                Distribución por Tipo
              </h2>
              <div
                className="premium-card"
                style={{
                  height: '420px',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {typeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {typeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                        }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>
                    No hay animales activos.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
