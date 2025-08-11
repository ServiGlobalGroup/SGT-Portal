import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
// Lazy load de páginas para dividir el bundle por ruta
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MassUpload = lazy(() => import('./pages/MassUpload').then(m => ({ default: m.MassUpload })));
const Traffic = lazy(() => import('./pages/Traffic').then(m => ({ default: m.Traffic })));
// Página de vacaciones temporalmente oculta
// const Vacations = lazy(() => import('./pages/Vacations').then(m => ({ default: m.Vacations })));
const Documents = lazy(() => import('./pages/Documents').then(m => ({ default: m.Documents })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const Users = lazy(() => import('./pages/Users'));
const DocumentationPanel = lazy(() => import('./pages/DocumentationPanel'));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login'));
import { useAuth } from './hooks/useAuth';
import theme from './theme/theme';

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
            <Suspense fallback={null}>
            <Routes>
              {/* Ruta de login */}
              <Route path="/login" element={<LoginRoute />} />
              
              {/* Rutas protegidas */}
              <Route path="/*" element={
                <Layout>
                  <Routes>
                    <Route path="/" element={
                      <ProtectedRoute>
                        <Documents />
                      </ProtectedRoute>
                    } />
                    <Route path="/dashboard" element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } />
                    <Route path="/mass-upload" element={
                      <ProtectedRoute>
                        <MassUpload />
                      </ProtectedRoute>
                    } />
                    <Route path="/traffic" element={
                      <ProtectedRoute>
                        <Traffic />
                      </ProtectedRoute>
                    } />
                    {/* Página de vacaciones temporalmente oculta */}
                    {/* <Route path="/vacations" element={
                      <ProtectedRoute>
                        <Vacations />
                      </ProtectedRoute>
                    } /> */}
                    <Route path="/documents" element={
                      <ProtectedRoute>
                        <Documents />
                      </ProtectedRoute>
                    } />
                    <Route path="/orders" element={
                      <ProtectedRoute>
                        <Orders />
                      </ProtectedRoute>
                    } />
                    <Route path="/users" element={
                      <ProtectedRoute>
                        <Users />
                      </ProtectedRoute>
                    } />
                    <Route path="/gestor" element={
                      <ProtectedRoute>
                        <DocumentationPanel />
                      </ProtectedRoute>
                    } />
                    <Route path="/profile" element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    } />
                    <Route path="/settings" element={
                      <ProtectedRoute>
                        <Settings />
                      </ProtectedRoute>
                    } />
                    {/* Ruta por defecto */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              } />
            </Routes>
            </Suspense>
          </Router>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
