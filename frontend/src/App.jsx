import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import axios from 'axios';

// Initialize React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Configurar URL base dinámica para Producción o Local
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001';
// Permitir envío de cookies (HttpOnly) en todas las peticiones
axios.defaults.withCredentials = true;

// Configurar Interceptor Global de Axios
axios.interceptors.request.use((config) => {
  // Reescribir URLs hardcodeadas para usar la baseURL
  if (config.url && config.url.startsWith('http://localhost:3001')) {
    config.url = config.url.replace('http://localhost:3001', axios.defaults.baseURL);
  } else if (config.url && config.url.startsWith('http://127.0.0.1:3001')) {
    config.url = config.url.replace('http://127.0.0.1:3001', axios.defaults.baseURL);
  }
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const ProtectedRoute = () => {
  // Verificamos si existe el usuario en localStorage. La verdadera seguridad está en la cookie HttpOnly en el backend.
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/*" element={<DashboardLayout />} />
          </Route>
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
