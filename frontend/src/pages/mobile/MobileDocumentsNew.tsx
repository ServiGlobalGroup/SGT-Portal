import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  Stack,
  Menu,
  MenuItem,
  Card,
  CardContent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  Receipt,
  RestaurantMenu,
  Info,
  Visibility,
  CloudDownload,
  FilePresent,
} from '@mui/icons-material';
import { PdfPreview } from '../../components/PdfPreview';
import { MobileDocumentCard } from '../../components/mobile/MobileDocumentCard';
import { MobileLayout } from '../../components/mobile/MobileLayout';
import { MobileTabs } from '../../components/mobile/MobileTabs';
import { MobileSearchBar } from '../../components/mobile/MobileSearchBar';

// Interfaces
interface UserDocument {
  id: number;
  name: string;
  size: number;
  type: string;
  created_date: string;
  modified_date?: string;
  download_url: string;
}

interface UserDocuments {
  nominas: UserDocument[];
  dietas: UserDocument[];
  documentos: UserDocument[];
  circulacion: UserDocument[];
  permisos: UserDocument[];
  vacaciones: UserDocument[];
}

type FolderType = 'nominas' | 'dietas' | 'documentos';

export const MobileDocuments: React.FC = () => {
  const [userDocuments, setUserDocuments] = useState<UserDocuments>({
    nominas: [],
    dietas: [],
    documentos: [],
    circulacion: [],
    permisos: [],
    vacaciones: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<FolderType>('nominas');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados para preview y menú
  const [pdfPreview, setPdfPreview] = useState({
    open: false, fileUrl: '', fileName: ''
  });
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);

  const corporateColor = '#501b36';

  // Obtener documentos de la carpeta actual
  const currentDocuments = userDocuments[currentFolder] || [];
  
  // Filtrar documentos por búsqueda
  const filteredDocuments = currentDocuments.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Configurar paginación usando hook simple
  const itemsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredDocuments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedDocuments = filteredDocuments.slice(startIndex, startIndex + itemsPerPage);

  // Reset página cuando cambia el filtro o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [currentFolder, searchTerm]);

  // Cargar documentos al montar
  useEffect(() => {
    loadUserDocuments();
  }, []);

  const loadUserDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simular datos para desarrollo
      const mockData = {
        nominas: [
          {
            id: 1,
            name: 'Nómina Enero 2024.pdf',
            size: 1234567,
            type: '.pdf',
            created_date: '2024-01-15',
            download_url: '/api/files/nomina1.pdf'
          },
          {
            id: 2,
            name: 'Nómina Febrero 2024.pdf',
            size: 1234567,
            type: '.pdf',
            created_date: '2024-02-15',
            download_url: '/api/files/nomina2.pdf'
          }
        ],
        dietas: [
          {
            id: 3,
            name: 'Dietas Enero 2024.pdf',
            size: 567890,
            type: '.pdf',
            created_date: '2024-01-20',
            download_url: '/api/files/dieta1.pdf'
          }
        ],
        documentos: [
          {
            id: 4,
            name: 'Manual del Conductor.pdf',
            size: 2345678,
            type: '.pdf',
            created_date: '2024-01-01',
            download_url: '/api/files/manual.pdf'
          }
        ],
        circulacion: [],
        permisos: [],
        vacaciones: []
      };
      setUserDocuments(mockData);
    } catch (err: any) {
      setError('Error al cargar los documentos');
    } finally {
      setLoading(false);
    }
  };

  // Configuración de pestañas
  const tabOptions = [
    {
      id: 'nominas',
      label: 'Nóminas',
      count: userDocuments.nominas.length,
      icon: <Receipt sx={{ fontSize: 18 }} />,
    },
    {
      id: 'dietas',
      label: 'Dietas',
      count: userDocuments.dietas.length,
      icon: <RestaurantMenu sx={{ fontSize: 18 }} />,
    },
    {
      id: 'documentos',
      label: 'Información',
      count: userDocuments.documentos.length,
      icon: <Info sx={{ fontSize: 18 }} />,
    },
  ];

  // Funciones de manejo
  const getFolderDisplayName = (folder: FolderType) => {
    const names = {
      nominas: 'Nóminas',
      dietas: 'Dietas',
      documentos: 'Información'
    };
    return names[folder] || folder;
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, document: UserDocument) => {
    setMenuAnchor(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDocument(null);
  };

  const handleView = (document: UserDocument) => {
    setPdfPreview({
      open: true,
      fileUrl: document.download_url,
      fileName: document.name
    });
    handleMenuClose();
  };

  const handleDownload = async (document: UserDocument) => {
    try {
      window.open(document.download_url, '_blank');
    } catch (error) {
      setError('Error al descargar el documento');
    }
    handleMenuClose();
  };

  // Componente de estado vacío
  const EmptyState = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: alpha(corporateColor, 0.1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3,
        }}
      >
        <FilePresent sx={{ fontSize: 40, color: corporateColor }} />
      </Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          color: 'text.secondary',
          mb: 1,
          textAlign: 'center',
        }}
      >
        No hay documentos
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: 'text.secondary',
          textAlign: 'center',
          maxWidth: 300,
          lineHeight: 1.5,
        }}
      >
        {searchTerm
          ? `No se encontraron documentos que coincidan con "${searchTerm}"`
          : `No hay documentos disponibles en ${getFolderDisplayName(currentFolder).toLowerCase()}`
        }
      </Typography>
    </Box>
  );

  if (loading) {
    return (
      <MobileLayout
        title="Mis Documentos"
        subtitle="Cargando..."
        corporateColor={corporateColor}
      >
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography>Cargando documentos...</Typography>
        </Box>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout
      title="Mis Documentos"
      subtitle="Gestiona tus documentos de forma organizada"
      corporateColor={corporateColor}
    >
      {/* Búsqueda */}
      <Box 
        sx={{ 
          mb: 3,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 1, sm: 2 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: '500px' }}>
          <MobileSearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar en documentos..."
            corporateColor={corporateColor}
          />
        </Box>
      </Box>

      {/* Pestañas */}
      <MobileTabs
        options={tabOptions}
        activeTab={currentFolder}
        onChange={(tabId) => setCurrentFolder(tabId as FolderType)}
        corporateColor={corporateColor}
        variant="pills"
      />

      {/* Estadísticas rápidas */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          px: { xs: 1, sm: 2 },
          mt: 2,
          mb: 3,
        }}
      >
        <Card
          sx={{
            width: '100%',
            maxWidth: '500px',
            background: `linear-gradient(135deg, ${corporateColor} 0%, ${alpha(corporateColor, 0.8)} 100%)`,
            color: 'white',
          }}
        >
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {filteredDocuments.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {filteredDocuments.length === 1 ? 'documento' : 'documentos'} disponibles
                </Typography>
              </Box>
              <Box
                sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {tabOptions.find(tab => tab.id === currentFolder)?.icon}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* Contenido principal */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {filteredDocuments.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Lista de documentos */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              px: { xs: 1, sm: 2 },
              mb: 3,
            }}
          >
            <Box sx={{ width: '100%', maxWidth: '600px' }}>
              <Stack spacing={2}>
                {paginatedDocuments.map((document) => (
                  <MobileDocumentCard
                    key={document.id}
                    document={document}
                    onMenuClick={handleMenuClick}
                    onView={handleView}
                    onDownload={handleDownload}
                    corporateColor={corporateColor}
                  />
                ))}
              </Stack>
            </Box>
          </Box>

          {/* Paginación simple */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 3 }}>
              <Typography variant="body2" sx={{ alignSelf: 'center', color: 'text.secondary' }}>
                Página {currentPage} de {totalPages}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Menú contextual */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            mt: 1,
            borderRadius: 2,
            minWidth: 180,
            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          },
        }}
      >
        <MenuItem onClick={() => selectedDocument && handleView(selectedDocument)}>
          <Visibility sx={{ mr: 2, fontSize: 20, color: '#2196f3' }} />
          Ver documento
        </MenuItem>
        <MenuItem onClick={() => selectedDocument && handleDownload(selectedDocument)}>
          <CloudDownload sx={{ mr: 2, fontSize: 20, color: '#4caf50' }} />
          Descargar
        </MenuItem>
      </Menu>

      {/* Preview de PDF */}
      <PdfPreview
        open={pdfPreview.open}
        onClose={() => setPdfPreview({ open: false, fileUrl: '', fileName: '' })}
        fileUrl={pdfPreview.fileUrl}
        fileName={pdfPreview.fileName}
      />
    </MobileLayout>
  );
};
