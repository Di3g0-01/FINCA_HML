import { CustomAlert } from '../utils/alerts';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search } from 'lucide-react';
import axios from 'axios';
import CustomSelect from './CustomSelect';
import SystemDatePicker from './SystemDatePicker';

export default function AnimalFormModal({
  isOpen,
  onClose,
  onSaved,
  animalToEdit,
  cows,
}) {
  // --- STATE & HOOKS ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'VACA',
    lote: 'GENERAL',
    birth_date: '',
    color: '',
    status: 'ACTIVO',
    observations: '',
    is_pregnant: false,
    pregnancy_months: '',
    total_calvings: 0,
    last_calving_date: '',
    second_last_calving_date: '',
    motherIdentifier: '',
    nickname: '',
    breed: '',
    sex: 'H',
    grado: '',
    purchase_date: '',
    birth_weight: '',
  });

  const cowMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(cows)) {
      cows.forEach((c) => {
        if (c && c.id) map.set(c.id, c.identifier || 'S/N');
      });
    }
    return map;
  }, [cows]);

  const cowIdByIdentifier = useMemo(() => {
    const map = new Map();
    if (Array.isArray(cows)) {
      cows.forEach((c) => {
        if (c && c.identifier) {
          map.set(c.identifier.toString().trim().toUpperCase(), c.id);
        }
      });
    }
    return map;
  }, [cows]);

  // --- EFFECTS ---
  useEffect(() => {
    if (animalToEdit) {
      setFormData({
        type: animalToEdit.type || 'CHIVA',
        lote: animalToEdit.lote || 'GENERAL',
        birth_date: animalToEdit.birth_date
          ? animalToEdit.birth_date.split('T')[0]
          : '',
        color: animalToEdit.color || '',
        status: animalToEdit.status || 'ACTIVO',
        observations: animalToEdit.observations || '',
        is_pregnant: animalToEdit.is_pregnant || false,
        pregnancy_months: animalToEdit.pregnancy_months || '',
        total_calvings: animalToEdit.total_calvings || 0,
        last_calving_date: animalToEdit.last_calving_date
          ? animalToEdit.last_calving_date.split('T')[0]
          : '',
        second_last_calving_date: animalToEdit.second_last_calving_date
          ? animalToEdit.second_last_calving_date.split('T')[0]
          : '',
        motherIdentifier: animalToEdit.mother_id
          ? cowMap.get(animalToEdit.mother_id) || ''
          : '',
        nickname: animalToEdit.nickname || '',
        breed: animalToEdit.breed || '',
        sex: animalToEdit.sex || 'H',
        grado: animalToEdit.grado || '',
        purchase_date: animalToEdit.purchase_date
          ? animalToEdit.purchase_date.split('T')[0]
          : '',
        birth_weight: animalToEdit.birth_weight || '',
      });
    } else {
      setFormData({
        type: 'CHIVA',
        lote: 'GENERAL',
        birth_date: '',
        color: '',
        status: 'ACTIVO',
        observations: '',
        is_pregnant: false,
        pregnancy_months: '',
        total_calvings: 0,
        last_calving_date: '',
        second_last_calving_date: '',
        motherIdentifier: '',
        nickname: '',
        breed: '',
        sex: 'H',
        grado: '',
        purchase_date: '',
        birth_weight: '',
      });
    }
  }, [animalToEdit, isOpen, cowMap]);

  // --- HANDLERS & LOGIC ---
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };
      if (name === 'type') {
        if (['VACA', 'CHIVA', 'NOVILLA', 'DESMADRE_HEMBRA'].includes(value))
          updated.sex = 'H';
        else if (['TORO', 'CHIVO', 'TORETE', 'DESMADRE_MACHO'].includes(value))
          updated.sex = 'M';
      }
      return updated;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    let finalType = formData.type;
    if (formData.birth_date && formData.type !== 'CABALLO') {
      const birthDate = new Date(formData.birth_date);
      const diffDays = (new Date() - birthDate) / (1000 * 60 * 60 * 24);
      const ageYears = (diffDays / 365.25).toFixed(1);
      const ageInMonths = diffDays / 30.4375;

      let suggestedType = formData.type;
      const isMale =
        formData.sex === 'M' ||
        ['TORO', 'TORETE', 'CHIVO', 'DESMADRE_MACHO'].includes(formData.type);

      if (isMale) {
        if (ageInMonths <= 6.5) suggestedType = 'CHIVO';
        else if (ageInMonths < 12) suggestedType = 'DESMADRE_MACHO';
        else if (ageInMonths < 24) suggestedType = 'TORETE';
        else suggestedType = 'TORO';
      } else {
        if (ageInMonths <= 6.5) suggestedType = 'CHIVA';
        else if (ageInMonths < 12) suggestedType = 'DESMADRE_HEMBRA';
        else if (ageInMonths < 24) suggestedType = 'NOVILLA';
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
      setIsSubmitting(true);
      CustomAlert.showLoading(
        animalToEdit ? 'Actualizando animal...' : 'Registrando nuevo nacimiento...',
        'Por favor espera, estamos procesando los datos de forma segura...'
      );

      const payload = { ...formData, type: finalType };
      if (payload.motherIdentifier && payload.motherIdentifier.trim() !== '') {
        const cleanMotherId = payload.motherIdentifier.trim().toUpperCase();
        let mId = cowIdByIdentifier.get(cleanMotherId);
        
        // Si no está en la lista en memoria, buscarla o crearla como referencia histórica
        if (!mId) {
          try {
            const searchRes = await axios.get(`/animals?search=${cleanMotherId}&limit=10`);
            const foundList = searchRes.data.data || searchRes.data;
            const match = Array.isArray(foundList)
              ? foundList.find((a) => String(a.identifier).trim().toUpperCase() === cleanMotherId)
              : null;

            if (match) {
              mId = match.id;
            } else {
              // Si la madre no existe en absoluto, registrarla automáticamente como referencia histórica
              const createRes = await axios.post('/animals', {
                identifier: cleanMotherId,
                type: 'VACA',
                sex: 'H',
                status: 'MUERTO',
                origin: 'NACIMIENTO',
                observations: 'Referencia histórica (Madre creada automáticamente)',
              });
              if (createRes.data && createRes.data.id) {
                mId = createRes.data.id;
              }
            }
          } catch (motherErr) {
            console.warn('Error verificando/creando madre:', motherErr?.message);
          }
        }

        if (mId) {
          payload.mother_id = mId;
        } else {
          payload.mother_id = null;
        }
      } else {
        payload.mother_id = null;
      }

      delete payload.motherIdentifier;
      [
        'birth_date',
        'last_calving_date',
        'second_last_calving_date',
        'purchase_date',
      ].forEach((f) => {
        if (!payload[f]) payload[f] = null;
      });
      delete payload.is_pregnant;
      delete payload.pregnancy_months;
      ['color', 'nickname', 'breed', 'sex'].forEach((f) => {
        if (!payload[f]) payload[f] = null;
      });

      payload.grado = payload.grado ? parseFloat(payload.grado) : null;
      payload.birth_weight = payload.birth_weight
        ? parseFloat(payload.birth_weight)
        : null;

      if (!animalToEdit) {
        payload.origin = 'NACIMIENTO';
        // Generar UUID único de transacción para garantizar idempotencia
        payload.idempotency_key =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      } else {
        delete payload.origin;
      }

      if (animalToEdit) {
        await axios.patch(
          `/animals/${animalToEdit.id}`,
          payload,
        );
        CustomAlert.closeLoading();
        await CustomAlert.success('¡Actualizado con éxito!', 'El registro ha sido actualizado correctamente.');
      } else {
        // If user is OPERADOR, send to requests instead of directly to animals
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'OPERADOR') {
          await axios.post('/requests', {
            type: 'NACIMIENTO',
            payload,
          });
          CustomAlert.closeLoading();
          await CustomAlert.success(
            'Solicitud Enviada',
            'Tu solicitud de nacimiento ha sido enviada al administrador para su revisión.',
          );
        } else {
          const res = await axios.post('/animals', payload);
          const savedAnimal = res.data;
          CustomAlert.closeLoading();
          await CustomAlert.success(
            '¡Nacimiento Registrado!',
            `El animal fue registrado exitosamente con el identificador: ${savedAnimal?.identifier || 'Asignado'}`
          );
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      CustomAlert.closeLoading();
      CustomAlert.info('Aviso', error?.response?.data?.message || 'Error al guardar. Verifica los datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDER HELPERS ---
  if (!isOpen) return null;

  // --- MAIN RENDER ---
  return createPortal(
    <div className="modal-overlay fade-in">
      <div
        className="premium-card modal-content"
        style={{ position: 'relative' }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '24px',
            right: '24px',
            background: 'transparent',
            color: 'white',
          }}
        >
          <X size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>
          {animalToEdit ? 'Editar Registro' : 'Nuevo Nacimiento'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          Gestión de registro local
        </p>

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
                  { label: 'Crias (0 a 6.5 meses)', isGroup: true },
                  { label: 'Chiva (Hembra)', value: 'CHIVA' },
                  { label: 'Chivo (Macho)', value: 'CHIVO' },
                  { label: 'Desmadres (6.5 meses a 1 año)', isGroup: true },
                  { label: 'Desmadre Hembra', value: 'DESMADRE_HEMBRA' },
                  { label: 'Desmadre Macho', value: 'DESMADRE_MACHO' },
                  { label: 'Otros', isGroup: true },
                  { label: 'Caballo', value: 'CABALLO' },
                  { label: 'Vaca', value: 'VACA' },
                  { label: 'Toro', value: 'TORO' },
                  { label: 'Novilla', value: 'NOVILLA' },
                  { label: 'Torete', value: 'TORETE' },
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
                  { label: 'Macho (M)', value: 'M' },
                ]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Identificador</label>
              <input
                type="text"
                className="input-field"
                value={
                  animalToEdit
                    ? animalToEdit.identifier
                    : formData.type === 'CABALLO'
                      ? 'No Requerido (Solo Nombre)'
                      : 'Autogenerado...'
                }
                disabled
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  color: 'var(--text-muted)',
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Estado del Animal</label>
              <CustomSelect
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                options={[
                  { label: 'Activo', value: 'ACTIVO' },
                  { label: 'Baja / Muerto', value: 'MUERTO' },
                  { label: 'Vendido', value: 'VENDIDO' },
                ]}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color / Capa</label>
              <input
                type="text"
                name="color"
                className="input-field"
                value={formData.color}
                onChange={handleChange}
                placeholder="Ej. Pinto"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Grado (Genética)</label>
              <input
                type="number"
                step="0.01"
                name="grado"
                className="input-field"
                value={formData.grado}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Peso Inicial (lbs)</label>
              <input
                type="number"
                step="0.01"
                name="birth_weight"
                className="input-field"
                value={formData.birth_weight}
                onChange={handleChange}
              />
            </div>
            {(formData.type === 'TORO' || formData.type === 'CABALLO') && (
              <div className="form-group">
                <label className="form-label">
                  Apodo / Nombre{' '}
                  {formData.type === 'CABALLO' && (
                    <span style={{ color: '#ef4444' }}>*</span>
                  )}
                </label>
                <input
                  type="text"
                  name="nickname"
                  className="input-field"
                  value={formData.nickname}
                  onChange={handleChange}
                  required={formData.type === 'CABALLO'}
                />
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
                  { label: 'Novilla', value: 'NOVILLA' },
                ]}
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Fecha de Nacimiento</label>
              <SystemDatePicker
                name="birth_date"
                className="input-field"
                value={formData.birth_date}
                onChange={handleChange}
              />
            </div>
            <div
              className="form-group"
              style={{
                gridColumn: '1 / -1',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '16px',
                borderRadius: '12px',
              }}
            >
              <label className="form-label">ID de la Madre</label>
              <input
                type="text"
                name="motherIdentifier"
                className="input-field"
                style={{ marginBottom: 0 }}
                value={formData.motherIdentifier}
                onChange={handleChange}
                placeholder="Ej. 1/21"
                list="cows-list"
              />
              <datalist id="cows-list">
                {Array.isArray(cows) && cows
                  .filter((c) => c.status === 'ACTIVO' && c.sex === 'H')
                  .map((cow) => (
                    <option key={cow.id} value={cow.identifier}>
                      {cow.identifier} {cow.nickname ? `- ${cow.nickname}` : ''}
                    </option>
                  ))}
              </datalist>
            </div>
            {['VACA', 'NOVILLA', 'CHIVA', 'DESMADRE_HEMBRA'].includes(formData.type) && (
              <>
                <div className="form-group">
                  <label className="form-label">Total Partos</label>
                  <input
                    type="number"
                    name="total_calvings"
                    className="input-field"
                    value={formData.total_calvings}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Último Parto</label>
                  <SystemDatePicker
                    name="last_calving_date"
                    className="input-field"
                    value={formData.last_calving_date}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Penúltimo Parto</label>
                  <SystemDatePicker
                    name="second_last_calving_date"
                    className="input-field"
                    value={formData.second_last_calving_date}
                    onChange={handleChange}
                  />
                </div>
              </>
            )}
          </div>
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">Observaciones</label>
            <textarea
              name="observations"
              className="input-field"
              rows="3"
              value={formData.observations}
              onChange={handleChange}
            ></textarea>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '16px',
              marginTop: '32px',
            }}
          >
            <button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary" style={{ opacity: isSubmitting ? 0.7 : 1, cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
