import { CustomAlert } from '../utils/alerts';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import CustomSelect from './CustomSelect';

export default function AnimalFormModal({ isOpen, onClose, onSaved, animalToEdit, cows }) {
  const [formData, setFormData] = useState({
    type: 'VACA', lote: 'GENERAL', birth_date: '', color: '', observations: '',
    is_pregnant: false, pregnancy_months: '', total_calvings: 0,
    last_calving_date: '', second_last_calving_date: '', motherIdentifier: '',
    nickname: '', breed: '', sex: 'H', grado: '', purchase_date: '', birth_weight: ''
  });

  const cowMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(cows)) {
      cows.forEach(c => {
        if (c && c.id) map.set(c.id, c.identifier || 'S/N');
      });
    }
    return map;
  }, [cows]);

  const cowIdByIdentifier = useMemo(() => {
    const map = new Map();
    if (Array.isArray(cows)) {
      cows.forEach(c => {
        if (c && c.identifier) {
          map.set(c.identifier.toString().trim().toUpperCase(), c.id);
        }
      });
    }
    return map;
  }, [cows]);

  useEffect(() => {
    if (animalToEdit) {
      setFormData({
        type: animalToEdit.type || 'CHIVA',
        lote: animalToEdit.lote || 'GENERAL',
        birth_date: animalToEdit.birth_date ? animalToEdit.birth_date.split('T')[0] : '',
        color: animalToEdit.color || '',
        observations: animalToEdit.observations || '',
        is_pregnant: animalToEdit.is_pregnant || false,
        pregnancy_months: animalToEdit.pregnancy_months || '',
        total_calvings: animalToEdit.total_calvings || 0,
        last_calving_date: animalToEdit.last_calving_date ? animalToEdit.last_calving_date.split('T')[0] : '',
        second_last_calving_date: animalToEdit.second_last_calving_date ? animalToEdit.second_last_calving_date.split('T')[0] : '',
        motherIdentifier: animalToEdit.mother_id ? (cowMap.get(animalToEdit.mother_id) || '') : '',
        nickname: animalToEdit.nickname || '',
        breed: animalToEdit.breed || '',
        sex: animalToEdit.sex || 'H',
        grado: animalToEdit.grado || '',
        purchase_date: animalToEdit.purchase_date ? animalToEdit.purchase_date.split('T')[0] : '',
        birth_weight: animalToEdit.birth_weight || ''
      });
    } else {
      setFormData({
        type: 'CHIVA', lote: 'GENERAL', birth_date: '', color: '', observations: '',
        is_pregnant: false, pregnancy_months: '', total_calvings: 0,
        last_calving_date: '', second_last_calving_date: '', motherIdentifier: '',
        nickname: '', breed: '', sex: 'H', grado: '', purchase_date: '', birth_weight: ''
      });
    }
  }, [animalToEdit, isOpen, cowMap]);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'checkbox' ? checked : value };
      if (name === 'type') {
        if (['VACA', 'CHIVA', 'NOVILLA'].includes(value)) updated.sex = 'H';
        else if (['TORO', 'CHIVO', 'TORETE'].includes(value)) updated.sex = 'M';
      }
      return updated;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalType = formData.type;
    if (formData.birth_date && formData.type !== 'CABALLO') {
      const birthDate = new Date(formData.birth_date);
      const diffDays = (new Date() - birthDate) / (1000 * 60 * 60 * 24);
      const ageYears = (diffDays / 365.25).toFixed(1);
      
      let suggestedType = formData.type;
      const isMale = formData.sex === 'M' || ['TORO', 'TORETE', 'CHIVO'].includes(formData.type);
      
      if (isMale) {
        if (diffDays < 365) suggestedType = 'CHIVO';
        else if (diffDays < 547.5) suggestedType = 'TORETE';
        else suggestedType = 'TORO';
      } else {
        if (diffDays < 547.5) suggestedType = 'CHIVA';
        else if (diffDays < 730) suggestedType = 'NOVILLA';
        else suggestedType = 'VACA';
      }

      if (formData.type !== suggestedType) {
        const confirmMsg = `Según su fecha de nacimiento, este animal tiene ${ageYears} años y ya es considerado un ${suggestedType}. \n\n¿Deseas guardarlo automáticamente como ${suggestedType}? \n(Si cancelas, se guardará como ${formData.type})`;
        if ((await CustomAlert.confirm(confirmMsg)).isConfirmed) {
          finalType = suggestedType;
        }
      }
    }

    try {
      const payload = { ...formData, type: finalType };
      if (payload.motherIdentifier) {
        const mId = cowIdByIdentifier.get(payload.motherIdentifier.trim().toUpperCase());
        if (mId) payload.mother_id = mId;
        else { CustomAlert.info("Aviso", 'El identificador de la madre no existe.'); return; }
      } else payload.mother_id = null;
      
      delete payload.motherIdentifier;
      ['birth_date', 'last_calving_date', 'second_last_calving_date', 'purchase_date'].forEach(f => { if(!payload[f]) payload[f] = null; });
      if (!payload.is_pregnant || !payload.pregnancy_months) payload.pregnancy_months = null;
      ['color', 'nickname', 'breed', 'sex'].forEach(f => { if(!payload[f]) payload[f] = null; });
      
      payload.grado = payload.grado ? parseFloat(payload.grado) : null;
      payload.birth_weight = payload.birth_weight ? parseFloat(payload.birth_weight) : null;

      if (!animalToEdit) payload.origin = 'NACIMIENTO';
      else delete payload.origin;

      if (animalToEdit) await axios.patch(`http://localhost:3001/animals/${animalToEdit.id}`, payload);
      else {
        // If user is OPERADOR, send to requests instead of directly to animals
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'OPERADOR') {
          await axios.post('http://localhost:3001/requests', { type: 'NACIMIENTO', payload });
          CustomAlert.success('Solicitud Enviada', 'Tu solicitud de nacimiento ha sido enviada al administrador para su revisión.');
        } else {
          await axios.post('http://localhost:3001/animals', payload);
        }
      }

      onSaved(); onClose();
    } catch (error) { CustomAlert.info("Aviso", 'Error al guardar. Verifica los datos.'); }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay fade-in">
      <div className="premium-card modal-content" style={{ position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', color: 'white' }}><X size={24} /></button>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{animalToEdit ? 'Editar Registro' : 'Nuevo Nacimiento'}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Gestión de registro local</p>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tipo de Animal</label>
              <CustomSelect 
                name="type" 
                value={formData.type} 
                onChange={handleChange} 
                required
                options={[
                  { label: 'Crias', isGroup: true },
                  { label: 'Chiva (Hembra)', value: 'CHIVA' },
                  { label: 'Chivo (Macho)', value: 'CHIVO' },
                  { label: 'Otros', isGroup: true },
                  { label: 'Caballo', value: 'CABALLO' },
                  { label: 'Vaca', value: 'VACA' },
                  { label: 'Toro', value: 'TORO' },
                  { label: 'Novilla', value: 'NOVILLA' },
                  { label: 'Torete', value: 'TORETE' }
                ]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sexo</label>
              <CustomSelect 
                name="sex" 
                value={formData.sex} 
                onChange={handleChange} 
                required 
                disabled={formData.type !== 'CABALLO'}
                options={[
                  { label: 'Hembra (H)', value: 'H' },
                  { label: 'Macho (M)', value: 'M' }
                ]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Identificador</label>
              <input type="text" className="input-field" value={animalToEdit ? animalToEdit.identifier : 'Autogenerado...'} disabled style={{ background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }} />
            </div>
            <div className="form-group">
              <label className="form-label">Color / Capa</label>
              <input type="text" name="color" className="input-field" value={formData.color} onChange={handleChange} placeholder="Ej. Pinto" />
            </div>
            <div className="form-group">
              <label className="form-label">Grado (Genética)</label>
              <input type="number" step="0.01" name="grado" className="input-field" value={formData.grado} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Peso Inicial (lbs)</label>
              <input type="number" step="0.01" name="birth_weight" className="input-field" value={formData.birth_weight} onChange={handleChange} />
            </div>
            {(formData.type === 'TORO' || formData.type === 'CABALLO') && (
              <div className="form-group">
                <label className="form-label">Apodo / Nombre</label>
                <input type="text" name="nickname" className="input-field" value={formData.nickname} onChange={handleChange} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Lote</label>
              <CustomSelect 
                name="lote" 
                value={formData.lote} 
                onChange={handleChange} 
                required
                options={[
                  { label: 'General', value: 'GENERAL' },
                  { label: 'Novilla', value: 'NOVILLA' }
                ]}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Fecha de Nacimiento</label>
              <input type="date" name="birth_date" className="input-field" value={formData.birth_date} onChange={handleChange} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1', background: 'rgba(255, 255, 255, 0.05)', padding: '16px', borderRadius: '12px' }}>
              <label className="form-label">ID de la Madre</label>
              <input type="text" name="motherIdentifier" className="input-field" style={{ marginBottom: 0 }} value={formData.motherIdentifier} onChange={handleChange} placeholder="Ej. 1/21" />
            </div>
            {formData.type === 'VACA' && (
              <>
                <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px' }}>
                  <input type="checkbox" name="is_pregnant" checked={formData.is_pregnant} onChange={handleChange} />
                  <label>¿Está Preñada?</label>
                </div>
                {formData.is_pregnant && (
                  <div className="form-group" style={{ gridColumn: '1 / -1', background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '12px' }}>
                    <label className="form-label">Meses de preñez</label>
                    <input type="number" name="pregnancy_months" className="input-field" value={formData.pregnancy_months} onChange={handleChange} min="1" max="10" step="0.5" required />
                  </div>
                )}
                <div className="form-group"><label className="form-label">Total Partos</label><input type="number" name="total_calvings" className="input-field" value={formData.total_calvings} onChange={handleChange} /></div>
                <div className="form-group"><label className="form-label">Último Parto</label><input type="date" name="last_calving_date" className="input-field" value={formData.last_calving_date} onChange={handleChange} /></div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Penúltimo Parto</label><input type="date" name="second_last_calving_date" className="input-field" value={formData.second_last_calving_date} onChange={handleChange} /></div>
              </>
            )}
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Observaciones</label>
            <textarea name="observations" className="input-field" rows="3" value={formData.observations} onChange={handleChange}></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
