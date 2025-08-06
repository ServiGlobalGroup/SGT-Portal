import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import { MassUpload } from './pages/MassUpload';
import { Traffic } from './pages/Traffic';
import { Vacations } from './pages/Vacations';
import { Documents } from './pages/Documents';
import { Orders } from './pages/Orders';
import { Users } from './pages/Users';
import DocumentationPanel from './pages/DocumentationPanel';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import Login from './pages/Login';
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
                    <Route path="/vacations" element={
                      <ProtectedRoute>
                        <Vacations />
                      </ProtectedRoute>
                    } />
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
          </Router>
        </Box>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
