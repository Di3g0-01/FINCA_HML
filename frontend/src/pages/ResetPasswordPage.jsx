import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    
    if (password !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }
    
    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    if (!token) {
      setErrorMsg('Token de seguridad faltante. Solicita un nuevo enlace.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/auth/reset-password', { token, password });
      setMessage(res.data.message || 'Contraseña restablecida correctamente.');
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Error al restablecer la contraseña. Es posible que el enlace haya expirado.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="auth-container"
      style={{
        display: 'flex',
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'var(--bg-color, #0d1117)',
      }}
    >
      <div
        className="premium-card fade-in"
        style={{
          padding: '40px',
          width: '100%',
          maxWidth: '400px',
          borderRadius: '24px',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="Logo Finca HM" width="80" height="80" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', borderRadius: '50%' }} />
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.8rem', fontWeight: '700' }}>
          Restablecer Contraseña
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.9rem' }}>
          Ingresa tu nueva contraseña
        </p>

        {errorMsg && (
          <div style={{ background: 'rgba(244, 67, 54, 0.1)', color: 'var(--danger-color)', padding: '12px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontSize: '14px', border: '1px solid rgba(244, 67, 54, 0.2)' }}>
            {errorMsg}
          </div>
        )}

        {message && (
          <div style={{ background: 'rgba(76, 175, 80, 0.1)', color: 'var(--success-color, #4caf50)', padding: '12px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontSize: '14px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
              Nueva Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
              Confirmar Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                className="input-field"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                  background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
                }}
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            disabled={loading || !!message}
          >
            {loading ? 'Guardando...' : 'Guardar Nueva Contraseña'}
          </button>
        </form>

        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.9rem' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
