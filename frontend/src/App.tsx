import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box } from '@mui/material';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Traffic } from './pages/Traffic';
import { Vacations } from './pages/Vacations';
import { Documents } from './pages/Documents';
import { Orders } from './pages/Orders';
import { Users } from './pages/Users';
import { Gestor } from './pages/Gestor';
import { Profile } from './pages/Profile';
// import Settings from './pages/Settings';
import theme from './theme/theme';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ width: '100%', minHeight: '100vh', margin: 0, padding: 0, maxWidth: '100vw', overflow: 'hidden' }}>
        <Router>
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
              {/* <Route path="/settings" element={<Settings />} /> */}
            </Routes>
          </Layout>
        </Router>
      </Box>
    </ThemeProvider>
  );
}

export default App;
