import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import logoImg from '../assets/logo.png';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      if (username && password) {
        const res = await axios.post('http://localhost:3001/auth/login', { username, password });
        localStorage.setItem('token', res.data.access_token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        // Setup initial default header just in case before reload
        axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`;
        navigate('/dashboard');
      }
    } catch (error) {
      setErrorMsg('Credenciales inválidas o servidor inactivo.');
    }
  };

  return (
    <div className="auth-container" style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', background: '#05070a' }}>
      <div className="premium-card fade-in" style={{ padding: '40px', width: '100%', maxWidth: '400px', borderRadius: '24px', position: 'relative' }}>
        
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <img src={logoImg} alt="Logo Finca HML" style={{ width: '80px', height: '80px', objectFit: 'contain', background: '#fff', borderRadius: '50%' }} />
        </div>
        
        <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.8rem', fontWeight: '700' }}>
          Finca HML
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.9rem' }}>
          CONTROL DE INVENTARIO GANADERO
        </p>

        {errorMsg && (
          <div style={{ background: 'rgba(244, 67, 54, 0.1)', color: 'var(--danger-color)', padding: '12px', borderRadius: '12px', marginBottom: '24px', textAlign: 'center', fontSize: '14px', border: '1px solid rgba(244, 67, 54, 0.2)' }}>
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Usuario</label>
            <input
              type="text"
              className="input-field"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div style={{ marginBottom: '32px' }}>
            <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? "text" : "password"}
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
            <LogIn size={20} />
            Ingresar al Sistema
          </button>
        </form>
        
        <div style={{ marginTop: '32px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Tip: Pass: AdministradorHML
        </div>
      </div>
    </div>
  );
}
