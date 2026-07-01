import { CustomAlert } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Users } from 'lucide-react';
import WorkerFormModal from '../components/WorkerFormModal';

export default function WorkersView() {
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState(null);

  const fetchWorkers = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('http://localhost:3001/workers');
      setWorkers(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const openForm = (worker = null) => {
    setWorkerToEdit(worker);
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    if ((await CustomAlert.confirm(`¿Estás seguro de eliminar a ${name}? Esto borrará su historial de la base de datos de manera definitiva.`)).isConfirmed) {
      try {
        await axios.delete(`http://localhost:3001/workers/${id}`);
        fetchWorkers();
      } catch (e) {
        CustomAlert.info("Aviso", 'Error eliminando trabajador.');
      }
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: '#4CAF50', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={32} />
            Módulo de Trabajadores
          </h1>
          <p style={{ color: 'var(--text-muted)' }}></p>
        </div>
        <button className="btn-primary" style={{ background: '#4CAF50', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => openForm(null)}>
          <Plus size={20} /> Contratar Empleado
        </button>
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando datos de empleados...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Nombre</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Puesto</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Contrato</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Salario Base (Q)</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Estado</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay empleados registrados.</td></tr>
                ) : (
                  workers.map(w => (
                    <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: w.is_active ? 1 : 0.5 }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{w.name}</td>
                      <td style={{ padding: '16px' }}>{w.position}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                          background: w.contract_type === 'FIJO' ? 'rgba(33, 150, 243, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                          color: w.contract_type === 'FIJO' ? '#2196F3' : '#ff9800'
                        }}>{w.contract_type}</span>
                      </td>
                      <td style={{ padding: '16px', color: '#4CAF50', fontWeight: 'bold' }}>
                        {w.salary ? `Q ${w.salary.toFixed(2)} ${w.contract_type === 'TEMPORAL' ? '/hr' : '/mes'}` : '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: '12px', fontWeight: 'bold' }}>
                        {w.is_active ? <span style={{ color: '#4CAF50' }}>✓ ACTIVO</span> : <span style={{ color: 'var(--danger-color)' }}>✕ INACTIVO</span>}
                      </td>
                      <td style={{ padding: '16px', display: 'flex', gap: '8px' }}>
                        <button className="icon-btn" onClick={() => openForm(w)} title="Editar Ficha">
                          <Edit size={18} />
                        </button>
                        <button style={{ background: 'transparent', color: 'var(--danger-color)', padding: '6px', border: 'none', cursor: 'pointer' }} onClick={() => handleDelete(w.id, w.name)} title="Borrar DB">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WorkerFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={fetchWorkers} workerToEdit={workerToEdit} />
    </div>
  );
}
