import { CustomAlert } from '../utils/alerts';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { Plus, X, Edit, FileSpreadsheet } from 'lucide-react';
import SystemDatePicker from '../components/SystemDatePicker';
import * as XLSX from 'xlsx';
import { useRef } from 'react';

export default function DeathsView() {
  const [animals, setAnimals] = useState([]);
  const [activeInventory, setActiveInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  const getLocalYMD = (dateObj) => {
    const d = new Date(dateObj.getTime());
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    animal_identifier_search: '',
    animal_id: '',
    death_date: getLocalYMD(new Date()),
    death_reason: '',
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get('/animals?limit=5000');
      const data = res.data.data || res.data;
      setAnimals(data.filter((a) => a.status === 'MUERTO'));
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
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.animal_id && !animalToEdit) {
      CustomAlert.info('Aviso', 'Por favor selecciona el animal fallecido.');
      return;
    }

    try {
      const payload = {
        status: 'MUERTO',
        death_date: formData.death_date || null,
        death_reason: formData.death_reason || null,
      };

      if (animalToEdit) {
        await axios.patch(
          `/animals/${animalToEdit.id}`,
          payload,
        );
      } else {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (user.role === 'OPERADOR') {
          await axios.post('/requests', {
            type: 'MUERTE',
            payload: { ...payload, animal_id: formData.animal_id },
          });
          CustomAlert.success(
            'Solicitud Enviada',
            'Tu reporte de muerte ha sido enviado al administrador para su revisión.',
          );
        } else {
          await axios.patch(
            `/animals/${formData.animal_id}`,
            payload,
          );
        }
      }

      setIsModalOpen(false);
      setAnimalToEdit(null);
      setFormData({
        animal_identifier_search: '',
        animal_id: '',
        death_date: getLocalYMD(new Date()),
        death_reason: '',
      });
      fetchData();
    } catch (error) {
      console.error(error);
      CustomAlert.info('Aviso', 'Error reportando/editando deceso.');
    }
  };

  const [animalToEdit, setAnimalToEdit] = useState(null);

  const handleEdit = (animal) => {
    setAnimalToEdit(animal);
    setFormData({
      animal_identifier_search: animal.identifier,
      animal_id: animal.id,
      death_date: animal.death_date ? animal.death_date.split('T')[0] : '',
      death_reason: animal.death_reason || '',
    });
    setIsModalOpen(true);
  };

  const handleRevert = async (id) => {
    if (
      (
        await CustomAlert.confirm(
          '¿Deseas ANULAR este reporte de muerte? El animal volverá al Inventario Activo.',
        )
      ).isConfirmed
    ) {
      try {
        await axios.patch(`/animals/${id}`, {
          status: 'ACTIVO',
          death_date: null,
          death_reason: null,
        });
        fetchData();
      } catch (err) {
        CustomAlert.info('Aviso', 'Error al anular muerte.');
      }
    }
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        const sheetArray = XLSX.utils.sheet_to_json(ws, { header: 1 });
        let headerRowIndex = 0;

        for (let i = 0; i < sheetArray.length; i++) {
          const rowCells = sheetArray[i];
          if (!rowCells || rowCells.length === 0) continue;

          const hasIdentifier = rowCells.some((cell) => {
            const val = String(cell || '')
              .trim()
              .toUpperCase();
            return [
              'ANIMA',
              'ANIMAL',
              'IDENTIFICADOR',
              'ID',
              'CHAPA',
              'N.VACA',
              'N. VACA',
              'NOVACA',
              'N VACA',
            ].some((k) => val.includes(k));
          });

          if (hasIdentifier) {
            headerRowIndex = i;
            break;
          }
        }

        const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

        if (!data || data.length === 0) {
          CustomAlert.info(
            'Aviso',
            'El archivo Excel parece estar vacío o no tiene el formato correcto.',
          );
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setIsLoading(true);
        let successCount = 0;
        let failCount = 0;
        let errors = [];

        const existingMap = new Map();
        try {
          const dbDataRes = await axios.get('/animals?limit=10000');
          const animalsList = dbDataRes.data.data || dbDataRes.data;
          if (Array.isArray(animalsList)) {
            animalsList.forEach((a) =>
              existingMap.set(
                String(a.identifier).trim().toLowerCase(),
                a.id,
              ),
            );
          }
        } catch (e) {
          console.error('Error pre-fetching animals for import:', e);
        }

        const getVal = (row, keys) => {
          for (const key of keys) {
            // Find a matching key in the row, ignoring case and spaces
            const actualKey = Object.keys(row).find((k) =>
              k.replace(/\s+/g, '').toUpperCase() === key.replace(/\s+/g, '').toUpperCase()
            );

            if (
              actualKey &&
              row[actualKey] !== undefined &&
              row[actualKey] !== null &&
              String(row[actualKey]).trim() !== ''
            ) {
              return row[actualKey];
            }
          }
          return null;
        };

        const parseDate = (val) => {
          if (!val) return null;
          let year, month, day;
          if (typeof val === 'number') {
            if (val < 4000) {
              year = val;
              month = 0;
              day = 1;
            } else {
              const excelEpoch = new Date(Date.UTC(1899, 11, 30));
              const d = new Date(
                excelEpoch.getTime() + Math.round(val * 86400000),
              );
              year = d.getUTCFullYear();
              month = d.getUTCMonth();
              day = d.getUTCDate();
            }
          } else {
            const strVal = String(val).trim();
            if (strVal.match(/^\d{4}-\d{2}-\d{2}/)) {
              return strVal.substring(0, 10);
            }
            const sVal = strVal.split('T')[0].split(' ')[0]; // Remove timestamp if any
            const parts = sVal.match(
              /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/,
            );
            if (parts) {
              year = parseInt(parts[3]);
              if (year < 100) year += 2000;
              let p1 = parseInt(parts[1]);
              let p2 = parseInt(parts[2]);
              if (p2 > 12) {
                month = p1 - 1;
                day = p2;
              } else if (p1 > 12) {
                month = p2 - 1;
                day = p1;
              } else {
                month = p2 - 1;
                day = p1;
              }
            } else {
              const partsYYYYMMDD = sVal.match(
                /^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/,
              );
              if (partsYYYYMMDD) {
                year = parseInt(partsYYYYMMDD[1]);
                month = parseInt(partsYYYYMMDD[2]) - 1;
                day = parseInt(partsYYYYMMDD[3]);
              } else {
                const d = new Date(strVal);
                if (!isNaN(d.getTime())) {
                  if (strVal.includes('Z') || strVal.includes('+')) {
                    year = d.getUTCFullYear();
                    month = d.getUTCMonth();
                    day = d.getUTCDate();
                  } else {
                    year = d.getFullYear();
                    month = d.getMonth();
                    day = d.getDate();
                  }
                } else return null;
              }
            }
          }
          if (year && month !== undefined && day) {
            const m = String(month + 1).padStart(2, '0');
            const d = String(day).padStart(2, '0');
            return `${year}-${m}-${d}`;
          }
          return null;
        };

        for (const rawRow of data) {
          await new Promise((r) => setTimeout(r, 40));
          const row = {};
          Object.keys(rawRow).forEach((k) => {
            const cleanKey = k
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/[^A-Z0-9]/gi, '')
              .toUpperCase();
            row[cleanKey] = rawRow[k];
          });

          try {
            const identifier = String(
              getVal(row, [
                'ANIMA',
                'ANIM',
                'ANIMAL',
                'NVACA',
                'NOVACA',
                'NVACAANIMAL',
                'NOVACAANIMAL',
                'IDENTIFICADOR',
                'ID',
                'IDENTIFICACIN',
                'CHAPA',
                'NUMERO',
                'NO',
              ]) || '',
            ).trim();

            if (
              !identifier ||
              [
                'ANIMAL',
                'IDENTIFICADOR',
                'CHAPA',
                'ID',
                'N. VACA',
                'N.VACA',
                'NO.',
                'IDENTIFICACIN',
                'ANIMA',
              ].includes(identifier.toUpperCase())
            ) {
              continue;
            }

            const cleanId = identifier.toLowerCase();
            let animalId = existingMap.get(cleanId);
            if (!animalId) {
               try {
                 const newAnimalRes = await axios.post('/animals', {
                   identifier: identifier.toUpperCase(),
                   gender: 'H',
                   status: 'MUERTO',
                   type: 'VACA',
                   origin: 'HISTORICO'
                 });
                 animalId = newAnimalRes.data.id || newAnimalRes.data.data?.id;
                 existingMap.set(cleanId, animalId);
               } catch (createErr) {
                 failCount++;
                 errors.push(`${identifier}: Error creando histórico - ${createErr.response?.data?.message || createErr.message}`);
                 continue;
               }
            }

            const deathReason = getVal(row, ['CAUSA', 'MOTIVO', 'RAZON', 'CAUSAMUERTE', 'MOTIVOMUERTE', 'OBSERVACION']);
            const deathDate = parseDate(getVal(row, ['FECHADEMUERTE', 'FECHAMUERTE', 'MUERTE', 'FECHA']));

            const payload = {
              status: 'MUERTO',
              death_reason: deathReason || 'Sin especificar',
              death_date: deathDate || getLocalYMD(new Date())
            };

            await axios.patch(`/animals/${animalId}`, payload);
            successCount++;
          } catch (err) {
            failCount++;
            errors.push(
              `${getVal(rawRow, ['NVACA', 'ANIMAL', 'IDENTIFICADOR']) || 'Fila'}: ${err.message}`,
            );
          }
        }

        CustomAlert.success(
          'Importación Completada',
          `Éxito: ${successCount} | Fallos: ${failCount}`,
        );

        if (errors.length > 0) {
          console.warn('Errores de importación:', errors);
          CustomAlert.info(
            'Detalle de Fallos',
            'Revisa la consola para más detalles sobre los registros que fallaron.',
          );
        }

      } catch (err) {
        console.error(err);
        CustomAlert.info('Aviso', 'Error al procesar el archivo Excel.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchData();
      }
    };
    reader.readAsBinaryString(file);
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
            style={{ fontSize: '2rem', marginBottom: '8px', color: '#ff9800' }}
          >
            Registro de Bajas / Muertes
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Módulo para descartar animales del inventario por causas de muerte y
            archivar el historial.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button
            className="btn-primary"
            style={{
              background: '#2196F3',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="mobile-only"><FileSpreadsheet size={20} /></span> <span className="desktop-only">Importar Excel</span><input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImportExcel}
            />
          </button>
          <button
            className="btn-primary"
            style={{
              background: '#ff9800',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <span className="mobile-only"><Plus size={20} /></span> <span className="desktop-only">Declarar Muerte</span></button>
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
                    Fecha de Deceso
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Motivo o Causa Detectada
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
                      colSpan="5"
                      style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No hay reportes de muertes o bajas contabilizadas en el
                      módulo.
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
                        {animal.death_date
                          ? new Date(animal.death_date).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td style={{ padding: '16px', color: '#ff9800' }}>
                        {animal.death_reason || '-'}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                          }}
                        >
                          {JSON.parse(localStorage.getItem('user') || '{}')
                            .role === 'ADMIN' && (
                            <>
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
                                  background: 'rgba(255,152,0,0.1)',
                                  color: '#FF9800',
                                  border: 'none',
                                  padding: '6px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                }}
                              >
                                <X size={16} />
                              </button>
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
                color: '#ff9800',
              }}
            >
              {animalToEdit
                ? 'Editar Reporte de Muerte'
                : 'Reportar deceso del Animal'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
              {animalToEdit
                ? `Editando deceso de: ${animalToEdit.identifier}`
                : 'El animal se eliminará permanentemente de los conteos del inventario activo.'}
            </p>
            <form onSubmit={handleSubmit}>
              {!animalToEdit && (
                <div className="form-group">
                  <label className="form-label">
                    Escriba el Identificador o seleccione el Animal Fallecido
                  </label>
                  <input
                    type="text"
                    name="animal_identifier_search"
                    className="input-field"
                    placeholder="Ej. 1/26"
                    value={formData.animal_identifier_search || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const found = activeInventory.find(
                        (a) =>
                          a.identifier.trim().toLowerCase() ===
                          val.trim().toLowerCase(),
                      );
                      setFormData((prev) => ({
                        ...prev,
                        animal_identifier_search: val,
                        animal_id: found ? found.id : '',
                      }));
                    }}
                    list="active-animals-deaths"
                    required
                  />
                  <datalist id="active-animals-deaths">
                    {activeInventory.map((a) => (
                      <option key={a.id} value={a.identifier}>
                        {a.type} - Lote: {a.lote}
                      </option>
                    ))}
                  </datalist>
                  {formData.animal_identifier_search && !formData.animal_id && (
                    <span
                      style={{
                        color: '#ef4444',
                        fontSize: '12px',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      Animal no encontrado en el inventario activo.
                    </span>
                  )}
                  {formData.animal_id && (
                    <span
                      style={{
                        color: '#10b981',
                        fontSize: '12px',
                        marginTop: '4px',
                        display: 'block',
                      }}
                    >
                      ¡Animal validado exitosamente!
                    </span>
                  )}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Fecha del Deceso</label>
                <SystemDatePicker
                  name="death_date"
                  className="input-field"
                  value={formData.death_date}
                  onChange={handleChange}
                  required={true}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Causa o Razón de Muerte (Opcional)
                </label>
                <textarea
                  name="death_reason"
                  className="input-field"
                  rows="3"
                  value={formData.death_reason}
                  onChange={handleChange}
                  placeholder="Detalla la enfermedad, accidente u observación post-mortem."
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
                  style={{ background: '#ff9800', color: '#000' }}
                >
                  Confirmar Muerte y Archivar
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
