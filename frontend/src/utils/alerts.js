import Swal from 'sweetalert2';

// Base styling options for the Finca HML dark premium theme
const baseConfig = {
  background: '#1a1a1a',
  color: '#ffffff',
  confirmButtonColor: '#4CAF50',
  cancelButtonColor: '#F44336',
  customClass: {
    popup: 'premium-card',
    confirmButton: 'btn-primary',
    cancelButton: 'btn-secondary',
    title: 'swal-title',
    htmlContainer: 'swal-text'
  }
};

export const CustomAlert = {
  success: (title, text = '') => {
    return Swal.fire({
      ...baseConfig,
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Aceptar'
    });
  },
  
  error: (title, text = '') => {
    return Swal.fire({
      ...baseConfig,
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Entendido'
    });
  },

  warning: (title, text = '') => {
    return Swal.fire({
      ...baseConfig,
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Aceptar'
    });
  },

  confirm: (title, text = '') => {
    return Swal.fire({
      ...baseConfig,
      icon: 'warning',
      title,
      text,
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    });
  },
  
  info: (title, text = '') => {
    return Swal.fire({
      ...baseConfig,
      icon: 'info',
      title,
      text,
      confirmButtonText: 'Aceptar'
    });
  }
};
