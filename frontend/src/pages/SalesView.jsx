import { CustomAlert } from '../utils/alerts';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { Plus, X, Edit, Upload, Eye } from 'lucide-react';
import SystemDatePicker from '../components/SystemDatePicker';

export default function SalesView() {
  const [animals, setAnimals] = useState([]);
  const [activeInventory, setActiveInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  const getLocalYMD = (dateObj) => {
    const d = new Date(dateObj.getTime());
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    animal_id: '',
    sale_modality: 'LIBRA',
    sale_price: '',
    sale_weight: '',
    sale_price_per_pound: '',
    sale_date: getLocalYMD(new Date()),
    buyer_name: '',
  });

  const [animalSearchTerm, setAnimalSearchTerm] = useState('');

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/animals?limit=5000');
      const data = res.data.data || res.data;
      setAnimals(data.filter((a) => a.status === 'VENDIDO'));
      setActiveInventory(data.filter((a) => a.status === 'ACTIVO'));
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
    const { name, value, type } = e.target;
    if (type === 'number' && value !== '' && parseFloat(value) < 0) {
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    if (formData.sale_modality === 'LIBRA') {
      const w = parseFloat(formData.sale_weight) || 0;
      const p = parseFloat(formData.sale_price_per_pound) || 0;
      return (w * p).toFixed(2);
    }
    return formData.sale_price;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let targetAnimalId = formData.animal_id;

    if (!targetAnimalId && !animalToEdit) {
      if (!animalSearchTerm.trim()) {
        CustomAlert.info(
          'Aviso',
          'Por favor ingresa un identificador para buscar el animal a vender.',
        );
        return;
      }
      const foundAnimal = activeInventory.find(
        (a) =>
          (a.identifier || '').toLowerCase() ===
          animalSearchTerm.trim().toLowerCase(),
      );
      if (!foundAnimal) {
        CustomAlert.info(
          'Aviso',
          'El animal no fue encontrado en el Inventario Activo. Revisa el identificador.',
        );
        return;
      }
      targetAnimalId = foundAnimal.id;
    }

    const finalTotal = calculateTotal();

    let uploadedPath = null;
    if (receiptFile) {
      try {
        const fileData = new FormData();
        fileData.append('file', receiptFile);
        const res = await axios.post('/animals/upload-document', fileData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedPath = res.data.path;
      } catch (err) {
        console.error('Error al subir el comprobante', err);
        CustomAlert.info('Aviso', 'Error al subir el comprobante. La venta no se guardó.');
        return;
      }
    }

    try {
      const payload = {
        status: 'VENDIDO',
        sale_modality: formData.sale_modality,
        sale_weight:
          formData.sale_modality === 'LIBRA'
            ? parseFloat(formData.sale_weight)
            : null,
        sale_price: finalTotal ? parseFloat(finalTotal) : null,
        sale_date: formData.sale_date || null,
        buyer_name: formData.buyer_name || null,
      };

      if (uploadedPath) payload.sale_receipt_path = uploadedPath;

      if (animalToEdit) {
        await axios.patch(
          `/animals/${animalToEdit.id}`,
          payload,
        );
      } else {
        await axios.patch(
          `/animals/${targetAnimalId}`,
          payload,
        );
      }

      setIsModalOpen(false);
      setAnimalToEdit(null);
      setReceiptFile(null);
      setFormData({
        animal_id: '',
        sale_modality: 'LIBRA',
        sale_price: '',
        sale_weight: '',
        sale_price_per_pound: '',
        sale_date: getLocalYMD(new Date()),
        buyer_name: '',
      });
      setAnimalSearchTerm('');
      fetchData();
    } catch (error) {
      console.error(error);
      CustomAlert.info('Aviso', 'Error registrando/editando venta.');
    }
  };

  const [animalToEdit, setAnimalToEdit] = useState(null);

  const handleEdit = (animal) => {
    setAnimalToEdit(animal);
    setFormData({
      animal_id: animal.id,
      sale_modality: animal.sale_modality || 'LIBRA',
      sale_price: animal.sale_price || '',
      sale_weight: animal.sale_weight || '',
      sale_price_per_pound:
        animal.sale_modality === 'LIBRA' && animal.sale_weight > 0
          ? (animal.sale_price / animal.sale_weight).toFixed(2)
          : '',
      sale_date: animal.sale_date ? animal.sale_date.split('T')[0] : '',
      buyer_name: animal.buyer_name || '',
    });
    setIsModalOpen(true);
  };

  const handleRevert = async (id) => {
    if (
      (
        await CustomAlert.confirm(
          '¿Deseas ANULAR esta venta? El animal volverá al Inventario Activo.',
        )
      ).isConfirmed
    ) {
      try {
        await axios.patch(`http://localhost:3001/animals/${id}`, {
          status: 'ACTIVO',
          sale_date: null,
          sale_price: null,
          sale_weight: null,
          sale_modality: null,
          buyer_name: null,
        });
        fetchData();
      } catch (err) {
        CustomAlert.info('Aviso', 'Error al anular venta.');
      }
    }
  };

  return (
    <div className="fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{ fontSize: '2rem', marginBottom: '8px', color: '#4CAF50' }}
          >
            Registro de Ventas
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Módulo para dar de baja animales por venta y registrar ingresos.
          </p>
        </div>
        <button
          className="btn-primary"
          style={{
            background: '#4CAF50',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} /> Vender Animal
        </button>
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div
            style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Cargando registros...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
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
                    Tipo
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Fecha Venta
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Comprador
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Modalidad
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Monto Transacción
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Comprobante
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                      textAlign: 'right',
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No hay ventas registradas históricamente en este módulo.
                    </td>
                  </tr>
                ) : (
                  animals.map((animal) => (
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
                        {animal.sale_date
                          ? new Date(animal.sale_date).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td
                        style={{ padding: '16px', color: 'var(--text-muted)' }}
                      >
                        {animal.buyer_name || 'No Registrado'}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          color: '#4CAF50',
                          fontWeight: 'bold',
                        }}
                      >
                        {animal.sale_modality || '-'}
                        {animal.sale_modality === 'LIBRA' &&
                          animal.sale_weight &&
                          ` (${animal.sale_weight} lbs)`}
                      </td>
                      <td style={{ padding: '16px', color: '#fff' }}>
                        {animal.sale_price !== null
                          ? `Q ${animal.sale_price.toLocaleString()}`
                          : '-'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {animal.sale_receipt_path ? (
                          <div
                            style={{
                              width: '50px',
                              height: '50px',
                            }}
                          >
                            {animal.sale_receipt_path.toLowerCase().endsWith('.pdf') ? (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  height: '100%',
                                  background: 'rgba(255,255,255,0.02)',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                onClick={() => {
                                  const url = `${axios.defaults.baseURL}${animal.sale_receipt_path.startsWith('/') ? '' : '/'}${animal.sale_receipt_path}`;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                title="Ver PDF"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                  e.currentTarget.style.boxShadow = '0 0 12px rgba(33,150,243,0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <span style={{ fontSize: '28px' }}>📄</span>
                              </div>
                            ) : (
                              <div
                                style={{
                                  height: '100%',
                                  background: 'rgba(255,255,255,0.02)',
                                  borderRadius: '8px',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                onClick={() => {
                                  const url = `${axios.defaults.baseURL}${animal.sale_receipt_path.startsWith('/') ? '' : '/'}${animal.sale_receipt_path}`;
                                  window.open(url, '_blank', 'noopener,noreferrer');
                                }}
                                title="Ver Imagen"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                  e.currentTarget.style.boxShadow = '0 0 12px rgba(33,150,243,0.5)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <img
                                  src={`${axios.defaults.baseURL}${animal.sale_receipt_path.startsWith('/') ? '' : '/'}${animal.sale_receipt_path}`}
                                  alt="Comprobante"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                          }}
                        >
                          <button
                            onClick={() => handleEdit(animal)}
                            style={{
                              background: 'rgba(33,150,243,0.1)',
                              color: '#2196F3',
                              border: 'none',
                              padding: '6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleRevert(animal.id)}
                            style={{
                              background: 'rgba(244,67,54,0.1)',
                              color: '#F44336',
                              border: 'none',
                              padding: '6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <X size={16} />
                          </button>
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

      {isModalOpen && createPortal(
        <div className="modal-overlay fade-in">
          <div
            className="premium-card modal-content"
            style={{ position: 'relative' }}
          >
            <button
              onClick={() => setIsModalOpen(false)}
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
            <h2
              style={{
                fontSize: '1.5rem',
                marginBottom: '8px',
                color: '#4CAF50',
              }}
            >
              {animalToEdit
                ? 'Editar Detalle de Venta'
                : 'Registrar Venta de Animal'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              {animalToEdit
                ? `Editando venta de: ${animalToEdit.identifier}`
                : 'Busca el animal en inventario vivo. Selecciona la modalidad de peso para calcular el total.'}
            </p>
            <form onSubmit={handleSubmit}>
              {!animalToEdit && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Buscar Animal por Identificador
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Ejotea el identificador (ej: 1/26)..."
                    value={animalSearchTerm}
                    onChange={(e) => setAnimalSearchTerm(e.target.value)}
                    list="inventory-suggestions"
                    required
                  />
                  <datalist id="inventory-suggestions">
                    {activeInventory.map((a) => (
                      <option key={a.id} value={a.identifier}>
                        {a.type} (Lote: {a.lote})
                      </option>
                    ))}
                  </datalist>
                </div>
              )}
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Modalidad de Venta</label>
                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      padding: '16px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="sale_modality"
                        value="LIBRA"
                        checked={formData.sale_modality === 'LIBRA'}
                        onChange={handleChange}
                        style={{ accentColor: '#4CAF50' }}
                      />
                      Por Libras (Peso)
                    </label>
                    <label
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name="sale_modality"
                        value="RAZERO"
                        checked={formData.sale_modality === 'RAZERO'}
                        onChange={handleChange}
                        style={{ accentColor: '#4CAF50' }}
                      />
                      Por Razero (Cabeza/Lote)
                    </label>
                  </div>
                </div>

                {formData.sale_modality === 'LIBRA' ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">Libras Pesadas</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="sale_weight"
                        className="input-field"
                        value={formData.sale_weight}
                        onChange={handleChange}
                        placeholder="Ej. 1200"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Precio por Libra (Q)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="sale_price_per_pound"
                        className="input-field"
                        value={formData.sale_price_per_pound}
                        onChange={handleChange}
                        placeholder="Ej. 7.50"
                        required
                      />
                    </div>
                    <div
                      className="form-group"
                      style={{ gridColumn: '1 / -1' }}
                    >
                      <label
                        className="form-label"
                        style={{ color: '#4CAF50' }}
                      >
                        Monto Total Calculado (Quetzales)
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={`Q ${calculateTotal()}`}
                        disabled
                        style={{
                          background: 'rgba(76, 175, 80, 0.1)',
                          color: '#4CAF50',
                          fontWeight: 'bold',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">
                      Precio Cerrado de Venta (Q)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="sale_price"
                      className="input-field"
                      value={formData.sale_price}
                      onChange={handleChange}
                      placeholder="Ej. 8500.00"
                      required
                    />
                  </div>
                )}

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">
                    Comprador (A quién se le vendió)
                  </label>
                  <input
                    type="text"
                    name="buyer_name"
                    className="input-field"
                    value={formData.buyer_name}
                    onChange={handleChange}
                    placeholder="Ej. Don Antonio Morales"
                    required
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Fecha de Venta</label>
                  <SystemDatePicker
                    name="sale_date"
                    className="input-field"
                    value={formData.sale_date}
                    onChange={handleChange}
                    required={true}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Comprobante de Venta (Opcional, PDF o Imagen)</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px dashed rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <Upload size={20} />
                    {receiptFile ? receiptFile.name : 'Subir archivo...'}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.gif"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setReceiptFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '16px',
                  marginTop: '32px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    color: 'white',
                    border: '1px solid var(--panel-border)',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ background: '#4CAF50', color: '#000' }}
                >
                  Confirmar y Vender
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
