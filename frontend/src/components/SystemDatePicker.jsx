import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function SystemDatePicker({
  value,
  onChange,
  name,
  className,
  required,
  disabled,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});

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
  const calendarRef = useRef(null);

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(e.target);
      const isOutsideCalendar = calendarRef.current && !calendarRef.current.contains(e.target);
      
      if (isOutsideContainer && isOutsideCalendar) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sincronizar viewDate si cambia la prop value
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          setViewDate(new Date(y, m, 1));
        }
      }
    }
  }, [value]);

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

  const handleMonthChange = (e) => {
    e.stopPropagation();
    const newMonth = parseInt(e.target.value, 10);
    const newYear = viewDate.getFullYear();
    const currentDay = value ? parseInt(value.split('-')[2], 10) : 1;
    const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const validDay = Math.min(currentDay || 1, daysInNewMonth);

    const newDate = new Date(newYear, newMonth, validDay);
    setViewDate(newDate);

    const monthStr = String(newMonth + 1).padStart(2, '0');
    const dayStr = String(validDay).padStart(2, '0');
    const selected = `${newYear}-${monthStr}-${dayStr}`;

    if (onChange) {
      onChange({ target: { name, value: selected } });
    }
  };

  const handleYearChange = (e) => {
    e.stopPropagation();
    const newYear = parseInt(e.target.value, 10);
    const newMonth = viewDate.getMonth();
    const currentDay = value ? parseInt(value.split('-')[2], 10) : 1;
    const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const validDay = Math.min(currentDay || 1, daysInNewMonth);

    const newDate = new Date(newYear, newMonth, validDay);
    setViewDate(newDate);

    const monthStr = String(newMonth + 1).padStart(2, '0');
    const dayStr = String(validDay).padStart(2, '0');
    const selected = `${newYear}-${monthStr}-${dayStr}`;

    if (onChange) {
      onChange({ target: { name, value: selected } });
    }
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
      days.push(
        <div key={`empty-${i}`} style={{ width: '32px', height: '32px' }} />,
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected =
        value ===
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const isToday = () => {
        const today = new Date();
        return (
          today.getDate() === day &&
          today.getMonth() === month &&
          today.getFullYear() === year
        );
      };

      days.push(
        <button
          key={day}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDayClick(day);
          }}
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
            color: isSelected
              ? 'white'
              : isToday()
                ? 'var(--accent-color)'
                : 'var(--text-main)',
            fontWeight: isSelected || isToday() ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSelected)
              e.target.style.backgroundColor = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            if (!isSelected) e.target.style.backgroundColor = 'transparent';
          }}
        >
          {day}
        </button>,
      );
    }

    const monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const currentYear = new Date().getFullYear();
    const startYear = 1970;
    const endYear = currentYear + 10;
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }

    return createPortal(
      <div
        ref={calendarRef}
        style={{
          position: 'absolute',
          top: dropdownStyle.top,
          left: dropdownStyle.left,
          zIndex: 999999, // increased z-index just in case
          padding: '16px',
          width: '270px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#0F172A', // Fondo oscuro sólido (slate-900) para evitar transparencias
          border: '1px solid rgba(255, 255, 255, 0.1)', // Borde sutil
          borderRadius: '12px', // added since premium-card had radius
          boxShadow: '0 10px 30px rgba(0,0,0,0.8)', // Sombra más fuerte
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()} // Evitar que clic en calendario cierre el modal
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={prevMonth}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select
              value={month}
              onChange={handleMonthChange}
              style={{
                backgroundColor: '#1E293B',
                color: 'var(--text-main)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '3px 6px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {monthNames.map((mName, idx) => (
                <option key={idx} value={idx} style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={handleYearChange}
              style={{
                backgroundColor: '#1E293B',
                color: 'var(--text-main)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '3px 6px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {years.map((y) => (
                <option key={y} value={y} style={{ backgroundColor: '#0F172A', color: '#FFFFFF' }}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '4px',
          }}
        >
          {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((d) => (
            <div
              key={d}
              style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                textAlign: 'center',
                fontWeight: 'bold',
                padding: '4px 0',
              }}
            >
              {d}
            </div>
          ))}
          {days}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            style={{
              backgroundColor: 'var(--accent-color)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => (e.target.style.opacity = '0.9')}
            onMouseLeave={(e) => (e.target.style.opacity = '1')}
          >
            Listo
          </button>
        </div>
      </div>,
      document.body
    );
  };

  // Convertimos YYYY-MM-DD a DD/MM/YYYY solo para mostrar en la interfaz visual
  const displayValue = value ? value.split('-').reverse().join('/') : '';

  const toggleOpen = (e) => {
    if (disabled) return;
    if (!isOpen) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownStyle({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div
        className={className}
        onClick={toggleOpen}
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
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            color: displayValue ? 'var(--text-main)' : 'var(--text-muted)',
            fontSize: '13px',
          }}
        >
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
          style={{
            opacity: 0,
            position: 'absolute',
            height: 0,
            width: 0,
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
}
