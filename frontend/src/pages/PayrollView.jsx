import { CustomAlert } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Save, DollarSign, FileSpreadsheet } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function PayrollView() {
  const [fijos, setFijos] = useState([]);
  const [temporales, setTemporales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [payrollName, setPayrollName] = useState('1A. QNA. DE MARZO 2026');
  const [payrollData, setPayrollData] = useState({});

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get('http://localhost:3001/workers');
        const active = res.data.filter(w => w.is_active);

        setFijos(active.filter(w => w.contract_type === 'FIJO'));
        setTemporales(active.filter(w => w.contract_type === 'TEMPORAL'));

        // Initialize payroll data state
        const initialData = {};
        active.forEach(w => {
          if (w.contract_type === 'FIJO') {
            initialData[w.id] = { extras: 0 };
          } else {
            initialData[w.id] = { days: 13, extras: 0 };
          }
        });
        setPayrollData(initialData);

      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWorkers();
  }, []);

  const handleInputChange = (id, field, value) => {
    setPayrollData(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const calculateFijoRow = (worker) => {
    const pd = payrollData[worker.id] || { extras: 0 };
    const quincenal = (worker.salary || 0) / 2;
    const devengado = quincenal + pd.extras;
    const igss = quincenal * 0.0483;
    const totalRecibido = devengado - igss;
    return { quincenal, extras: pd.extras, devengado, igss, totalRecibido };
  };

  const calculateTemporalRow = (worker) => {
    const pd = payrollData[worker.id] || { days: 0, extras: 0 };
    const porHora = worker.salary || 0;
    const devengadoLaborados = porHora * pd.days;
    const totalRecibido = devengadoLaborados + pd.extras;
    return { porHora, days: pd.days, devengadoLaborados, extras: pd.extras, totalRecibido };
  };

  const handleSaveToDB = async () => {
    try {
      const result = await CustomAlert.confirm(`¿Guardar la nómina "${payrollName}" en el historial del sistema?`);
      if (!result.isConfirmed) return;

      const details = {
        fijos: fijos.map(w => ({ name: w.name, ...calculateFijoRow(w) })),
        temporales: temporales.map(w => ({ name: w.name, ...calculateTemporalRow(w) }))
      };

      await axios.post('http://localhost:3001/payrolls', {
        period_name: payrollName,
        details,
        start_date: new Date().toISOString().split('T')[0],
      });
      CustomAlert.info("Aviso", '¡Nómina guardada exitosamente en el historial histórico!');
    } catch (e) {
      CustomAlert.info("Aviso", 'Error al guardar la nómina.');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF('landscape');
      doc.text(`PLANILLA TRABAJADORES FINCA HML - ${payrollName}`, 14, 20);

      // FIJOS
      doc.setFontSize(14);
      doc.text('TRABAJADORES FIJOS', 14, 30);

      const fijosBody = fijos.map(w => {
        const calc = calculateFijoRow(w);
        return [
          w.name,
          `Q ${w.salary?.toFixed(2)}`,
          `Q ${calc.quincenal.toFixed(2)}`,
          `Q ${calc.extras.toFixed(2)}`,
          `Q ${calc.devengado.toFixed(2)}`,
          `Q ${calc.igss.toFixed(2)}`,
          `Q ${calc.totalRecibido.toFixed(2)}`,
          "" // Espacio para firma
        ];
      });

      autoTable(doc, {
        startY: 35,
        head: [['Nombre', 'Sueldo Mensual', 'Quincenal Base', 'Extras/Finde', 'Devengado', 'IGSS 4.83%', 'Total a Recibir', 'Firma de Recibido']],
        body: fijosBody,
        theme: 'grid',
        headStyles: { fillColor: [76, 175, 80] },
        styles: { minCellHeight: 20, valign: 'middle' }
      });

      let lastY = doc.lastAutoTable.finalY + 15;

      // TEMPORALES
      doc.text('TRABAJADORES TEMPORALES', 14, lastY);
      const tempBody = temporales.map(w => {
        const calc = calculateTemporalRow(w);
        return [
          w.name,
          `Q ${calc.porHora.toFixed(2)}`,
          calc.days,
          `Q ${calc.devengadoLaborados.toFixed(2)}`,
          `Q ${calc.extras.toFixed(2)}`,
          `Q ${calc.totalRecibido.toFixed(2)}`,
          "" // Espacio para firma
        ];
      });

      autoTable(doc, {
        startY: lastY + 5,
        head: [['Nombre', 'Sueldo por Hora', 'Horas Laboradas', 'Subtotal Devengado', 'Aumentos Extra', 'Total a Recibir', 'Firma de Recibido']],
        body: tempBody,
        theme: 'grid',
        headStyles: { fillColor: [255, 152, 0] },
        styles: { minCellHeight: 20, valign: 'middle' }
      });

      doc.save(`Planilla_HML_${payrollName.replace(/ /g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generando PDF:', error);
      CustomAlert.info("Aviso", 'Hubo un error al generar el PDF. Revisa la consola para más detalles.');
    }
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();

    const fijosSheet = fijos.map(w => {
      const calc = calculateFijoRow(w);
      return {
        'TRABAJADOR': w.name,
        'SUELDO MENSUAL': w.salary,
        'SUELDO QUINCENAL': calc.quincenal,
        'FIN DE SEMANA / EXTRA': calc.extras,
        'TOTAL DEVENGADO': calc.devengado,
        'IGSS 4.83%': calc.igss,
        'TOTAL RECIBIDO': calc.totalRecibido,
        'FIRMA DE RECIBIDO': ''
      };
    });
    const ws1 = XLSX.utils.json_to_sheet(fijosSheet);
    XLSX.utils.book_append_sheet(wb, ws1, "Fijos");

    const tempSheet = temporales.map(w => {
      const calc = calculateTemporalRow(w);
      return {
        'TRABAJOS TEMPORALES': w.name,
        'SUELDO POR HORA': calc.porHora,
        'HORAS LABORADAS': calc.days,
        'DEVENGADO LABORADOS': calc.devengadoLaborados,
        'EXTRAS': calc.extras,
        'TOTAL RECIBIDO': calc.totalRecibido,
        'FIRMA DE RECIBIDO': ''
      };
    });
    const ws2 = XLSX.utils.json_to_sheet(tempSheet);
    XLSX.utils.book_append_sheet(wb, ws2, "Temporales");

    XLSX.writeFile(wb, `Planilla_HML_${payrollName.replace(/ /g, '_')}.xlsx`);
  };

  if (isLoading) return <div style={{ padding: '40px', color: 'var(--text-muted)' }}>Cargando motor de planillas...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DollarSign size={32} />
            Módulo Pago de Planilla
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Generador de nómina y aplicación de descuentos.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-primary" style={{ background: '#217346', color: '#fff', border: '1px solid #1e623b', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={exportExcel} title="Exportar a Microsoft Excel">
            <FileSpreadsheet size={20} /> Excel
          </button>
          <button className="btn-primary" style={{ background: '#E53935', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={exportPDF}>
            <Download size={20} /> PDF
          </button>
          <button className="btn-primary" style={{ background: '#4CAF50', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={handleSaveToDB}>
            <Save size={20} /> Guardar BDD
          </button>
        </div>
      </div>

      <div className="form-group" style={{ marginBottom: '32px', maxWidth: '400px' }}>
        <label className="form-label" style={{ color: 'var(--primary-color)' }}>Nombre / Período del Registro a Generar</label>
        <input
          type="text"
          className="input-field"
          value={payrollName}
          onChange={(e) => setPayrollName(e.target.value)}
          placeholder="Ej: PLANILLA 1A. QNA. DE MARZO 2026"
          style={{ fontSize: '1.2rem', fontWeight: 'bold' }}
        />
      </div>

      {/* --- TABLA DE FIJOS --- */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#4CAF50' }}>1. Trabajadores Fijos (Descuento IGSS)</h2>
      <div className="premium-card" style={{ marginBottom: '40px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)', background: 'rgba(76, 175, 80, 0.1)' }}>
              <th style={{ padding: '16px', color: 'white', fontWeight: 'bold' }}>Nombre</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Sueldo Mensual</th>
              <th style={{ padding: '16px', color: 'white', fontWeight: 'bold' }}>Quincenal Base</th>
              <th style={{ padding: '16px', color: '#FF9800', fontWeight: 'bold' }}>Extras (Fin Sem.)</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Devengado</th>
              <th style={{ padding: '16px', color: '#E53935', fontWeight: 'bold' }}>IGSS 4.83%</th>
              <th style={{ padding: '16px', color: '#4CAF50', fontWeight: 'bold', fontSize: '1.1rem' }}>Total a Recibir</th>
            </tr>
          </thead>
          <tbody>
            {fijos.length === 0 && <tr><td colSpan="7" style={{ padding: '16px' }}>No hay trabajadores fijos activos.</td></tr>}
            {fijos.map(w => {
              const calc = calculateFijoRow(w);
              return (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{w.name}</td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>Q {w.salary?.toFixed(2) || '0.00'}</td>
                  <td style={{ padding: '16px' }}>Q {calc.quincenal.toFixed(2)}</td>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="number"
                      style={{ width: '100px', background: 'rgba(0,0,0,0.5)', border: '1px solid #FF9800', borderRadius: '4px', color: 'white', padding: '8px' }}
                      value={payrollData[w.id]?.extras || ''}
                      onChange={(e) => handleInputChange(w.id, 'extras', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '16px' }}>Q {calc.devengado.toFixed(2)}</td>
                  <td style={{ padding: '16px', color: '#E53935' }}>- Q {calc.igss.toFixed(2)}</td>
                  <td style={{ padding: '16px', color: '#4CAF50', fontWeight: 'bold', fontSize: '1.2rem' }}>Q {calc.totalRecibido.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
              <td colSpan="6" style={{ padding: '16px', textAlign: 'right' }}>TOTAL NÓMINA FIJA (Q):</td>
              <td style={{ padding: '16px', color: '#4CAF50', fontSize: '1.3rem' }}>
                Q {fijos.reduce((sum, w) => sum + calculateFijoRow(w).totalRecibido, 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* --- TABLA DE TEMPORALES --- */}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '16px', color: '#FF9800' }}>2. Trabajadores Temporales (Cobro por Hora)</h2>
      <div className="premium-card" style={{ marginBottom: '40px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--panel-border)', background: 'rgba(255, 152, 0, 0.1)' }}>
              <th style={{ padding: '16px', color: 'white', fontWeight: 'bold' }}>Nombre</th>
              <th style={{ padding: '16px', color: 'white', fontWeight: 'bold' }}>Sueldo por Hora</th>
              <th style={{ padding: '16px', color: '#FF9800', fontWeight: 'bold' }}>Horas Laboradas</th>
              <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Devengado T.</th>
              <th style={{ padding: '16px', color: '#FF9800', fontWeight: 'bold' }}>Extras (Aumento)</th>
              <th style={{ padding: '16px', color: '#FF9800', fontWeight: 'bold', fontSize: '1.1rem' }}>Total Recibido</th>
            </tr>
          </thead>
          <tbody>
            {temporales.length === 0 && <tr><td colSpan="6" style={{ padding: '16px' }}>No hay trabajadores temporales activos.</td></tr>}
            {temporales.map(w => {
              const calc = calculateTemporalRow(w);
              return (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', fontWeight: 'bold' }}>{w.name}</td>
                  <td style={{ padding: '16px' }}>Q {calc.porHora.toFixed(2)}</td>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="number"
                      style={{ width: '100px', background: 'rgba(0,0,0,0.5)', border: '1px solid #FF9800', borderRadius: '4px', color: 'white', padding: '8px' }}
                      value={payrollData[w.id]?.days || ''}
                      onChange={(e) => handleInputChange(w.id, 'days', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '16px', color: 'var(--text-muted)' }}>Q {calc.devengadoLaborados.toFixed(2)}</td>
                  <td style={{ padding: '16px' }}>
                    <input
                      type="number"
                      style={{ width: '100px', background: 'rgba(0,0,0,0.5)', border: '1px solid #FF9800', borderRadius: '4px', color: 'white', padding: '8px' }}
                      value={payrollData[w.id]?.extras || ''}
                      onChange={(e) => handleInputChange(w.id, 'extras', e.target.value)}
                    />
                  </td>
                  <td style={{ padding: '16px', color: '#FF9800', fontWeight: 'bold', fontSize: '1.2rem' }}>Q {calc.totalRecibido.toFixed(2)}</td>
                </tr>
              );
            })}
            <tr style={{ background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
              <td colSpan="5" style={{ padding: '16px', textAlign: 'right' }}>TOTAL NÓMINA TEMPORAL (Q):</td>
              <td style={{ padding: '16px', color: '#FF9800', fontSize: '1.3rem' }}>
                Q {temporales.reduce((sum, w) => sum + calculateTemporalRow(w).totalRecibido, 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
