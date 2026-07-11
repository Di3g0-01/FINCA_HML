import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CustomAlert } from '../utils/alerts';
import { Check, X, Clock } from 'lucide-react';

export default function RequestsAdminView() {
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('http://localhost:3001/requests');
      setRequests(res.data);
    } catch (e) {
      console.error(e);
      CustomAlert.error('Error', 'No se pudieron cargar las solicitudes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    const confirm = await CustomAlert.confirm('Aprobar Solicitud', '¿Estás seguro de que deseas aprobar esta solicitud y reflejarla en el inventario?');
    if (confirm.isConfirmed) {
      try {
        await axios.put(`http://localhost:3001/requests/${id}/approve`);
        CustomAlert.success('Aprobada', 'La solicitud ha sido procesada en el inventario.');
        fetchRequests();
      } catch (e) {
        CustomAlert.error('Error', 'Ocurrió un error al aprobar.');
      }
    }
  };

  const handleReject = async (id) => {
    const confirm = await CustomAlert.confirm('Rechazar Solicitud', '¿Deseas rechazar y archivar esta solicitud?');
    if (confirm.isConfirmed) {
      try {
        await axios.put(`http://localhost:3001/requests/${id}/reject`);
        CustomAlert.success('Rechazada', 'La solicitud ha sido rechazada.');
        fetchRequests();
      } catch (e) {
        CustomAlert.error('Error', 'Ocurrió un error al rechazar.');
      }
    }
  };

  const handleClearAll = async () => {
    const confirm = await CustomAlert.confirm('Limpiar Historial', '¿Estás seguro de que deseas eliminar permanentemente todo el historial de solicitudes? Esta acción no se puede deshacer.');
    if (confirm.isConfirmed) {
      try {
        await axios.delete('http://localhost:3001/requests');
        CustomAlert.success('Limpiado', 'Todo el historial de solicitudes ha sido eliminado.');
        fetchRequests();
      } catch (e) {
        CustomAlert.error('Error', 'Ocurrió un error al limpiar el historial.');
      }
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: '#E91E63', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={32} />
            Solicitudes Pendientes
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Aprueba o rechaza los reportes de nacimiento y muerte generados por los operadores.</p>
        </div>
        <button 
          className="btn-primary" 
          style={{ background: 'rgba(244,67,54,0.1)', color: '#F44336', border: '1px solid rgba(244,67,54,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }} 
          onClick={handleClearAll}
        >
          Limpiar Historial
        </button>
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando solicitudes...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Tipo</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Detalles / Animal</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Solicitante</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Estado</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay solicitudes registradas.</td></tr>
                ) : (
                  requests.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase',
                          background: req.type === 'NACIMIENTO' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                          color: req.type === 'NACIMIENTO' ? '#4CAF50' : '#FF9800'
                        }}>
                          {req.type}
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {req.type === 'NACIMIENTO' ? `${req.payload.type} - Sexo: ${req.payload.sex}` : `Muerte Animal ID: ${req.payload.animal_id} - ${req.payload.death_reason || 'Sin causa'}`}
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{req.requester?.username || 'Desconocido'}</td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(req.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', textTransform: 'uppercase',
                          background: req.status === 'PENDIENTE' ? 'rgba(33, 150, 243, 0.1)' : req.status === 'ACEPTADA' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                          color: req.status === 'PENDIENTE' ? '#2196F3' : req.status === 'ACEPTADA' ? '#4CAF50' : '#F44336'
                        }}>
                          {req.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        {req.status === 'PENDIENTE' && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <button onClick={() => handleApprove(req.id)} style={{ background: 'rgba(76, 175, 80, 0.1)', color: '#4CAF50', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }} title="Aprobar"><Check size={16} /></button>
                            <button onClick={() => handleReject(req.id)} style={{ background: 'rgba(244, 67, 54, 0.1)', color: '#F44336', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }} title="Rechazar"><X size={16} /></button>
                          </div>
                        )}
                        {req.status !== 'PENDIENTE' && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Procesada</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
