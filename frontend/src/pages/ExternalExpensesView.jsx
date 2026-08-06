import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { CustomAlert } from '../utils/alerts';
import { Plus, X, Trash2, Download } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import * as XLSX from 'xlsx';

export default function ExternalExpensesView() {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isNewCategory, setIsNewCategory] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));
  const isSuperUser = user?.role === 'SUPERUSER';


  // Filtros por defecto (mes actual)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split('T')[0];
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split('T')[0];

  const [dateFilter, setDateFilter] = useState({
    startDate: firstDay,
    endDate: lastDay,
  });

  const [formData, setFormData] = useState({
    category: 'Gasolina',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [imageFile, setImageFile] = useState(null);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('http://localhost:3001/external-expenses', {
        params: {
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
        },
      });
      setExpenses(res.data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      CustomAlert.error('Error', 'No se pudieron cargar los gastos externos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [dateFilter]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = new FormData();
    data.append('category', formData.category);
    data.append('description', formData.description);
    data.append('amount', formData.amount);
    data.append('date', formData.date);
    if (imageFile) {
      data.append('image', imageFile);
    }

    try {
      await axios.post('http://localhost:3001/external-expenses', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setIsModalOpen(false);
      setIsNewCategory(false);
      setFormData({
        category: 'Gasolina',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
      setImageFile(null);
      CustomAlert.success(
        'Gasto Registrado',
        'El gasto externo se guardó correctamente.',
      );
      fetchExpenses();
    } catch (error) {
      console.error(error);
      CustomAlert.error(
        'Error',
        'Hubo un error al registrar el gasto externo.',
      );
    }
  };

  const handleDelete = async (id) => {
    const result = await CustomAlert.confirm(
      '¿Deseas ELIMINAR este gasto? Esta acción no se puede deshacer y borrará el comprobante.',
    );
    if (result.isConfirmed) {
      try {
        await axios.delete(`http://localhost:3001/external-expenses/${id}`);
        fetchExpenses();
        CustomAlert.success('Eliminado', 'Gasto eliminado exitosamente.');
      } catch (err) {
        CustomAlert.error('Error', 'No se pudo eliminar el gasto.');
      }
    }
  };

  const exportToExcel = () => {
    if (expenses.length === 0) {
      CustomAlert.info('Aviso', 'No hay datos para exportar.');
      return;
    }

    const exportData = expenses.map((exp) => ({
      ID: exp.id,
      Fecha: new Date(exp.date).toLocaleDateString(),
      Categoría: exp.category,
      Descripción: exp.description,
      'Monto (Q)': exp.amount,
      'Tiene Comprobante': exp.imageUrl ? 'Sí' : 'No',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gastos');
    XLSX.writeFile(
      workbook,
      `Gastos_Externos_${dateFilter.startDate}_a_${dateFilter.endDate}.xlsx`,
    );
  };

  return (
    <div className="fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1
            style={{ fontSize: '2rem', marginBottom: '8px', color: '#2196F3' }}
          >
            Gastos Externos
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Registra y monitorea gastos de gasolina, sal, insumos y otros de la
            finca.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <button
            className="btn-primary"
            style={{
              background: '#10b981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={exportToExcel}
          >
            <Download size={20} /> Exportar Excel
          </button>
          <button
            className="btn-primary"
            style={{
              background: '#2196F3',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={20} /> Registrar Gasto
          </button>
        </div>
      </div>

      {/* Resumen y Filtros */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '24px',
        }}
      >
        <div
          className="premium-card"
          style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <h3
            style={{
              color: 'var(--text-muted)',
              fontSize: '1rem',
              marginBottom: '8px',
              fontWeight: '500',
            }}
          >
            Total Gastos (Rango Seleccionado)
          </h3>
          <p
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#ef4444',
              margin: 0,
            }}
          >
            Q{' '}
            {expenses
              .reduce((acc, curr) => acc + Number(curr.amount), 0)
              .toFixed(2)}
          </p>
        </div>

        <div className="premium-card" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '16px', fontSize: '1.2rem' }}>
            Filtro de Fechas
          </h3>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'flex-end',
            }}
          >
            <div
              className="form-group"
              style={{ margin: 0, flex: 1, minWidth: '150px' }}
            >
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="input-field"
                value={dateFilter.startDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
              />
            </div>
            <div
              className="form-group"
              style={{ margin: 0, flex: 1, minWidth: '150px' }}
            >
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="input-field"
                value={dateFilter.endDate}
                onChange={(e) =>
                  setDateFilter((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </div>
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
            Cargando gastos...
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
                    Fecha
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Categoría
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Descripción
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Monto (Q)
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
                {expenses.length === 0 ? (
                  <tr>
                    <td
                      colSpan="6"
                      style={{
                        padding: '24px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No hay gastos registrados en este rango de fechas.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>
                        {expense.category}
                      </td>
                      <td style={{ padding: '16px', color: 'white' }}>
                        {expense.description}
                      </td>
                      <td
                        style={{
                          padding: '16px',
                          color: '#ef4444',
                          fontWeight: 'bold',
                        }}
                      >
                        - Q {expense.amount}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {expense.imageUrl ? (
                          <div
                            style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: '1px solid rgba(255,255,255,0.1)',
                              transition: 'transform 0.2s, box-shadow 0.2s',
                            }}
                            onClick={() =>
                              setPreviewImage(
                                `${axios.defaults.baseURL}/external-expenses/uploads/${expense.imageUrl}`,
                              )
                            }
                            title="Ver imagen completa"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.1)';
                              e.currentTarget.style.boxShadow = '0 0 12px rgba(239,68,68,0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <img
                              src={`${axios.defaults.baseURL}/external-expenses/uploads/${expense.imageUrl}`}
                              alt="Comprobante"
                              loading="lazy"
                              width="100%"
                              height="100%"
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                              }}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement.innerHTML = '<span style="font-size:22px;display:flex;align-items:center;justify-content:center;height:100%;color:#6b7280">&#128444;</span>';
                              }}
                            />
                          </div>
                        ) : (
                          <span
                            style={{
                              color: 'var(--text-muted)',
                              fontSize: '13px',
                            }}
                          >
                            Sin comprobante
                          </span>
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
                            onClick={() => handleDelete(expense.id)}
                            style={{
                              background: 'rgba(244,67,54,0.1)',
                              color: '#F44336',
                              border: 'none',
                              padding: '6px',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={16} />
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

      {isModalOpen &&
        createPortal(
          <div className="modal-overlay fade-in">
            <div
              className="premium-card modal-content"
              style={{ position: 'relative', maxWidth: '600px' }}
            >
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  background: 'transparent',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                <X size={24} />
              </button>
              <h2
                style={{
                  fontSize: '1.5rem',
                  marginBottom: '8px',
                  color: '#2196F3',
                }}
              >
                Registrar Gasto Externo
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                Ingresa los detalles del gasto y adjunta el comprobante
                (opcional).
              </p>
              <form onSubmit={handleSubmit}>
                <div
                  className="form-grid"
                  style={{ gridTemplateColumns: '1fr 1fr' }}
                >
                  <div className="form-group">
                    <label className="form-label">Categoría</label>
                    {isSuperUser && (
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          <input
                            type="checkbox"
                            checked={isNewCategory}
                            onChange={(e) => {
                              setIsNewCategory(e.target.checked);
                              if (!e.target.checked) {
                                setFormData((prev) => ({ ...prev, category: 'Gasolina' }));
                              } else {
                                setFormData((prev) => ({ ...prev, category: '' }));
                              }
                            }}
                            style={{ marginRight: '8px' }}
                          />
                          Agregar nueva categoría
                        </label>
                      </div>
                    )}
                    {isNewCategory ? (
                      <input
                        type="text"
                        name="category"
                        className="input-field"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        placeholder="Nombre de la nueva categoría"
                      />
                    ) : (
                      <CustomSelect
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        options={[
                          { label: 'Gasolina', value: 'Gasolina' },
                          { label: 'Sal', value: 'Sal' },
                          { label: 'Insumos', value: 'Insumos' },
                          { label: 'Otros', value: 'Otros' },
                          ...Array.from(new Set(expenses.map(e => e.category)))
                            .filter(c => !['Gasolina', 'Sal', 'Insumos', 'Otros'].includes(c))
                            .map(c => ({ label: c, value: c }))
                        ]}
                      />
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha del Gasto</label>
                    <input
                      type="date"
                      name="date"
                      className="input-field"
                      value={formData.date}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Descripción</label>
                    <input
                      type="text"
                      name="description"
                      className="input-field"
                      value={formData.description}
                      onChange={handleChange}
                      required
                      placeholder="Ej. Compra de 5 quintales de sal"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ color: '#2196F3' }}>
                      Monto (Q)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="amount"
                      className="input-field"
                      value={formData.amount}
                      onChange={handleChange}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">
                      Comprobante (Imagen: JPG, PNG)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="input-field"
                      style={{ padding: '8px 12px' }}
                    />
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
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      background: '#2196F3',
                      color: '#fff',
                      padding: '12px 24px',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    Guardar Gasto
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Modal de Vista Previa de Imagen */}
      {previewImage &&
        createPortal(
          <div
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.92)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '24px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            <div
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                title="Cerrar"
                style={{
                  position: 'fixed',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(239, 68, 68, 0.85)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px',
                  borderRadius: '50%',
                  zIndex: 10000,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                  transition: 'background 0.2s, transform 0.2s',
                  width: '44px',
                  height: '44px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 38, 38, 1)';
                  e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.85)';
                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                }}
              >
                <X size={22} />
              </button>
              <img
                src={previewImage}
                alt="Comprobante - Vista Completa"
                style={{
                  maxWidth: '90vw',
                  maxHeight: '85vh',
                  objectFit: 'contain',
                  borderRadius: '12px',
                  boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8)',
                  display: 'block',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.insertAdjacentHTML('afterend',
                    '<div style="color:white;text-align:center;padding:40px"><p style="font-size:48px">&#128444;</p><p>No se pudo cargar la imagen</p></div>'
                  );
                }}
              />
              <p style={{
                position: 'absolute',
                bottom: '-36px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}>Haz clic fuera para cerrar</p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
