import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setLoading(true);
    try {
      const res = await axios.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Correo enviado con éxito.');
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Error al enviar el correo. Intenta de nuevo.');
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
          <img src="/logo.png" alt="Logo Finca HML" width="80" height="80" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', borderRadius: '50%' }} />
        </div>

        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.8rem', fontWeight: '700' }}>
          Recuperar Contraseña
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.9rem' }}>
          Ingresa tu correo para recibir un enlace
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
          <div style={{ marginBottom: '32px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              className="input-field"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}
            disabled={loading}
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
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
