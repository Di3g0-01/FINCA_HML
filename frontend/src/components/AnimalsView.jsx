import { CustomAlert } from '../utils/alerts';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, Search, Download, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import AnimalFormModal from './AnimalFormModal';
import AnimalRow from './AnimalRow';
import CustomSelect from './CustomSelect';

export default function AnimalsView() {
  const [animals, setAnimals] = useState([]);
  const [allCows, setAllCows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [animalToEdit, setAnimalToEdit] = useState(null);
  const [actionDialog, setActionDialog] = useState({ isOpen: false, mode: null });
  const [actionSearch, setActionSearch] = useState('');
  const [actionError, setActionError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, identifier: null });
  const [resetConfirm, setResetConfirm] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterStatus, setFilterStatus] = useState('ACTIVO');

  const fileInputRef = useRef(null);

  const fetchAnimals = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = `?page=${page}&limit=50&status=${filterStatus}${searchTerm ? `&search=${searchTerm}` : ''}`;
      const res = await axios.get(`http://localhost:3001/animals${query}`);

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
      console.error('Error fetching animals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, filterStatus]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAnimals();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm, filterStatus, fetchAnimals]);

  useEffect(() => {
    axios.get('http://localhost:3001/animals?status=ACTIVO&limit=5000').then(res => {
      const data = res.data.data || res.data;
      setAllCows(data.filter(a => a.type === 'VACA'));
    }).catch(() => {});
  }, [animals]);

  const handleDelete = useCallback((id, identifier) => {
    if (!id) return;
    setDeleteConfirm({ isOpen: true, id, identifier });
  }, []);

  const executeDelete = async () => {
    const { id, identifier } = deleteConfirm;
    setDeleteConfirm({ isOpen: false, id: null, identifier: null });
    if (!id) return;
    try {
      await axios.delete(`http://localhost:3001/animals/${id}`);
      await fetchAnimals();
    } catch (error) {
      console.error('Error al eliminar:', error);
      CustomAlert.info("Aviso", 'Error: No se pudo eliminar el registro en la base de datos.');
    }
  };

  const openForm = useCallback((animal = null) => {
    setAnimalToEdit(animal);
    setIsModalOpen(true);
  }, []);

  const handleActionSearch = useCallback(async () => {
    setActionError('');
    try {
      if (!actionSearch || actionSearch.trim() === '') {
        setActionError("Por favor, ingresa un identificador para poder buscar.");
        return;
      }
      const res = await axios.get(`http://localhost:3001/animals?limit=5000`);
      const data = res.data.data || res.data;
      const found = data.find(a => a.identifier.trim().toLowerCase() === actionSearch.trim().toLowerCase());
      
      if (!found) {
        setActionError(`No se encontró ningún animal con el Identificador exacto: "${actionSearch}".`);
        return;
      }

      const mode = actionDialog.mode;
      
      if (mode === 'EDIT') {
        setActionDialog({ isOpen: false, mode: null });
        setActionSearch('');
        openForm(found);
      } else if (mode === 'DELETE') {
        setActionDialog({ isOpen: false, mode: null });
        setActionSearch('');
        // This opens the confirmation custom modal now, safely triggering it instantly.
        handleDelete(found.id, found.identifier);
      }
    } catch (e) {
      console.error(e);
      setActionError("Error buscando el animal en la base de datos.");
    }
  }, [actionSearch, actionDialog.mode, openForm, handleDelete]);

  const calculateGains_Internal = (a) => {
    let g4m = null, gmD = null, gMens = null;
    if (a.weight_4m && a.birth_weight) g4m = ((a.weight_4m - a.birth_weight) / 120).toFixed(2);
    if (a.weaning_weight && a.birth_weight) gmD = ((a.weaning_weight - a.birth_weight) / 210).toFixed(2);
    if (a.current_weight && a.birth_weight && a.birth_date) {
      const daysAlive = Math.max(1, (new Date() - new Date(a.birth_date)) / (1000 * 60 * 60 * 24));
      const monthsAlive = daysAlive / 30.44;
      gMens = ((a.current_weight - a.birth_weight) / monthsAlive).toFixed(2);
    }
    return { g4m, gmD, gMens };
  };

  const handleExportExcel = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:3001/animals?status=${filterStatus}&limit=5000`);
      const data = res.data.data || res.data;
      const exportData = data.map(a => {
        return {
          'L1': a.lote || 'GENERAL',
          'ANIMA': a.identifier,
          'SEXO': a.sex || '',
          'COLOR': a.color || '',
          'CLASIFICACIO': a.type || 'VACA',
          'No. Part': a.total_calvings || 0,
          'No. MAD': a.mother?.identifier || '',
          'FECHA DE NACIMIENTO': a.birth_date ? a.birth_date.split('T')[0].split('-').reverse().join('/') : '',
          'PENULTIMO PARTO': a.second_last_calving_date ? a.second_last_calving_date.split('T')[0].split('-').reverse().join('/') : '',
          'ULTIMO PARTO': a.last_calving_date ? a.last_calving_date.split('T')[0].split('-').reverse().join('/') : '',
          'CARGADA MESE': a.is_pregnant ? a.pregnancy_months || 0 : '',
          'OBSERVACIONES': a.observations || a.nickname || '',
          'FECHA DE COMPR': a.purchase_date ? a.purchase_date.split('T')[0].split('-').reverse().join('/') : '',
          'FECHA DE VENTA': a.sale_date ? a.sale_date.split('T')[0].split('-').reverse().join('/') : '',
          'FECHA DE MUERT': a.death_date ? a.death_date.split('T')[0].split('-').reverse().join('/') : '',
          'GRADO': a.grado || '',
          'PESO AL NACER': a.birth_weight || ''
        };
      });

      const headers = [
        'L1', 'ANIMA', 'SEXO', 'COLOR', 'CLASIFICACIO', 'No. Part', 'No. MAD',
        'FECHA DE NACIMIENTO', 'PENULTIMO PARTO', 'ULTIMO PARTO', 'CARGADA MESE',
        'OBSERVACIONES', 'FECHA DE COMPR', 'FECHA DE VENTA', 'FECHA DE MUERT',
        'GRADO', 'PESO AL NACER'
      ];

      const ws = exportData.length > 0 
        ? XLSX.utils.json_to_sheet(exportData) 
        : XLSX.utils.json_to_sheet([], { header: headers });
        
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");
      XLSX.writeFile(wb, "Inventario_Activo.xlsx");
    } catch (err) {
      CustomAlert.info("Aviso", "Error al exportar Excel");
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:3001/animals?status=${filterStatus}&limit=5000`);
      const data = res.data.data || res.data;
      const doc = new jsPDF('landscape', 'pt', 'a4');
      doc.text("Inventario Activo Básico - Finca HM", 14, 25);
      
      const tableColumn = [
        "L1", "ANIMA", "SEXO", "COLOR", "CLASIFICACIO", "No. Part", "No. MAD", "FECHA DE NACIMIENTO", "PENULTIMO PARTO", "ULTIMO PARTO", "CARGADA MESE"
      ];
      
      const tableRows = data.map(a => [
        a.lote || 'GENERAL',
        a.identifier,
        a.sex || '',
        a.color || '',
        a.type || 'VACA',
        a.total_calvings || 0,
        a.mother?.identifier || '',
        a.birth_date ? a.birth_date.split('T')[0].split('-').reverse().join('/') : '',
        a.second_last_calving_date ? a.second_last_calving_date.split('T')[0].split('-').reverse().join('/') : '',
        a.last_calving_date ? a.last_calving_date.split('T')[0].split('-').reverse().join('/') : '',
        a.is_pregnant ? `${a.pregnancy_months} m` : 'No'
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [33, 150, 243] }
      });
      doc.save("Inventario_Activo.pdf");
    } catch (err) {
      console.error(err);
      CustomAlert.info("Aviso", "Error al exportar PDF");
    }
  }, []);

  const handleImportExcel = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Dynamically find the header row index
        const sheetArray = XLSX.utils.sheet_to_json(ws, { header: 1 });
        let headerRowIndex = 0;
        
        for (let i = 0; i < sheetArray.length; i++) {
          const rowCells = sheetArray[i];
          if (!rowCells || rowCells.length === 0) continue;
          
          // Check if this row contains identifier-like keywords
          const hasIdentifier = rowCells.some(cell => {
            const val = String(cell || '').trim().toUpperCase();
            return ['ANIMA', 'ANIMAL', 'IDENTIFICADOR', 'ID', 'CHAPA', 'N.VACA', 'N. VACA', 'NOVACA', 'N VACA'].some(k => val.includes(k));
          });
          
          // Or count how many target headers it matches
          let matchCount = 0;
          const targetKeywords = ['LOTE', 'L1', 'SEXO', 'COLOR', 'CLASIF', 'TIPO', 'PARTO', 'PART', 'MADRE', 'MAD', 'NACIMIENTO', 'OBSERV'];
          rowCells.forEach(cell => {
            const val = String(cell || '').trim().toUpperCase();
            if (targetKeywords.some(k => val.includes(k))) matchCount++;
          });
          
          if (hasIdentifier || matchCount >= 3) {
            headerRowIndex = i;
            break;
          }
        }
        
        const data = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

        if (!data || data.length === 0) {
          CustomAlert.info("Aviso", "El archivo Excel parece estar vacío o no tiene el formato correcto.");
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        setIsLoading(true);
        let successCount = 0, failCount = 0;
        let errors = [];
        const idMap = new Map();
        const pendingRelations = [];

        const existingMap = new Map();
        try {
          const dbDataRes = await axios.get('http://localhost:3001/animals?limit=10000');
          const animalsList = dbDataRes.data.data || dbDataRes.data;
          if (Array.isArray(animalsList)) {
             animalsList.forEach(a => existingMap.set(String(a.identifier).trim().toLowerCase(), a.id));
          }
        } catch (e) {
          console.error("Error pre-fetching animals for import:", e);
        }

        const getVal = (row, keys) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') return row[key];
          }
          return null;
        };

        const parseP = (val) => {
          if (!val) return null;
          return parseFloat(String(val).replace(/[^0-9\.\,]/g, '').replace(',', '.')) || null;
        };

        const parseDate = (val) => {
          if (!val) return null;
          let year, month, day;
          if (typeof val === 'number') {
            if (val < 4000) { year = val; month = 0; day = 1; }
            else {
              const excelEpoch = new Date(Date.UTC(1899, 11, 30)); 
              const d = new Date(excelEpoch.getTime() + Math.round(val * 86400000));
              year = d.getUTCFullYear(); month = d.getUTCMonth(); day = d.getUTCDate();
            }
          } else {
            const strVal = String(val).trim();
            if (strVal.match(/^\d{4}-\d{2}-\d{2}/)) {
                return strVal.substring(0, 10);
            }
            const sVal = strVal.split('T')[0].split(' ')[0]; // Remove timestamp if any
            const parts = sVal.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
            if (parts) {
              year = parseInt(parts[3]);
              if (year < 100) year += 2000;
              let p1 = parseInt(parts[1]);
              let p2 = parseInt(parts[2]);
              if (p2 > 12) { month = p1 - 1; day = p2; }
              else if (p1 > 12) { month = p2 - 1; day = p1; }
              else { month = p2 - 1; day = p1; } // Assume DD/MM by default
            } else {
              const partsYYYYMMDD = sVal.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
              if (partsYYYYMMDD) {
                  year = parseInt(partsYYYYMMDD[1]);
                  month = parseInt(partsYYYYMMDD[2]) - 1;
                  day = parseInt(partsYYYYMMDD[3]);
              } else {
                const d = new Date(strVal);
                if (!isNaN(d.getTime())) {
                  if (strVal.includes('Z') || strVal.includes('+')) {
                      year = d.getUTCFullYear(); month = d.getUTCMonth(); day = d.getUTCDate();
                  } else {
                      year = d.getFullYear(); month = d.getMonth(); day = d.getDate();
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
          await new Promise(r => setTimeout(r, 40)); 
          const row = {};
          Object.keys(rawRow).forEach(k => {
            // Limpieza más robusta para nombres de columnas
            const cleanKey = k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/gi, '').toUpperCase();
            row[cleanKey] = rawRow[k];
          });

          try {
            // Mapeo extendido para ser más tolerante a diferentes formatos de Excel
            const identifier = String(getVal(row, [
              'ANIMA', 'ANIM', 'ANIMAL', 'NVACA', 'NOVACA', 'NVACAANIMAL', 'NOVACAANIMAL', 'IDENTIFICADOR', 'ID', 'IDENTIFICACIN', 'CHAPA', 'NUMERO', 'NO'
            ]) || '').trim();
            
            if (!identifier || ['ANIMAL', 'IDENTIFICADOR', 'CHAPA', 'ID', 'N. VACA', 'N.VACA', 'NO.', 'IDENTIFICACIN', 'ANIMA'].includes(identifier.toUpperCase())) {
              console.log("Fila saltada (sin identificador o encabezado):", identifier);
              continue;
            }

            const rType = String(getVal(row, ['CLASIFICACIO', 'CLASIFICACION', 'CLASIFICACIN', 'TIPO', 'TIPOANIMAL', 'CATEGORIA', 'CATEGORA', 'CLAVE', 'RAZA']) || 'VACA').toUpperCase();
            let normalizedType = 'VACA';
            if (rType.includes('TORO')) normalizedType = 'TORO';
            else if (rType.includes('TORETE')) normalizedType = 'TORETE';
            else if (rType.includes('NOVILLA')) normalizedType = 'NOVILLA';
            else if (rType.includes('CHIVA')) normalizedType = 'CHIVA';
            else if (rType.includes('CHIVO')) normalizedType = 'CHIVO';
            else if (rType.includes('CABALLO')) normalizedType = 'CABALLO';

            let sex = String(getVal(row, ['SEXO']) || '').toUpperCase();
            if (!sex) sex = (normalizedType === 'TORO' || normalizedType === 'CHIVO') ? 'M' : 'H';
            else sex = sex.startsWith('M') ? 'M' : 'H';

            const loteVal = String(getVal(row, ['L1', 'LOTE', 'L']) || 'GENERAL').toUpperCase().substring(0, 95);

            const payload = {
              identifier, type: normalizedType, sex,
              lote: loteVal,
              color: getVal(row, ['COLOR']),
              nickname: getVal(row, ['APODO', 'NOMBRE']),
              origin: 'NACIMIENTO', status: 'ACTIVO',
              observations: getVal(row, ['OBSERVACIONES']),
              grado: parseP(getVal(row, ['GRADO'])),
              birth_weight: parseP(getVal(row, ['PESOALNACER'])),
              current_weight: parseP(getVal(row, ['PESOACTUAL', 'PESO'])),
              birth_date: parseDate(getVal(row, ['FECHADENACIMIENTO', 'NACIMIENTO', 'FECHA', 'FECNAC', 'FECHAND'])),
              last_calving_date: parseDate(getVal(row, ['ULTIMOPARTO', 'ULTIMO', 'FECHAUP', 'FECHAULTIMOPARTO'])),
              second_last_calving_date: parseDate(getVal(row, ['PENULTIMOPARTO', 'FECHAPP', 'PENULTIMOP']))
            };

            const rp = getVal(row, ['PARTOS', 'TOTALPARTOS', 'NOPARTOS', 'NODEPARTOS', 'NUMERODEPARTOS', 'NPARTOS', 'NOPART']);
            payload.total_calvings = parseInt(rp) || 0;

            const pregMonths = parseP(getVal(row, ['CARGADAMESE', 'CARGADAMESES', 'CARGAMESES', 'MESESCARDADA', 'PREG_MONTHS', 'MESES']));
            if (pregMonths !== null && pregMonths > 0) {
              payload.is_pregnant = true;
              payload.pregnancy_months = pregMonths;
            } else {
              payload.is_pregnant = false;
              payload.pregnancy_months = null;
            }

            const purchaseDate = parseDate(getVal(row, ['FECHADECOMPR', 'FECHADECOMPRA', 'COMPRA', 'FECHACOMPRA']));
            if (purchaseDate) {
              payload.purchase_date = purchaseDate;
              payload.origin = 'COMPRA';
            }

            const saleDate = parseDate(getVal(row, ['FECHADEVENTA', 'FECHAVENTA', 'VENTA']));
            if (saleDate) {
              payload.sale_date = saleDate;
              payload.status = 'VENDIDO';
            }

            const deathDate = parseDate(getVal(row, ['FECHADEMUERT', 'FECHADEMUERTE', 'MUERTE']));
            if (deathDate) {
              payload.death_date = deathDate;
              payload.status = 'MUERTO';
            }

            const cleanId = identifier.toLowerCase();
            let response;
            if (existingMap.has(cleanId)) {
               response = await axios.patch(`http://localhost:3001/animals/${existingMap.get(cleanId)}`, payload);
            } else {
               response = await axios.post('http://localhost:3001/animals', payload);
               existingMap.set(cleanId, response.data.id);
            }

            successCount++;
            idMap.set(identifier, response.data.id);
            
            const rawMother = String(getVal(row, ['NOMAD', 'NOMADRE', 'MADRE', 'IDMADRE', 'NODEMADRE', 'NOMADRE', 'NMADRE', 'NUMERODEMADRE']) || '').trim();
            if (rawMother && !['-', '0', 'N/A', 'NONE', 'NULL'].includes(rawMother.toUpperCase())) {
              pendingRelations.push({ childId: response.data.id, motherStr: rawMother });
            }
          } catch (err) {
            failCount++;
            errors.push(`${getVal(rawRow, ['NVACA', 'ANIMAL']) || 'Fila'}: ${err.message}`);
          }
        }

        if (pendingRelations.length > 0) {
          try {
            const dbDataRes = await axios.get('http://localhost:3001/animals?limit=5000');
            const animalsList = dbDataRes.data.data || dbDataRes.data;
            animalsList.forEach(a => { if (!idMap.has(a.identifier)) idMap.set(a.identifier, a.id); });

            for (const rel of pendingRelations) {
              let motherId = idMap.get(rel.motherStr);
              if (!motherId) {
                try {
                   const mRes = await axios.post('http://localhost:3001/animals', { identifier: rel.motherStr, type: 'VACA', sex: 'H', status: 'MUERTO', origin: 'NACIMIENTO', observations: 'Referencia historica (Madre muerta)' });
                   motherId = mRes.data.id;
                   idMap.set(rel.motherStr, motherId);
                } catch(e) {}
              }
              if (motherId) await axios.patch(`http://localhost:3001/animals/${rel.childId}`, { mother_id: motherId }).catch(() => {});
            }
          } catch (relErr) { console.error(relErr); }
        }

        if (successCount === 0 && failCount === 0) {
          CustomAlert.info("Aviso", "No se importó ningún animal. Verifica que los nombres de las columnas en tu Excel coincidan con lo esperado (ej: 'N. Vaca', 'Clasificación', 'Lote').");
        } else if (failCount > 0) {
          CustomAlert.info("Aviso", `Importación finalizada: ${successCount} exitosos, ${failCount} fallidos.`);
        } else {
          CustomAlert.info("Aviso", `¡Éxito! ${successCount} animales importados correctamente.`);
        }
        
        setPage(1); 
        fetchAnimals();
      } catch (err) { CustomAlert.info("Aviso", `Error al procesar el archivo: ${err.message}`); }
      finally { setIsLoading(false); }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [fetchAnimals]);

  const handleResetDatabase = useCallback(async () => {
    setResetConfirm(false);
    try {
      setIsLoading(true);
      await axios.delete('http://localhost:3001/animals');
      CustomAlert.info("Aviso", "Base de datos de animales limpiada exitosamente.");
      fetchAnimals();
    } catch (error) {
      console.error(error);
      CustomAlert.info("Aviso", "Error crítico al intentar limpiar la base de datos.");
    } finally {
      setIsLoading(false);
    }
  }, [fetchAnimals]);

  const onToggleExpand = useCallback((id) => {
    setExpandedRowId(id);
  }, []);

  const renderedRows = useMemo(() => {
    const renderAnimalRow = (animal, relationshipLabel = null) => (
      <AnimalRow
        key={animal.id + (relationshipLabel || '')}
        animal={animal}
        isExpanded={expandedRowId === animal.id}
        onToggleExpand={onToggleExpand}
        onEdit={openForm}
        onDelete={handleDelete}
        relationshipLabel={relationshipLabel}
      />
    );

    if (!searchTerm) return animals.map(a => renderAnimalRow(a));

    const renderedIds = new Set();
    const resultRows = [];
    const query = searchTerm.toLowerCase().trim();

    // 1. Buscar el animal exacto solicitado
    const exactMatches = animals.filter(a => (a.identifier || '').toLowerCase().trim() === query);

    exactMatches.forEach(targetAnimal => {
      if (!renderedIds.has(targetAnimal.id)) {
        resultRows.push(renderAnimalRow(targetAnimal));
        renderedIds.add(targetAnimal.id);
      }

      // Si el animal encontrado tiene hijos en la lista, los ponemos DEBAJO etiquetados como HIJO
      const children = animals.filter(c => c.mother_id === targetAnimal.id);
      children.forEach(child => {
        if (!renderedIds.has(child.id)) {
          resultRows.push(renderAnimalRow(child, 'HIJO'));
          renderedIds.add(child.id);
        }
      });

      // Si el animal encontrado tiene una madre en la lista, la ponemos (si no fue renderizada ya)
      if (targetAnimal.mother && !renderedIds.has(targetAnimal.mother.id)) {
        resultRows.push(renderAnimalRow(targetAnimal.mother, 'MADRE'));
        renderedIds.add(targetAnimal.mother.id);
      }
    });

    // 2. Por si el animal exacto no está activo pero sus hijos sí
    if (exactMatches.length === 0) {
      const orphanChildren = animals.filter(c => c.mother && (c.mother.identifier || '').toLowerCase().trim() === query);
      orphanChildren.forEach(child => {
        if (!renderedIds.has(child.id)) {
          resultRows.push(renderAnimalRow(child, 'HIJO'));
          renderedIds.add(child.id);
        }
      });
    }

    return resultRows;
  }, [animals, searchTerm, expandedRowId, onToggleExpand, openForm, handleDelete]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Inventario General</h1>
          <p style={{ color: 'var(--text-muted)' }}>HISTORIAL COMPLETO DE ANIMALES</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImportExcel} accept=".xlsx, .xls" />
          <button className="btn-secondary" onClick={() => fileInputRef.current.click()}><Upload size={18} /> Importar Datos</button>
          <button className="btn-secondary" style={{ color: '#E1BEE7' }} onClick={() => setResetConfirm(true)}><Trash2 size={18} /> Reiniciar BD</button>
          <button className="btn-secondary" style={{ color: '#4CAF50' }} onClick={handleExportExcel}><Download size={18} /> Excel</button>
          <button className="btn-secondary" style={{ color: '#F44336' }} onClick={handleExportPDF}><Download size={18} /> PDF</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar Identificador..." className="input-field" style={{ width: '280px', marginBottom: 0, paddingLeft: '40px' }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', zIndex: 50 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estado:</span>
          <div style={{ width: '160px' }}>
            <CustomSelect 
              value={filterStatus} 
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              options={[
                { label: 'Todos', value: 'TODOS' },
                { label: 'Activos', value: 'ACTIVO' },
                { label: 'Vendidos', value: 'VENDIDO' },
                { label: 'Bajas/Muertos', value: 'MUERTO' }
              ]}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto' }}>
          <button className="btn-secondary" style={{ color: '#2196F3' }} onClick={() => setActionDialog({ isOpen: true, mode: 'EDIT' })}><Edit size={20} /> Editar</button>
          <button className="btn-secondary" style={{ color: '#F44336' }} onClick={() => setActionDialog({ isOpen: true, mode: 'DELETE' })}><Trash2 size={20} /> Eliminar</button>
          <button className="btn-primary" onClick={() => openForm(null)}><Plus size={20} /> Ingresar Nacimiento</button>
        </div>
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Procesando registros...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--panel-border)' }}>
                  <th style={{ padding: '16px', width: '40px' }}></th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Identificador</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Clasificación</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Sexo</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Lote</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Partos</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Nacimiento</th>
                  <th style={{ padding: '16px', color: '#10b981', fontWeight: '500' }}>Peso Actual</th>
                </tr>
              </thead>
              <tbody>{renderedRows}</tbody>
            </table>
          </div>
        )}

        {!isLoading && totalRecords > 0 && (
          <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Página {page} de {totalPages} ({totalRecords} animales)</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>Anterior</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {actionDialog.isOpen && (
        <div className="modal-overlay fade-in">
          <div className="premium-card modal-content" style={{ maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: actionDialog.mode === 'DELETE' ? '#ef4444' : '#10b981' }}>{actionDialog.mode === 'EDIT' ? 'Editar Registro' : 'Eliminar Registro'}</h2>
            <div className="form-group">
              <input type="text" className="input-field" placeholder="Identificador (ej: 1/26)" value={actionSearch} onChange={(e) => { setActionSearch(e.target.value); setActionError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleActionSearch()} autoFocus />
              {actionError && <span style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', display: 'block' }}>{actionError}</span>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '24px' }}>
              <button style={{ background: 'transparent', color: 'white', border: 'none' }} onClick={() => { setActionDialog({ isOpen: false, mode: null }); setActionError(''); }}>Cancelar</button>
              <button className="btn-primary" style={{ background: actionDialog.mode === 'DELETE' ? '#ef4444' : '#10b981' }} onClick={handleActionSearch}>Buscar y {actionDialog.mode === 'EDIT' ? 'Editar' : 'Eliminar'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm.isOpen && (
        <div className="modal-overlay fade-in">
          <div className="premium-card modal-content" style={{ maxWidth: '400px', borderTop: '4px solid #ef4444' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#ef4444' }}>¿Eliminar permanentemente?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Estás a punto de eliminar permanentemente al animal identificador: <strong style={{ color: 'white' }}>{deleteConfirm.identifier}</strong> del sistema. Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
              <button className="btn-secondary" onClick={() => setDeleteConfirm({ isOpen: false, id: null, identifier: null })}>Cancelar</button>
              <button className="btn-primary" style={{ background: '#ef4444' }} onClick={executeDelete}>Sí, Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {resetConfirm && (
        <div className="modal-overlay fade-in">
          <div className="premium-card modal-content" style={{ maxWidth: '400px', borderTop: '4px solid #f97316' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '8px', color: '#f97316' }}>¡Advertencia de Seguridad!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>Esta acción eliminará <strong style={{color: 'white'}}>TODOS</strong> los animales del inventario. Esta operación es irreversible y se registrará en la bitácora.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginTop: '32px' }}>
              <button className="btn-secondary" onClick={() => setResetConfirm(false)}>Cancelar</button>
              <button className="btn-primary" style={{ background: '#f97316' }} onClick={handleResetDatabase}>Confirmar Borrado Total</button>
            </div>
          </div>
        </div>
      )}

      <AnimalFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSaved={fetchAnimals} animalToEdit={animalToEdit} cows={allCows} />
    </div>
  );
}
