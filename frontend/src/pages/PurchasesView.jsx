import { CustomAlert } from '../utils/alerts';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, X, Edit, Trash2 } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';

export default function PurchasesView() {
  const [animals, setAnimals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    type: 'VACA',
    identifier: '',
    purchase_price: '',
    seller_name: '',
    birth_date: '',
    color: '',
    breed: '',
    lote: 'GENERAL',
    observations: '',
    sex: 'H'
  });

  const fetchAnimals = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('http://localhost:3001/animals?limit=5000');
      const data = res.data.data || res.data;
      // Mostramos todo lo que tenga origin COMPRA
      setAnimals(data.filter(a => a.origin === 'COMPRA'));
    } catch (error) {
      console.error('Error fetching animals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnimals();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updated = { ...prev, [name]: value };
      if (name === 'type') {
        if (value === 'VACA') updated.sex = 'H';
        else if (value === 'TORO') updated.sex = 'M';
        // Para CABALLO el sexo es libremente seleccionable
      }
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();


    try {
      const payload = { 
        ...formData, 
        origin: 'COMPRA', 
        status: (animalToEdit && animalToEdit.status) ? animalToEdit.status : 'ACTIVO',
        purchase_price: parseFloat(formData.purchase_price) || null,
        birth_date: formData.birth_date || null
      };

      if (animalToEdit) {
        await axios.patch(`http://localhost:3001/animals/${animalToEdit.id}`, payload);
      } else {
        await axios.post('http://localhost:3001/animals', payload);
      }
      
      setIsModalOpen(false);
      setAnimalToEdit(null);
      setFormData({
        type: 'VACA', identifier: '', purchase_price: '', seller_name: '', birth_date: '', color: '', breed: '', lote: 'GENERAL', observations: '', sex: 'H'
      });
      fetchAnimals();
    } catch (error) {
      console.error(error);
      CustomAlert.info("Aviso", 'Error guardando/editando la compra.');
    }
  };

  const [animalToEdit, setAnimalToEdit] = useState(null);

  const handleEdit = (animal) => {
    setAnimalToEdit(animal);
    setFormData({
      type: animal.type || 'VACA',
      identifier: animal.identifier || '',
      purchase_price: animal.purchase_price || '',
      seller_name: animal.seller_name || '',
      birth_date: animal.birth_date ? animal.birth_date.split('T')[0] : '',
      color: animal.color || '',
      breed: animal.breed || '',
      lote: animal.lote || 'GENERAL',
      observations: animal.observations || '',
      sex: animal.sex || 'H'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if ((await CustomAlert.confirm('¿Deseas ELIMINAR este registro de compra? Esto eliminará al animal del sistema permanentemente.')).isConfirmed) {
      try {
        await axios.delete(`http://localhost:3001/animals/${id}`);
        fetchAnimals();
      } catch (err) {
        CustomAlert.info("Aviso", 'Error al eliminar compra.');
      }
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px', color: '#2196F3' }}>Historial de Compras</h1>
          <p style={{ color: 'var(--text-muted)' }}>Registra y monitorea todo el ganado adquirido externamente.</p>
        </div>
        <button className="btn-primary" style={{ background: '#2196F3', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setIsModalOpen(true)}>
          <Plus size={20} /> Registrar Compra
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
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Vendedor</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Precio (Q)</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha Ingreso</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Estatus</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500', textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay compras registradas en el módulo.</td>
                  </tr>
                ) : (
                  animals.map(animal => (
                    <tr key={animal.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>{animal.identifier || '-'}</td>
                      <td style={{ padding: '16px' }}>{animal.type}</td>
                      <td style={{ padding: '16px', color: 'white' }}>{animal.seller_name || '-'}</td>
                      <td style={{ padding: '16px', color: '#2196F3', fontWeight: 'bold' }}>{animal.purchase_price !== null ? `Q ${animal.purchase_price}` : '-'}</td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>{new Date(animal.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '16px' }}>
                         <span style={{ 
                           padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase',
                           background: animal.status === 'ACTIVO' ? 'rgba(76,175,80,0.1)' : (animal.status === 'VENDIDO' ? 'rgba(33,150,243,0.1)' : 'rgba(255,152,0,0.1)'),
                           color: animal.status === 'ACTIVO' ? '#4CAF50' : (animal.status==='VENDIDO' ? '#2196F3' : '#ff9800')
                         }}>
                           {animal.status}
                         </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button onClick={() => handleEdit(animal)} style={{ background: 'rgba(33,150,243,0.1)', color: '#2196F3', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Edit size={16} /></button>
                          <button onClick={() => handleDelete(animal.id)} style={{ background: 'rgba(244,67,54,0.1)', color: '#F44336', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Trash2 size={16} /></button>
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
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#2196F3' }}>{animalToEdit ? 'Editar Registro de Compra' : 'Registrar Nueva Compra Externa'}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{animalToEdit ? `Modificando los detalles originales de la chapa: ${animalToEdit.identifier}` : 'Este animal pasará de inmediato a formar parte de tu Inventario Activo (Dashboard).'}</p>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Tipo de Animal Comprado</label>
                  <CustomSelect 
                    name="type" 
                    value={formData.type} 
                    onChange={handleChange} 
                    required
                    options={[
                      { label: 'Vaca', value: 'VACA' },
                      { label: 'Toro', value: 'TORO' },
                      { label: 'Novilla', value: 'NOVILLA' },
                      { label: 'Torete', value: 'TORETE' },
                      { label: 'Chiva', value: 'CHIVA' },
                      { label: 'Chivo', value: 'CHIVO' },
                      { label: 'Caballo', value: 'CABALLO' }
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
                    disabled={formData.type !== 'CABALLO' && formData.type !== 'CHIVA' && formData.type !== 'CHIVO' && formData.type !== 'VACA' && formData.type !== 'TORO'}
                    options={[
                      { label: 'Hembra (H)', value: 'H' },
                      { label: 'Macho (M)', value: 'M' }
                    ]}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Identificador de Compra (Chapa)</label>
                  <input type="text" name="identifier" className="input-field" value={formData.identifier} onChange={handleChange} placeholder="Ej. 704A" required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#2196F3' }}>Precio de Compra</label>
                  <input type="number" step="0.01" name="purchase_price" className="input-field" value={formData.purchase_price} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#2196F3' }}>Vendedor</label>
                  <input type="text" name="seller_name" className="input-field" value={formData.seller_name} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Color o Capa</label>
                  <input type="text" name="color" className="input-field" value={formData.color} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">Raza (Opcional)</label>
                  <input type="text" name="breed" className="input-field" value={formData.breed} onChange={handleChange} placeholder="Ej. Brahman, Holstein" />
                </div>
                <div className="form-group">
                  <label className="form-label">Lote Destino</label>
                  <CustomSelect 
                    name="lote" 
                    value={formData.lote} 
                    onChange={handleChange} 
                    required
                    options={[
                      { label: 'General', value: 'GENERAL' },
                      { label: 'Desmadre', value: 'DESMADRE' },
                      { label: 'Lote 7', value: 'LOTE7' }
                    ]}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '12px 24px', background: 'transparent', color: 'white', border: '1px solid var(--panel-border)' }}>Cancelar</button>
                <button type="submit" className="btn-primary" style={{ background: '#2196F3', color: '#fff' }}>{animalToEdit ? 'Guardar Cambios' : 'Guardar e Ingresar a Inventario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
