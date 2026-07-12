import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export default function SystemDatePicker({ value, onChange, name, className, required, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  
  // viewDate indica el mes/año que el calendario está renderizando
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      // Parseamos manualmente para evitar problemas de timezone del navegador
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    }
    return new Date();
  });
  
  const containerRef = useRef(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDayClick = (day) => {
    const year = viewDate.getFullYear();
    const month = String(viewDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const selected = `${year}-${month}-${dayStr}`; // Formato exacto YYYY-MM-DD
    
    // Emitir evento que emula el comportamiento de un input nativo
    if (onChange) {
      onChange({ target: { name, value: selected } });
    }
    setIsOpen(false);
  };

  const nextMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };
  
  const prevMonth = (e) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    // Espacios en blanco para alinear el primer día
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} style={{ width: '32px', height: '32px' }} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      const isToday = () => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
      };

      days.push(
        <button
          key={day}
          type="button"
          onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '6px',
            border: 'none',
            fontSize: '12px',
            cursor: 'pointer',
            backgroundColor: isSelected ? 'var(--accent-color)' : 'transparent',
            color: isSelected ? 'white' : (isToday() ? 'var(--accent-color)' : 'var(--text-main)'),
            fontWeight: isSelected || isToday() ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSelected) e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.target.style.backgroundColor = 'transparent';
          }}
        >
          {day}
        </button>
      );
    }
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    return (
      <div 
        className="premium-card"
        style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          left: 0,
          zIndex: 9999,
          padding: '16px',
          width: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#0F172A', // Fondo oscuro sólido (slate-900) para evitar transparencias
          border: '1px solid rgba(255, 255, 255, 0.1)', // Borde sutil
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)', // Sombra más fuerte
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()} // Evitar que clic en calendario cierre el modal
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>
            {monthNames[month]} {year}
          </span>
          <button type="button" onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer', padding: '4px' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => (
            <div key={d} style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 'bold', padding: '4px 0' }}>
              {d}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  // Convertimos YYYY-MM-DD a DD/MM/YYYY solo para mostrar en la interfaz visual
  const displayValue = value ? value.split('-').reverse().join('/') : '';

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        className={className}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '10px 14px', 
          background: 'var(--bg-color)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          color: 'var(--text-main)',
          fontSize: '13px',
          opacity: disabled ? 0.6 : 1
        }}
      >
        <span style={{ color: displayValue ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '13px' }}>
          {displayValue || 'dd/mm/aaaa'}
        </span>
        <CalendarIcon size={16} style={{ color: 'var(--text-muted)' }} />
      </div>
      
      {isOpen && renderCalendar()}
      
      {/* Input oculto para que el comportamiento nativo de required en HTML siga funcionando */}
      {required && (
        <input 
          type="text" 
          name={name} 
          value={value || ''} 
          required={required} 
          onChange={() => {}}
          style={{ opacity: 0, position: 'absolute', height: 0, width: 0, pointerEvents: 'none' }}
        />
      )}
    </div>
  );
}
