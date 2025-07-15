import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Traffic } from './pages/Traffic';
import { Vacations } from './pages/Vacations';
import { Documents } from './pages/Documents';
import { Orders } from './pages/Orders';
import { Users } from './pages/Users';
import { Gestor } from './pages/Gestor';
import { Profile } from './pages/Profile';
import Login from './pages/Login';
import { useAuth } from './hooks/useAuth';
import theme from './theme/theme';

// Componente para rutas protegidas
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Sin pantalla de carga, será manejado en el login
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Componente para la ruta de login
const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // Sin pantalla de carga, será manejado en el login
  }

  return isAuthenticated ? <Navigate to="/" replace /> : <Login />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Box sx={{ 
          width: '100%', 
          minHeight: '100vh', 
          margin: 0, 
          padding: 0, 
          maxWidth: '100vw', 
          overflow: 'hidden' 
        }}>
          <Router>
            <Routes>
              {/* Ruta de login */}
              <Route path="/login" element={<LoginRoute />} />
              
              {/* Rutas protegidas */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/traffic" element={<Traffic />} />
                      <Route path="/vacations" element={<Vacations />} />
                      <Route path="/documents" element={<Documents />} />
                      <Route path="/orders" element={<Orders />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/gestor" element={<Gestor />} />
                      <Route path="/profile" element={<Profile />} />
                      {/* Ruta por defecto */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
