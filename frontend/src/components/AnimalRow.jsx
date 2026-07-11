import { Fragment, memo } from 'react';
import { ChevronDown, ChevronRight, Tag, Edit, Trash2 } from 'lucide-react';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const dStr = dateStr.split('T')[0];
  const parts = dStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const AnimalRow = memo(({ 
  animal, 
  isExpanded, 
  onToggleExpand, 
  onEdit,
  onDelete,
  relationshipLabel = null,
  viewMode = 'GENERAL'
}) => {
  const isChild = relationshipLabel === 'HIJO';
  const isMother = relationshipLabel === 'MADRE';

  return (
    <Fragment>
      <tr 
        onClick={() => onToggleExpand(isExpanded ? null : animal.id)}
        style={{ 
          borderBottom: '1px solid rgba(255,255,255,0.05)', 
          background: isChild ? 'rgba(33, 150, 243, 0.05)' : (isMother ? 'rgba(255, 152, 0, 0.05)' : (isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent')), 
          cursor: 'pointer', 
          transition: 'background 0.2s' 
        }}
      >
        <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </td>
        <td style={{ padding: '16px', paddingLeft: isChild ? '32px' : '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
            {isChild && <span style={{ color: '#2196F3', fontSize: '10px', background: 'rgba(33,150,243,0.1)', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>HIJO</span>}
            {isMother && <span style={{ color: '#FF9800', fontSize: '10px', background: 'rgba(255,152,0,0.1)', padding: '2px 6px', borderRadius: '4px', marginRight: '4px' }}>MADRE</span>}
            {animal.identifier}
            {!isChild && !isMother && animal.origin === 'COMPRA' && <Tag size={14} color="#2196F3" title="Animal de Compra Externa" />}
          </div>
        </td>
        <td style={{ padding: '16px' }}>
          <span style={{ padding: '4px 12px', background: 'rgba(76, 175, 80, 0.1)', color: 'var(--primary-color)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
            {animal.type}
          </span>
        </td>
        <td style={{ padding: '16px', fontWeight: 'bold' }}>{animal.sex || '-'}</td>
        <td style={{ padding: '16px', color: (isChild || isMother) ? 'rgba(255,255,255,0.2)' : 'var(--text-muted)' }}>{(isChild || isMother) ? '-' : animal.lote}</td>
        <td style={{ padding: '16px', fontWeight: 'bold', color: animal.total_calvings > 0 ? '#FF9800' : 'var(--text-muted)' }}>
          {['VACA', 'NOVILLA', 'CHIVA', 'DESMADRE_HEMBRA'].includes(animal.type) ? animal.total_calvings || 0 : '-'}
        </td>
        <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
          {viewMode === 'CALVING' 
            ? (animal.last_calving_date ? formatDate(animal.last_calving_date) : 'N/A')
            : (animal.birth_date ? formatDate(animal.birth_date) : '-')}
        </td>
        {viewMode === 'CALVING' ? (
          <>
            <td style={{ padding: '16px', color: animal.is_pregnant ? '#FF9800' : 'var(--text-muted)', fontWeight: 'bold' }}>
              {animal.is_pregnant ? `Sí (${animal.pregnancy_months} m)` : 'No'}
            </td>
            <td style={{ padding: '16px', color: animal.is_pregnant ? '#10B981' : 'var(--text-muted)', fontWeight: 'bold' }}>
              {animal.is_pregnant ? (() => {
                 const monthsLeft = 9 - (animal.pregnancy_months || 0);
                 const daysLeft = Math.round(monthsLeft * 30.44);
                 const d = new Date(); d.setDate(d.getDate() + daysLeft);
                 return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
              })() : '-'}
            </td>
          </>
        ) : (
          <td style={{ padding: '16px', color: '#2196F3', fontWeight: 'bold', fontSize: '1.1rem' }}>{animal.current_weight ? animal.current_weight + ' lbs' : '-'}</td>
        )}
      </tr>
      
      {isExpanded && (
        <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
          <td colSpan="8" style={{ padding: 0 }}>
            <div style={{ padding: '24px', borderBottom: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                
                {/* Módulo Genealogía y Físico */}
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '8px' }}>
                  <h4 style={{ color: 'var(--text-muted)', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Genética y Origen</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>No. Madre:</span> <span style={{ color: 'var(--primary-color)' }}>{animal.mother?.identifier || 'N/A'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Grado (Genética):</span> <span style={{ fontWeight: 'bold' }}>{animal.grado || 'N/A'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Color o Capa:</span> <span>{animal.color || 'N/A'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Apodo / Opcional:</span> <span style={{ fontStyle: 'italic' }}>{animal.nickname || 'N/A'}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Fecha de Compra:</span> <span>{animal.purchase_date ? formatDate(animal.purchase_date) : 'N/A (Nacimiento Local)'}</span></div>
                  </div>
                </div>



                {/* Módulo de Partos (Si es Vaca) u Observaciones */}
                <div style={{ background: 'rgba(255, 152, 0, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255, 152, 0, 0.1)' }}>
                  <h4 style={{ color: '#FF9800', marginBottom: '16px', borderBottom: '1px solid rgba(255, 152, 0, 0.2)', paddingBottom: '8px' }}>Historial Ginecológico y Médico</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {['VACA', 'NOVILLA', 'CHIVA', 'DESMADRE_HEMBRA'].includes(animal.type) ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Preñez Actual:</span> <span style={{ fontWeight: 'bold', color: animal.is_pregnant ? '#FF9800' : 'var(--text-muted)' }}>{animal.is_pregnant ? `Sí (${animal.pregnancy_months} m)` : 'No'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Cantidad de Partos:</span> <span>{animal.total_calvings || 0}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Último Parto:</span> <span>{animal.last_calving_date ? formatDate(animal.last_calving_date) : 'N/A'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Penúltimo Parto:</span> <span>{animal.second_last_calving_date ? formatDate(animal.second_last_calving_date) : 'N/A'}</span></div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '8px' }}>El módulo ginecológico solo aplica biológicamente a las hembras.</div>
                    )}
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Observaciones Médicas Generales:</span>
                      <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '4px', fontSize: '13px', lineHeight: '1.4' }}>
                        {animal.observations || 'Sin observaciones registradas...'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Módulo de Acciones Rápidas o Predicción */}
                {viewMode === 'CALVING' ? (
                   <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
                    <h4 style={{ color: '#10b981', marginBottom: '12px', textTransform: 'uppercase', fontSize: '0.75rem' }}>Predicción de Nacimiento</h4>
                    {animal.is_pregnant ? (
                      <>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>
                          {(() => {
                            const monthsLeft = 9 - (animal.pregnancy_months || 0);
                            const daysLeft = Math.round(monthsLeft * 30.44); // 30.44 days per average month
                            const d = new Date();
                            d.setDate(d.getDate() + daysLeft);
                            const start = new Date(d); start.setDate(d.getDate() - 15);
                            const end = new Date(d); end.setDate(d.getDate() + 15);
                            return `${start.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
                          })()}
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Rango estimado basado en {animal.pregnancy_months} meses de gestación</span>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No hay gestación activa para predecir.</div>
                    )}
                   </div>
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
                    <h4 style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Acciones de Gestión</h4>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onEdit(animal); }}
                      className="btn-secondary" style={{ width: '100%', justifyContent: 'center', color: '#2196F3', background: 'rgba(33, 150, 243, 0.1)' }}>
                      <Edit size={16} /> Editar Datos
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDelete(animal.id, animal.identifier); }}
                      className="btn-secondary" style={{ width: '100%', justifyContent: 'center', color: 'var(--danger-color)', background: 'rgba(239, 68, 68, 0.1)' }}>
                      <Trash2 size={16} /> Eliminar Registro
                    </button>
                  </div>
                )}

              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
});

AnimalRow.displayName = 'AnimalRow';

export default AnimalRow;
