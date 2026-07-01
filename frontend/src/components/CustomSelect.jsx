import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './CustomSelect.css';

export default function CustomSelect({ options, value, onChange, placeholder = 'Seleccionar...', className = '', disabled = false, required = false, name }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(opt => opt.value === value || opt.value === String(value));

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange({ target: { name, value: optionValue } });
    setIsOpen(false);
  };

  return (
    <div className={`custom-select-container ${className} ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        tabIndex={disabled ? -1 : 0}
      >
        <span className="custom-select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`custom-select-icon ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && !disabled && (
        <div className="custom-select-dropdown">
          {options.map((opt, index) => (
            opt.isGroup ? (
              <div key={`group-${index}`} className="custom-select-group-label">
                {opt.label}
              </div>
            ) : (
              <div 
                key={opt.value} 
                className={`custom-select-option ${value === opt.value ? 'selected' : ''}`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            )
          ))}
        </div>
      )}
      {/* Hidden input to support native form validation if required */}
      <input type="hidden" name={name} value={value || ''} required={required} />
    </div>
  );
}
