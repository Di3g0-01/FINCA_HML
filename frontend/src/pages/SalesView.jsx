import { CustomAlert } from '../utils/alerts';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { Plus, X, Edit, Upload, Eye, FileSpreadsheet } from 'lucide-react';
import SystemDatePicker from '../components/SystemDatePicker';
import * as XLSX from 'xlsx';
import { useRef } from 'react';

export default function SalesView() {
  const [animals, setAnimals] = useState([]);
  const [activeInventory, setActiveInventory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const fileInputRef = useRef(null);

  const getLocalYMD = (dateObj) => {
    const d = new Date(dateObj.getTime());
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  };

  // Filtros por defecto (mes actual)
  const today = new Date();
  const firstDay = getLocalYMD(new Date(today.getFullYear(), today.getMonth(), 1));
  const lastDay = getLocalYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));

  const [dateFilter, setDateFilter] = useState({
    startDate: firstDay,
    endDate: lastDay,
  });

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

  const user = JSON.parse(localStorage.getItem('user'));
  const isSuperUser = user?.role === 'SUPERUSER';

  const filteredAnimals = animals.filter((animal) => {
    if (!animal.sale_date) return false;
    const sDate = animal.sale_date.split('T')[0];
    return sDate >= dateFilter.startDate && sDate <= dateFilter.endDate;
  });

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
        await axios.patch(`/animals/${id}`, {
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
          const normalizedRow = {};
          for (const k in row) {
            normalizedRow[String(k).toUpperCase().replace(/\s+/g, '')] = row[k];
          }
          for (const key of keys) {
            if (
              normalizedRow[key] !== undefined &&
              normalizedRow[key] !== null &&
              String(normalizedRow[key]).trim() !== ''
            )
              return normalizedRow[key];
          }
          return null;
        };

        const parseP = (val) => {
          if (!val) return null;
          const cleanStr = String(val).replace(/[^0-9\.\,]/g, '').replace(/,/g, '');
          return parseFloat(cleanStr) || null;
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
                   status: 'VENDIDO',
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

            const rawPeso = String(getVal(row, ['PESO', 'LIBRAS', 'PESOVENTA', 'LIBRASVENTA']) || '').trim().toUpperCase();
            let modality = String(getVal(row, ['MODALIDAD', 'TIPOVENTA', 'TIPODEVENTA', 'MODALIDADDEVENTA']) || '').toUpperCase();
            
            if (rawPeso === 'N/A' || modality.includes('RAZERO') || modality.includes('LOTE') || modality.includes('CABEZA')) {
              modality = 'RAZERO';
            } else {
              modality = 'LIBRA';
            }

            const saleWeight = parseP(rawPeso);
            const precioLib = parseP(getVal(row, ['PRECIOLIB', 'PRECIOPORLIBRA', 'PRECIOLIB.', 'PRECIO_LIB']));
            let salePrice = parseP(getVal(row, ['PRECIO', 'PRECIOVENTA', 'TOTAL', 'MONTOTRANSDACCION', 'MONTO', 'VENTA', 'VALOR']));

            if (modality === 'LIBRA' && saleWeight !== null && precioLib !== null) {
              salePrice = saleWeight * precioLib;
            }
            const buyerName = getVal(row, ['COMPRADOR', 'CLIENTE', 'AQUIENSEVENDIO', 'NOMBRECOMPRADOR']);
            const saleDate = parseDate(getVal(row, ['FECHADEVENTA', 'FECHAVENTA', 'VENTA', 'FECHA']));

            const payload = {
              status: 'VENDIDO',
              sale_modality: modality,
              sale_weight: modality === 'LIBRA' ? saleWeight : null,
              sale_price: salePrice,
              buyer_name: buyerName || null,
              sale_date: saleDate || getLocalYMD(new Date())
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

  const handleClearAllSales = async () => {
    if (animals.length === 0) {
      CustomAlert.info('Aviso', 'No hay ventas para borrar.');
      return;
    }
    if (
      (
        await CustomAlert.confirm(
          '¿Estás seguro de que deseas ELIMINAR todas las ventas? Todos los animales volverán al Inventario Activo.',
        )
      ).isConfirmed
    ) {
      try {
        setIsLoading(true);
        const promises = animals.map((a) =>
          axios.patch(`/animals/${a.id}`, {
            status: 'ACTIVO',
            sale_date: null,
            sale_price: null,
            sale_weight: null,
            sale_modality: null,
            buyer_name: null,
            sale_receipt_path: null,
          })
        );
        await Promise.all(promises);
        CustomAlert.success('Éxito', 'Todas las ventas han sido borradas.');
        fetchData();
      } catch (err) {
        CustomAlert.info('Aviso', 'Error al borrar ventas.');
        setIsLoading(false);
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
        <div style={{ display: 'flex', gap: '16px' }}>
          {isSuperUser && animals.length > 0 && (
            <button
              className="btn-danger"
              style={{
                background: '#f44336',
                color: 'white',
                padding: '8px 16px',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 'bold',
                gap: '8px'
              }}
              onClick={handleClearAllSales}
            >
              <span className="mobile-only"><X size={20} /></span>
              <span className="desktop-only">Borrar Todo</span>
            </button>
          )}
          <button
            className="btn-primary"
            style={{
              background: '#2196F3',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={() => setIsImportModalOpen(true)}
          >
            <span className="mobile-only"><FileSpreadsheet size={20} /></span>
            <span className="desktop-only">Importar Excel</span>
            <input
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
              background: '#4CAF50',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '4px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <span className="mobile-only"><Plus size={20} /></span>
            <span className="desktop-only">Vender Animal</span>
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
            Total Ventas (Rango Seleccionado)
          </h3>
          <p
            style={{
              fontSize: '2.5rem',
              fontWeight: 'bold',
              color: '#4CAF50',
              margin: 0,
            }}
          >
            Q{' '}
            {filteredAnimals
              .reduce((acc, curr) => acc + (curr.sale_price !== null ? Number(curr.sale_price) : 0), 0)
              .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <SystemDatePicker
                name="startDate"
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
              <SystemDatePicker
                name="endDate"
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
                {filteredAnimals.length === 0 ? (
                  <tr>
                    <td
                      colSpan="8"
                      style={{
                        padding: '40px',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                      }}
                    >
                      No hay ventas registradas históricamente en este módulo para el rango de fechas seleccionado.
                    </td>
                  </tr>
                ) : (
                  filteredAnimals.map((animal) => (
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
