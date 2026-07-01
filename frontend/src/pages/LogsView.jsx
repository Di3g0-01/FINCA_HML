import { CustomAlert } from '../utils/alerts';
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Download, Calendar, ArrowRight, User as UserIcon, Tag, Eye, Trash2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CustomSelect from '../components/CustomSelect';

export default function LogsView() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState('TODAY');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toLocaleDateString('en-CA'),
    endDate: new Date().toLocaleDateString('en-CA')
  });
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await axios.get(`http://localhost:3001/logs?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}&_t=${new Date().getTime()}`);
      setLogs(res.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  const handleDeleteLog = async (id) => {
    const result = await CustomAlert.confirm("¿Estás seguro de eliminar este registro de actividad permanentemente?");
    if (!result.isConfirmed) return;
    try {
        await axios.delete(`http://localhost:3001/logs/${id}`);
        fetchLogs();
    } catch (e) {
        CustomAlert.info("Aviso", "Error al eliminar el registro.");
    }
  };

  const handleClearAllLogs = async () => {
    const result = await CustomAlert.confirm("¿ESTÁS COMPLETAMENTE SEGURO?", "Esta acción borrará TODA la bitácora de actividad permanentemente y no se puede deshacer.");
    if (!result.isConfirmed) return;
    try {
        await axios.delete(`http://localhost:3001/logs`);
        fetchLogs();
        CustomAlert.info("Aviso", "Bitácora limpiada exitosamente.");
    } catch (e) {
        CustomAlert.info("Aviso", "Error al limpiar la bitácora.");
    }
  };

  const handleExportPDF = (dataToExport = logs) => {
    const doc = new jsPDF('landscape');
    doc.text("Bitácora de Actividad - Finca HM", 14, 15);
    doc.setFontSize(10);
    doc.text(`Rango: ${dateRange.startDate} a ${dateRange.endDate}`, 14, 22);

    const tableColumn = ["Fecha", "Usuario", "Acción", "Animal", "Detalles", "Valor"];
    const tableRows = dataToExport.map(log => [
      new Date(log.created_at).toLocaleString('es-GT'),
      log.username,
      log.action_type,
      log.animal_identifier || '-',
      log.details || '-',
      log.amount ? `Q ${log.amount.toLocaleString()}` : '-'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 25,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [44, 62, 80] }
    });
    
    doc.save(`Bitacora_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const checkAndCleanupOldLogs = useCallback(async () => {
    try {
        // Obtenemos un set de datos amplio para buscar registros antiguos (> 6 meses)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        
        // Consultar todos los logs (limit=5000) para verificar antigüedad
        const res = await axios.get(`http://localhost:3001/logs`);
        const allLogs = res.data;
        
        const oldLogs = allLogs.filter(log => new Date(log.created_at) < sixMonthsAgo);
        
        if (oldLogs.length > 0) {
            CustomAlert.info("Aviso", `SISTEMA: Se han detectado ${oldLogs.length} registros con más de 6 meses de antigüedad. 
Se procederá a descargar un respaldo automático en PDF y limpiar la base de datos para optimizar el rendimiento.`);
            
            handleExportPDF(oldLogs);
            
            await axios.delete('http://localhost:3001/logs/cleanup');
            fetchLogs();
        }
    } catch (error) {
        console.error("Error en limpieza automática:", error);
    }
  }, [fetchLogs]);

  useEffect(() => {
    // Solo check de limpieza al montar o si cambia drásticamente
    checkAndCleanupOldLogs();
  }, [checkAndCleanupOldLogs]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (type) => {
    switch (type) {
      case 'COMPRA': return '#2196F3';
      case 'VENTA': return '#4CAF50';
      case 'MUERTE': return '#f44336';
      case 'NACIMIENTO': return '#9c27b0';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Bitácora de Actividad</h1>
          <p style={{ color: 'var(--text-muted)' }}>HISTORIAL COMPLETO DE MOVIMIENTOS Y CAMBIOS EN EL SISTEMA</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef444433' }} onClick={handleClearAllLogs}>
            <Trash2 size={18} /> Limpiar Historial
          </button>
          <button className="btn-secondary" style={{ color: '#F44336' }} onClick={() => handleExportPDF()}>
            <Download size={18} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="premium-card" style={{ padding: '24px', marginBottom: '32px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ minWidth: '220px' }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Tipo de Consulta
          </label>
          <CustomSelect 
            value={filterType} 
            onChange={(e) => {
              setFilterType(e.target.value);
              if (e.target.value === 'TODAY') {
                const today = new Date().toLocaleDateString('en-CA');
                setDateRange({ startDate: today, endDate: today });
              }
            }}
            options={[
              { label: 'Día de Hoy', value: 'TODAY' },
              { label: 'Rango de Fechas', value: 'RANGE' }
            ]}
          />
        </div>

        {filterType === 'RANGE' && (
          <>
            <div className="form-group" style={{ width: '200px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} /> Fecha Inicio
              </label>
              <input 
                type="date" 
                className="input-field" 
                value={dateRange.startDate} 
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', height: '48px', color: 'var(--text-muted)' }}>
              <ArrowRight size={20} />
            </div>

            <div className="form-group" style={{ width: '200px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={14} /> Fecha Fin
              </label>
              <input 
                type="date" 
                className="input-field" 
                value={dateRange.endDate} 
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </>
        )}

        <button className="btn-primary" onClick={fetchLogs} style={{ height: '48px' }}>
          Consultar {filterType === 'TODAY' ? 'Hoy' : 'Rango'}
        </button>
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando registros de actividad...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Usuario</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Acción</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Animal</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Detalles / Resumen</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Valor</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha / Hora</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron registros en este rango de fechas.</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}>
                            <UserIcon size={16} />
                          </div>
                          <span style={{ fontWeight: '500' }}>{log.username}</span>
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          background: `${getActionColor(log.action_type)}1a`, 
                          color: getActionColor(log.action_type), 
                          borderRadius: '8px', 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          border: `1px solid ${getActionColor(log.action_type)}33`
                        }}>
                          {log.action_type}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Tag size={14} color="var(--text-muted)" />
                          <span style={{ fontWeight: 'bold' }}>{log.animal_identifier || '-'}</span>
                        </div>
                      </td>
                       <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.details}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {log.amount ? (
                          <span style={{ color: log.action_type === 'VENTA' ? '#4CAF50' : '#2196F3', fontWeight: 'bold' }}>
                            Q {log.amount.toLocaleString()}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {new Date(log.created_at).toLocaleString('es-GT', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                           <button onClick={() => setSelectedLog(log)} style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }} title="Ver Resumen"><Eye size={18} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="modal-overlay fade-in" onClick={() => setSelectedLog(null)}>
          <div className="premium-card modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
               <h2 style={{ margin: 0 }}>Resumen de Actividad</h2>
               <span style={{ 
                  padding: '4px 12px', 
                  background: `${getActionColor(selectedLog.action_type)}1a`, 
                  color: getActionColor(selectedLog.action_type), 
                  borderRadius: '8px', 
                  fontSize: '12px', 
                  fontWeight: 'bold' 
                }}>{selectedLog.action_type}</span>
            </div>
            
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px', marginBottom: '16px' }}>
               <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Usuario Responsable</label>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <UserIcon size={16} color="var(--primary-color)" />
                  <span style={{ fontWeight: '500' }}>{selectedLog.username}</span>
               </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
               <label style={{ color: 'var(--text-muted)', fontSize: '12px', display: 'block' }}>Detalle de la Operación</label>
               <p style={{ marginTop: '8px', lineHeight: '1.6', color: '#e5e7eb' }}>{selectedLog.details}</p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Animal / Ref</span>
                  <span style={{ fontWeight: 'bold' }}>{selectedLog.animal_identifier || 'N/A'}</span>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Fecha y HoraLocal</span>
                  <span>{new Date(selectedLog.created_at).toLocaleString('es-GT')}</span>
               </div>
            </div>

            <div style={{ marginTop: '32px', textAlign: 'right' }}>
              <button className="btn-secondary" onClick={() => setSelectedLog(null)}>Cerrar Ventana</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
