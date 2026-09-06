import { CustomAlert } from '../utils/alerts';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { Search, Download, Upload, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import AnimalRow from './AnimalRow';

export default function CalvingControlView() {
  // --- STATE & HOOKS ---
  const [animals, setAnimals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterPregnant, setFilterPregnant] = useState(false);

  // --- HANDLERS & LOGIC ---
  const fetchAnimals = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = `?page=${page}&limit=50&status=ACTIVO&isControlPartos=true&isPregnant=${filterPregnant}&_t=${new Date().getTime()}${searchTerm ? `&search=${searchTerm}` : ''}`;
      const res = await axios.get(`/animals${query}`);

      if (res.data.data) {
        setAnimals(res.data.data);
        setTotalPages(res.data.totalPages);
        setTotalRecords(res.data.total);
      } else {
        setAnimals(res.data);
        setTotalPages(1);
        setTotalRecords(res.data.length);
      }
    } catch (error) {
      console.error('Error fetching calving control animals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, filterPregnant]);

  // --- EFFECTS ---
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAnimals();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm, filterPregnant, fetchAnimals]);

  const handleExportExcel = useCallback(async () => {
    try {
      const res = await axios.get(
        `/animals?status=ACTIVO&isControlPartos=true&limit=5000&isPregnant=${filterPregnant}`,
      );
      const data = res.data.data || res.data;
      const exportData = data.map((a) => {
        let months = a.pregnancy_months;
        if (a.is_pregnant && a.pregnancy_start_date) {
          const start = new Date(a.pregnancy_start_date);
          const diffDays =
            (new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
          let calcMonths = diffDays / 30.4375;
          if (calcMonths > 10.0) calcMonths = 10.0;
          months = Math.round(calcMonths * 10) / 10;
        }

        let prediccionParto = 'N/A';
        if (a.is_pregnant) {
          let d;
          if (a.pregnancy_start_date) {
            const start = new Date(a.pregnancy_start_date);
            d = new Date(start.getTime() + 283 * 24 * 60 * 60 * 1000);
          } else {
            const monthsLeft = 9 - (months || 0);
            const daysLeft = Math.round(monthsLeft * 30.4375);
            d = new Date();
            d.setDate(d.getDate() + daysLeft);
          }
          const dayStr = String(d.getDate()).padStart(2, '0');
          const monthStr = String(d.getMonth() + 1).padStart(2, '0');
          prediccionParto = `${dayStr}/${monthStr}/${d.getFullYear()}`;
        }

        return {
          'N. VACA': a.identifier,
          'TIEMPO PREÑEZ': a.is_pregnant ? `${months || 0} meses` : 'NO',
          'PREDICCIÓN PARTO': prediccionParto,
          'TOTAL PARTOS': a.total_calvings || 0,
          'ÚLTIMO PARTO': a.last_calving_date
            ? a.last_calving_date.split('T')[0].split('-').reverse().join('/')
            : 'N/A',
          'PENÚLTIMO PARTO': a.second_last_calving_date
            ? a.second_last_calving_date
                .split('T')[0]
                .split('-')
                .reverse()
                .join('/')
            : 'N/A',
          LOTE: a.lote || 'GENERAL',
          'FECHA NACIMIENTO': a.birth_date
            ? a.birth_date.split('T')[0].split('-').reverse().join('/')
            : 'N/A',
          OBSERVACIONES: a.observations || '',
        };
      });
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Control_Partos');
      const fileName = filterPregnant
        ? 'Control_Partos_Solo_Preñadas.xlsx'
        : 'Control_Partos_Todas.xlsx';
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      CustomAlert.info('Aviso', 'Error al exportar Excel');
    }
  }, [filterPregnant]);

  const fileInputRef = useRef(null);

  const handleImportCargadas = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary', raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Leer la hoja como matriz 2D de cadenas
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

        if (!rows || rows.length === 0) {
          CustomAlert.info('Aviso', 'El archivo Excel parece estar vacío.');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setIsLoading(true);

        // Determinar la fecha del chequeo / palpación (por defecto 19 de Julio de 2026 para este documento)
        let inspectionDate = new Date(2026, 6, 19); // 19 de Julio de 2026 (mes 6 en JS es Julio)

        if (file && file.name) {
          const fileNameUpper = file.name.toUpperCase();
          const monthMap = {
            ENE: 0, JAN: 0, FEB: 1, MAR: 2, ABR: 3, APR: 3, MAY: 4, JUN: 5,
            JUL: 6, AGO: 7, AUG: 7, SEP: 8, SET: 8, OCT: 9, NOV: 10, DIC: 11, DEC: 11,
          };
          const matchDate = fileNameUpper.match(/(\d{1,2})\s*[\-_]?\s*([A-Z]{3})/);
          if (matchDate && monthMap[matchDate[2]] !== undefined) {
            const day = parseInt(matchDate[1], 10);
            const month = monthMap[matchDate[2]];
            const year = new Date().getFullYear();
            inspectionDate = new Date(year, month, day);
          }
        }

        // Pre-obtener animales de la base de datos para mapeo rápido
        const dbRes = await axios.get('/animals?limit=10000');
        const animalsList = dbRes.data.data || dbRes.data;

        const animalMap = new Map();
        if (Array.isArray(animalsList)) {
          animalsList.forEach((a) => {
            if (a.identifier) {
              const exactKey = String(a.identifier).trim().toLowerCase();
              const normKey = exactKey.replace(/[^a-z0-9]/g, '');
              animalMap.set(exactKey, a);
              animalMap.set(normKey, a);
            }
          });
        }

        let successCount = 0;
        let failCount = 0;
        let notFoundCount = 0;
        const errors = [];

        for (const rowCells of rows) {
          if (!Array.isArray(rowCells) || rowCells.length === 0) continue;

          // Convertir todas las celdas no vacías a cadenas limpias
          const cells = rowCells.map((c) => String(c || '').trim()).filter((c) => c !== '');
          if (cells.length === 0) continue;

          const rowText = cells.join(' ').toUpperCase();

          // Ignorar filas que contengan únicamente encabezados
          if (
            (rowText.includes('ORDEN') && rowText.includes('ESTADO')) ||
            (rowText.includes('INVENT') && rowText.includes('ESTADO')) ||
            rowText === 'ESTADO NO.INVENT' ||
            rowText === 'NO.INVENT ESTADO' ||
            rowText === 'ESTADO NO INVENT' ||
            rowText === 'NO INVENT ESTADO'
          ) {
            continue;
          }

          let targetAnimal = null;
          let identifierFound = '';
          let estadoFound = '';

          // 1. Buscar si alguna celda coincide con un identificador de animal en la BD
          for (const cell of cells) {
            const cleanCell = cell.toLowerCase();
            const normCell = cleanCell.replace(/[^a-z0-9]/g, '');

            if (animalMap.has(cleanCell)) {
              targetAnimal = animalMap.get(cleanCell);
              identifierFound = cell;
              break;
            } else if (animalMap.has(normCell)) {
              targetAnimal = animalMap.get(normCell);
              identifierFound = cell;
              break;
            }
          }

          // 2. Si no hubo coincidencia directa en la BD, identificar celda por patrón o formato
          if (!targetAnimal) {
            for (const cell of cells) {
              const upperCell = cell.toUpperCase();
              if (
                upperCell.includes('MESES') ||
                upperCell.includes('DIAS') ||
                upperCell.includes('VACIA') ||
                upperCell.includes('PARIDA') ||
                upperCell.includes('CICLANDO') ||
                upperCell.includes('LUTEO') ||
                upperCell.includes('SINCRONIZADA')
              ) {
                estadoFound = cell;
              } else if (cell.match(/^\d+[\/\-\.]\d+$/) || cell.match(/^\d+$/)) {
                identifierFound = cell;
              }
            }
            if (identifierFound) {
              const cleanCell = identifierFound.toLowerCase();
              const normCell = cleanCell.replace(/[^a-z0-9]/g, '');
              targetAnimal = animalMap.get(cleanCell) || animalMap.get(normCell);
            }
          } else {
            // Extraer el texto de estado de las celdas restantes
            const remaining = cells.filter((c) => c !== identifierFound);
            if (remaining.length > 0) {
              estadoFound = remaining.join(' ');
            }
          }

          if (!identifierFound || identifierFound.toUpperCase().includes('INVENT') || identifierFound.toUpperCase() === 'NO.') {
            continue;
          }

          if (!targetAnimal) {
            notFoundCount++;
            errors.push(`Vaca ${identifierFound}: No encontrada en el inventario.`);
            continue;
          }

          try {
            let isPregnant = false;
            let pregnancyMonthsAtInspection = null;
            let newObservations = targetAnimal.observations || '';

            if (estadoFound) {
              const upperEstado = estadoFound.toUpperCase();

              // Coincidencia de Meses (ej: "5 MESES", "3.5 MESES", "6 MESES")
              const monthsMatch = upperEstado.match(/(\d+(?:\.\d+)?)\s*(?:MESES|MES)/);
              // Coincidencia de Días (ej: "45 DIAS", "30 DIAS")
              const daysMatch = upperEstado.match(/(\d+(?:\.\d+)?)\s*(?:DIAS|DIA)/);

              if (monthsMatch) {
                isPregnant = true;
                pregnancyMonthsAtInspection = parseFloat(monthsMatch[1]);
              } else if (daysMatch) {
                isPregnant = true;
                const days = parseFloat(daysMatch[1]);
                pregnancyMonthsAtInspection = Math.round((days / 30.4375) * 10) / 10;
              } else {
                // Estado vacía o diagnóstico (ej: "VACIA CUERPO LUTEO")
                isPregnant = false;
                pregnancyMonthsAtInspection = null;
                newObservations = estadoFound;
              }
            }

            let pregnancyStartDate = null;
            let currentPregnancyMonths = null;

            if (isPregnant && pregnancyMonthsAtInspection !== null) {
              // Calcular la fecha estimada de concepción / inicio de preñez a partir de la fecha de chequeo
              const startMs = inspectionDate.getTime() - Math.round(pregnancyMonthsAtInspection * 30.4375 * 24 * 60 * 60 * 1000);
              pregnancyStartDate = new Date(startMs);

              // Meses de preñez transcurridos hasta el día de hoy
              const nowMs = new Date().getTime();
              const diffDaysNow = (nowMs - pregnancyStartDate.getTime()) / (1000 * 60 * 60 * 24);
              let monthsNow = diffDaysNow / 30.4375;
              if (monthsNow > 10.0) monthsNow = 10.0;
              currentPregnancyMonths = Math.round(monthsNow * 10) / 10;
            }

            const payload = {
              is_pregnant: isPregnant,
              pregnancy_start_date: isPregnant && pregnancyStartDate ? pregnancyStartDate.toISOString() : null,
              pregnancy_months: isPregnant ? currentPregnancyMonths : null,
              observations: newObservations || null,
            };

            await axios.patch(`/animals/${targetAnimal.id}`, payload);
            successCount++;
          } catch (err) {
            failCount++;
            errors.push(`Vaca ${identifierFound}: ${err.message}`);
          }
        }

        CustomAlert.success(
          'Importación de Preñez Completada',
          `Actualizadas: ${successCount} | No encontradas en inventario: ${notFoundCount} | Fallos: ${failCount}`
        );

        if (errors.length > 0 && notFoundCount > 0) {
          console.warn('Detalle de importación de preñez:', errors);
        }

        fetchAnimals();
      } catch (err) {
        console.error('Error al procesar archivo de preñez:', err);
        CustomAlert.info('Aviso', 'Error al procesar el archivo Excel de preñez.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const onToggleExpand = useCallback((id) => {
    setExpandedRowId(id);
  }, []);

  const renderedRows = useMemo(() => {
    return animals.map((a) => (
      <AnimalRow
        key={a.id}
        animal={a}
        isExpanded={expandedRowId === a.id}
        onToggleExpand={onToggleExpand}
        viewMode="CALVING"
      />
    ));
  }, [animals, expandedRowId, onToggleExpand]);

  // --- MAIN RENDER ---
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
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Control de Partos y Reproducción
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            VACAS PREÑADAS Y MADRES EN PRODUCCIÓN
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            onClick={() => {
              setFilterPregnant(!filterPregnant);
              setPage(1);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              background: filterPregnant
                ? 'rgba(255, 152, 0, 0.15)'
                : 'rgba(255, 255, 255, 0.05)',
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: filterPregnant ? '#FF9800' : 'transparent',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '20px',
                background: filterPregnant ? '#FF9800' : '#333',
                borderRadius: '10px',
                position: 'relative',
                transition: 'background 0.3s',
              }}
            >
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  background: 'white',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '2px',
                  left: filterPregnant ? '22px' : '2px',
                  transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
            <span
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: filterPregnant ? '#FF9800' : 'var(--text-muted)',
              }}
            >
              Solo Preñadas
            </span>
          </div>
          <button
            className="btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#FF9800',
              borderColor: 'rgba(255,152,0,0.3)',
            }}
            onClick={() => fileInputRef.current?.click()}
            title="Importar Excel Cargadas y Sincronizadas"
          >
            <span className="mobile-only"><FileSpreadsheet size={18} /></span>
            <span className="desktop-only">Importar Cargadas</span>
            <input
              type="file"
              accept=".xlsx, .xls"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleImportCargadas}
            />
          </button>
          <button
            className="btn-secondary"
            style={{ color: '#4CAF50' }}
            onClick={handleExportExcel}
          >
            <span className="mobile-only"><Download size={18} /></span> <span className="desktop-only">Exportar Reporte</span></button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Buscar Identificador..."
            className="input-field"
            style={{ width: '280px', marginBottom: 0, paddingLeft: '40px' }}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
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
            Cargando registros de reproducción...
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
                  <th style={{ padding: '16px', width: '40px' }}></th>
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
                    Clasificación
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Sexo
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Lote
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Total Partos
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: 'var(--text-muted)',
                      fontWeight: '500',
                    }}
                  >
                    Último Parto
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: '#FF9800',
                      fontWeight: '500',
                    }}
                  >
                    Preñez
                  </th>
                  <th
                    style={{
                      padding: '16px',
                      color: '#10B981',
                      fontWeight: '500',
                    }}
                  >
                    Aprox. Parto
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
                      No se encontraron registros que coincidan con los
                      criterios.
                    </td>
                  </tr>
                ) : (
                  animals.map((a) => (
                    <AnimalRow
                      key={a.id}
                      animal={a}
                      isExpanded={expandedRowId === a.id}
                      onToggleExpand={onToggleExpand}
                      viewMode="CALVING"
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && totalRecords > 0 && (
          <div
            style={{
              padding: '16px',
              borderTop: '1px solid var(--panel-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Página {page} de {totalPages} ({totalRecords} vacas)
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
