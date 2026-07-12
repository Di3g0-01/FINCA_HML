import { CustomAlert } from '../utils/alerts';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Edit } from 'lucide-react';
import SystemDatePicker from '../components/SystemDatePicker';

export default function DeathsView() {
  const [animals, setAnimals] = useState([]);
  const [activeInventory, setActiveInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    animal_identifier_search: '',
    animal_id: '',
    death_date: new Date().toISOString().split('T')[0],
    death_reason: ''
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('http://localhost:3001/animals?limit=5000');
      const data = res.data.data || res.data;
      setAnimals(data.filter(a => a.status === 'MUERTO'));
      setActiveInventory(data.filter(a => a.status === 'ACTIVO'));
    } catch (error) {
      console.error('Error fetching animals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.animal_id && !animalToEdit) {
      CustomAlert.info("Aviso", "Por favor selecciona el animal fallecido.");
      return;
    }
    
    try {
      const payload = {
        status: 'MUERTO',
        death_date: formData.death_date || null,
        death_reason: formData.death_reason || null
      };

      if (animalToEdit) {
        await axios.patch(`http://localhost:3001/animals/${animalToEdit.id}`, payload);
      } else {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'OPERADOR') {
          await axios.post('http://localhost:3001/requests', { type: 'MUERTE', payload: { ...payload, animal_id: formData.animal_id }});
          CustomAlert.success('Solicitud Enviada', 'Tu reporte de muerte ha sido enviado al administrador para su revisión.');
        } else {
          await axios.patch(`http://localhost:3001/animals/${formData.animal_id}`, payload);
        }
      }

      setIsModalOpen(false);
      setAnimalToEdit(null);
      setFormData({ animal_identifier_search: '', animal_id: '', death_date: new Date().toISOString().split('T')[0], death_reason: '' });
      fetchData();
    } catch (error) {
      console.error(error);
      CustomAlert.info("Aviso", 'Error reportando/editando deceso.');
    }
  };

  const [animalToEdit, setAnimalToEdit] = useState(null);

  const handleEdit = (animal) => {
    setAnimalToEdit(animal);
    setFormData({
      animal_identifier_search: animal.identifier,
      animal_id: animal.id,
      death_date: animal.death_date ? animal.death_date.split('T')[0] : '',
      death_reason: animal.death_reason || ''
    });
    setIsModalOpen(true);
  };

  const handleRevert = async (id) => {
    if ((await CustomAlert.confirm('¿Deseas ANULAR este reporte de muerte? El animal volverá al Inventario Activo.')).isConfirmed) {
      try {
        await axios.patch(`http://localhost:3001/animals/${id}`, {
          status: 'ACTIVO',
          death_date: null,
          death_reason: null
        });
        fetchData();
      } catch (err) {
        CustomAlert.info("Aviso", 'Error al anular muerte.');
      }
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: '#ff9800' }}>Registro de Bajas / Muertes</h1>
          <p style={{ color: 'var(--text-muted)' }}>Módulo para descartar animales del inventario por causas de muerte y archivar el historial.</p>
        </div>
        <button className="btn-primary" style={{ background: '#ff9800', color: '#000', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Declarar Muerte
        </button>
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando registros...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Identificador</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Tipo</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha de Deceso</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Motivo o Causa Detectada</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay reportes de muertes o bajas contabilizadas en el módulo.</td>
                  </tr>
                ) : (
                  animals.map(animal => (
                    <tr key={animal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{animal.identifier || 'Sin ID'}</td>
                      <td style={{ padding: '16px' }}>{animal.type}</td>
                      <td style={{ padding: '16px' }}>{animal.death_date ? new Date(animal.death_date).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ padding: '16px', color: '#ff9800' }}>{animal.death_reason || '-'}</td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          {JSON.parse(localStorage.getItem('user') || '{}').role === 'ADMIN' && (
                            <>
                              <button onClick={() => handleEdit(animal)} style={{ background: 'rgba(33,150,243,0.1)', color: '#2196F3', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Edit size={16} /></button>
                              <button onClick={() => handleRevert(animal.id)} style={{ background: 'rgba(255,152,0,0.1)', color: '#FF9800', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><X size={16} /></button>
                            </>
                          )}
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

      {isModalOpen && (
        <div className="modal-overlay fade-in">
          <div className="premium-card modal-content" style={{ position: 'relative' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'transparent', color: 'white' }}><X size={24} /></button>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#ff9800' }}>{animalToEdit ? 'Editar Reporte de Muerte' : 'Reportar deceso del Animal'}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{animalToEdit ? `Editando deceso de: ${animalToEdit.identifier}` : 'El animal se eliminará permanentemente de los conteos del inventario activo.'}</p>
            <form onSubmit={handleSubmit}>
              {!animalToEdit && (
                <div className="form-group">
                  <label className="form-label">Escriba el Identificador o seleccione el Animal Fallecido</label>
                  <input 
                    type="text" 
                    name="animal_identifier_search" 
                    className="input-field" 
                    placeholder="Ej. 1/26"
                    value={formData.animal_identifier_search || ''}
                    onChange={(e) => {
                       const val = e.target.value;
                       const found = activeInventory.find(a => a.identifier.trim().toLowerCase() === val.trim().toLowerCase());
                       setFormData(prev => ({ 
                           ...prev, 
                           animal_identifier_search: val, 
                           animal_id: found ? found.id : '' 
                       }));
                    }}
                    list="active-animals-deaths"
                    required 
                  />
                  <datalist id="active-animals-deaths">
                    {activeInventory.map(a => (
                      <option key={a.id} value={a.identifier}>{a.type} - Lote: {a.lote}</option>
                    ))}
                  </datalist>
                  {formData.animal_identifier_search && !formData.animal_id && (
                     <span style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', display: 'block' }}>Animal no encontrado en el inventario activo.</span>
                  )}
                  {formData.animal_id && (
                     <span style={{ color: '#10b981', fontSize: '12px', marginTop: '4px', display: 'block' }}>¡Animal validado exitosamente!</span>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Fecha del Deceso</label>
                <SystemDatePicker name="death_date" className="input-field" value={formData.death_date} onChange={handleChange} required={true} />
              </div>
              <div className="form-group">
                <label className="form-label">Causa o Razón de Muerte (Opcional)</label>
                <textarea name="death_reason" className="input-field" rows="3" value={formData.death_reason} onChange={handleChange} placeholder="Detalla la enfermedad, accidente u observación post-mortem."></textarea>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', background: 'transparent', color: 'white', border: '1px solid var(--panel-border)' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#ff9800', color: '#000' }}>Confirmar Muerte y Archivar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
