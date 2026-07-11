import { CustomAlert } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import CustomSelect from './CustomSelect';

export default function WorkerFormModal({ isOpen, onClose, onSaved, workerToEdit }) {
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    salary: '',
    contract_type: 'FIJO',
    is_active: true,
    is_retired: false
  });

  useEffect(() => {
    if (workerToEdit) {
      setFormData({
        name: workerToEdit.name || '',
        position: workerToEdit.position || '',
        salary: workerToEdit.salary || '',
        contract_type: workerToEdit.contract_type || 'FIJO',
        is_active: workerToEdit.is_active !== undefined ? workerToEdit.is_active : true,
        is_retired: workerToEdit.is_retired !== undefined ? workerToEdit.is_retired : false
      });
    } else {
      setFormData({
        name: '',
        position: '',
        salary: '',
        contract_type: 'FIJO',
        is_active: true,
        is_retired: false
      });
    }
  }, [workerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      payload.salary = payload.salary ? parseFloat(payload.salary) : null;

      if (workerToEdit) {
        await axios.patch(`http://localhost:3001/workers/${workerToEdit.id}`, payload);
      } else {
        await axios.post('http://localhost:3001/workers', payload);
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Error guardando trabajador', error);
      CustomAlert.info("Aviso", 'Error al guardar el trabajador.');
    }
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="premium-card modal-content" style={{ position: 'relative', maxWidth: '500px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', color: 'white' }}>
          <X size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#4CAF50' }}>
          {workerToEdit ? 'Editar Empleado' : 'Contratar Nuevo Empleado'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}></p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Nombre Completo</label>
              <input type="text" name="name" className="input-field" value={formData.name} onChange={handleChange} required placeholder="Ej. Juan Pérez" />
            </div>
            <div className="form-group">
              <label className="form-label">Puesto</label>
              <input type="text" name="position" className="input-field" value={formData.position} onChange={handleChange} required placeholder="Ej. Vaquero" />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo de Contrato</label>
              <CustomSelect 
                name="contract_type" 
                value={formData.contract_type} 
                onChange={handleChange} 
                required
                options={[
                  { label: 'Fijo', value: 'FIJO' },
                  { label: 'Temporal', value: 'TEMPORAL' }
                ]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">
                {formData.contract_type === 'FIJO' ? 'Salario Mensual (Q)' : 'Salario por Día (Q)'}
              </label>
              <input type="number" step="0.01" name="salary" className="input-field" value={formData.salary} onChange={handleChange} placeholder={formData.contract_type === 'FIJO' ? 'Ej. 3000.00' : 'Ej. 100.00'} required />
            </div>
            {formData.contract_type === 'FIJO' && (
              <div className="form-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', gridColumn: '1 / -1' }}>
                <input type="checkbox" name="is_retired" checked={formData.is_retired} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                <label>Jubilado (Descuento IGSS 3%)</label>
              </div>
            )}
            {workerToEdit && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }} />
                <label>Empleado Activo</label>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
            <button type="button" onClick={onClose} style={{ padding: '12px 24px', background: 'transparent', color: 'white', border: '1px solid var(--panel-border)' }}>Cancelar</button>
            <button type="submit" className="btn-primary" style={{ background: '#4CAF50', color: '#fff' }}>Guardar Ficha</button>
          </div>
        </form>
      </div>
    </div>
  );
}
