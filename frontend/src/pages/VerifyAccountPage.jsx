import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle } from 'lucide-react';

export default function VerifyAccountPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');
  
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token de verificación no proporcionado.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await axios.post('/auth/verify-account', { token });
        setStatus('success');
        setMessage(res.data.message || 'Cuenta verificada correctamente.');
      } catch (error) {
        setStatus('error');
        if (error.response?.data?.message) {
          setMessage(error.response.data.message);
        } else {
          setMessage('Error al verificar la cuenta. Es posible que el enlace haya expirado.');
        }
      }
    };

    verifyToken();
  }, [token]);

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
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src="/logo.png" alt="Logo Finca HML" width="80" height="80" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', borderRadius: '50%' }} />
        </div>

        <h2 style={{ marginBottom: '16px', fontSize: '1.8rem', fontWeight: '700' }}>
          Verificación de Cuenta
        </h2>

        {status === 'loading' && (
          <div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Verificando tu cuenta, por favor espera...
            </p>
            <div className="spinner" style={{ margin: '0 auto', width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s infinite linear' }}></div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {status === 'success' && (
          <div className="fade-in">
            <CheckCircle size={64} color="var(--success-color, #4caf50)" style={{ margin: '0 auto 16px' }} />
            <div style={{ background: 'rgba(76, 175, 80, 0.1)', color: 'var(--success-color, #4caf50)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '15px', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
              {message}
            </div>
            <button
              onClick={() => navigate('/')}
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              Ir a Iniciar Sesión
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="fade-in">
            <XCircle size={64} color="var(--danger-color, #f44336)" style={{ margin: '0 auto 16px' }} />
            <div style={{ background: 'rgba(244, 67, 54, 0.1)', color: 'var(--danger-color)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '15px', border: '1px solid rgba(244, 67, 54, 0.2)' }}>
              {message}
            </div>
            <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'block', marginTop: '16px' }}>
              Volver al inicio
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
