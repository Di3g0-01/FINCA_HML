import { CustomAlert } from '../utils/alerts';
import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import AnimalRow from './AnimalRow';

export default function CalvingControlView() {
  const [animals, setAnimals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [filterPregnant, setFilterPregnant] = useState(false);

  const fetchAnimals = useCallback(async () => {
    try {
      setIsLoading(true);
      const query = `?page=${page}&limit=50&status=ACTIVO&isControlPartos=true&isPregnant=${filterPregnant}&_t=${new Date().getTime()}${searchTerm ? `&search=${searchTerm}` : ''}`;
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
      console.error('Error fetching calving control animals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, searchTerm, filterPregnant]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAnimals();
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [page, searchTerm, filterPregnant, fetchAnimals]);

  const handleExportExcel = useCallback(async () => {
    try {
      const res = await axios.get(`http://localhost:3001/animals?status=ACTIVO&isControlPartos=true&limit=5000&isPregnant=${filterPregnant}`);
      const data = res.data.data || res.data;
      const exportData = data.map(a => ({
        'N.VACA': a.identifier,
        'PREÑEZ': a.is_pregnant ? `SÍ (${a.pregnancy_months} m)` : 'NO',
        'TOTAL PARTOS': a.total_calvings || 0,
        'ÚLTIMO PARTO': a.last_calving_date ? a.last_calving_date.split('T')[0].split('-').reverse().join('/') : 'N/A',
        'PENÚLTIMO PARTO': a.second_last_calving_date ? a.second_last_calving_date.split('T')[0].split('-').reverse().join('/') : 'N/A',
        'LOTE': a.lote,
        'FECHA NACIMIENTO': a.birth_date ? a.birth_date.split('T')[0].split('-').reverse().join('/') : 'N/A',
        'OBSERVACIONES': a.observations || ''
      }));
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Control_Partos");
      XLSX.writeFile(wb, "Control_Partos_FincaHM.xlsx");
    } catch (err) {
      CustomAlert.info("Aviso", "Error al exportar Excel");
    }
  }, []);

  const onToggleExpand = useCallback((id) => {
    setExpandedRowId(id);
  }, []);

  const renderedRows = useMemo(() => {
    return animals.map(a => (
      <AnimalRow
        key={a.id}
        animal={a}
        isExpanded={expandedRowId === a.id}
        onToggleExpand={onToggleExpand}
        viewMode="CALVING"
      />
    ));
  }, [animals, expandedRowId, onToggleExpand]);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Control de Partos y Reproducción</h1>
          <p style={{ color: 'var(--text-muted)' }}>VACAS PREÑADAS Y MADRES EN PRODUCCIÓN</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div 
            onClick={() => { setFilterPregnant(!filterPregnant); setPage(1); }}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
              background: filterPregnant ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              padding: '8px 16px', borderRadius: '20px', border: '1px solid',
              borderColor: filterPregnant ? '#FF9800' : 'transparent',
              transition: 'all 0.3s ease'
            }}
          >
            <div style={{ 
              width: '40px', height: '20px', background: filterPregnant ? '#FF9800' : '#333',
              borderRadius: '10px', position: 'relative', transition: 'background 0.3s'
            }}>
              <div style={{ 
                width: '16px', height: '16px', background: 'white', borderRadius: '50%',
                position: 'absolute', top: '2px', left: filterPregnant ? '22px' : '2px',
                transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }} />
            </div>
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: filterPregnant ? '#FF9800' : 'var(--text-muted)' }}>Solo Preñadas</span>
          </div>
          <button className="btn-secondary" style={{ color: '#4CAF50' }} onClick={handleExportExcel}><Download size={18} /> Exportar Reporte</button>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
          <input type="text" placeholder="Buscar Identificador..." className="input-field" style={{ width: '280px', marginBottom: 0, paddingLeft: '40px' }} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="premium-card">
        {isLoading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando registros de reproducción...</div>
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
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Total Partos</th>
                  <th style={{ padding: '16px', color: 'var(--text-muted)', fontWeight: '500' }}>Último Parto</th>
                  <th style={{ padding: '16px', color: '#FF9800', fontWeight: '500' }}>Preñez</th>
                  <th style={{ padding: '16px', color: '#10B981', fontWeight: '500' }}>Aprox. Parto</th>
                </tr>
              </thead>
              <tbody>
                {animals.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No se encontraron registros que coincidan con los criterios.</td>
                  </tr>
                ) : (
                  animals.map(a => (
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
          <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Página {page} de {totalPages} ({totalRecords} vacas)</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setPage(page - 1)} disabled={page === 1} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>Anterior</button>
              <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '14px' }}>Siguiente</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
