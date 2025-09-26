import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Alert,
  Chip,
  Fade,
  Collapse,
  Button,
  Paper,
  Divider,
  LinearProgress,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  CheckCircle,
  Error,
  PhotoCamera,
  Close,
  ArrowForward,
  ArrowBack,
  Save,
  LocalShipping,
} from '@mui/icons-material';
import { ModernModal, ModernButton } from './ModernModal';
import { 
  InspectionStep, 
  InspectionComponentType, 
  TruckInspectionCreate,
  ManualInspectionRequest
} from '../types/truck-inspection';
import { truckInspectionService } from '../services/truckInspectionService';

interface TruckInspectionModalProps {
  open: boolean;
  onClose: () => void;
  onInspectionCompleted: () => void;
  manualRequests?: ManualInspectionRequest[];
}

const INSPECTION_STEPS = [
  {
    id: InspectionComponentType.TIRES,
    title: 'Neumáticos',
    icon: '🚙',
    description: 'Revisa el estado de los neumáticos: presión, desgaste, cortes o bultos',
    stepNumber: 2
  },
  {
    id: InspectionComponentType.BRAKES,
    title: 'Frenos',
    icon: '🛑',
    description: 'Verifica el sistema de frenos: pastillas, discos, líquido de frenos',
    stepNumber: 3
  },
  {
    id: InspectionComponentType.LIGHTS,
    title: 'Luces',
    icon: '💡',
    description: 'Comprueba todas las luces: faros, intermitentes, luces de freno',
    stepNumber: 4
  },
  {
    id: InspectionComponentType.FLUIDS,
    title: 'Fluidos',
    icon: '🛢️',
    description: 'Revisa niveles de aceite, refrigerante, limpiaparabrisas, líquido de frenos e hidráulico',
    stepNumber: 5
  },
  {
    id: InspectionComponentType.DOCUMENTATION,
    title: 'Documentación',
    icon: '📋',
    description: 'Verifica la documentación: ITV, seguro, permisos de circulación y documentación requerida',
    stepNumber: 6
  },
  {
    id: InspectionComponentType.BODY,
    title: 'Carrocería',
    icon: '🚛',
    description: 'Inspecciona la carrocería: golpes, rayones, estado de puertas y carga',
    stepNumber: 7
  }
] as const;

export const TruckInspectionModal: React.FC<TruckInspectionModalProps> = ({
  open,
  onClose,
  onInspectionCompleted,
  manualRequests = [],
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [truckLicensePlate, setTruckLicensePlate] = useState('');
  const [inspectionSteps, setInspectionSteps] = useState<InspectionStep[]>(
    INSPECTION_STEPS.map(step => ({ ...step, status: undefined, notes: undefined, imageFile: undefined }))
  );
  const [generalNotes, setGeneralNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const hasManualRequests = manualRequests.length > 0;

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navigationSteps = useMemo(() => {
    const steps = [
      {
        key: 'vehicle-info',
        title: 'Información del Vehículo',
        description: 'Introduce la matrícula y datos generales del camión.',
      },
      ...INSPECTION_STEPS.map((step) => ({
        key: step.id,
        title: step.title,
        description: step.description,
      })),
      {
        key: 'summary',
        title: 'Resumen y Finalización',
        description: 'Revisa los puntos antes de enviar la inspección.',
      },
    ];

    return steps.map((step, index) => {
      const isActive = success ? index === steps.length - 1 : currentStep === index;
      const isCompleted = success ? true : currentStep > index;
      return {
        ...step,
        number: index + 1,
        isActive,
        isCompleted,
      };
    });
  }, [currentStep, success]);

  const totalFlowSteps = navigationSteps.length;
  const activeFlowIndex = success
    ? Math.max(0, totalFlowSteps - 1)
    : Math.min(currentStep, Math.max(0, totalFlowSteps - 1));
  const displayStepNumber = success
    ? totalFlowSteps
    : Math.min(activeFlowIndex + 1, totalFlowSteps);
  const progressValue = totalFlowSteps > 1
    ? (activeFlowIndex / (totalFlowSteps - 1)) * 100
    : 100;
  const currentNavigationStep = navigationSteps[Math.min(activeFlowIndex, totalFlowSteps - 1)] ?? navigationSteps[navigationSteps.length - 1];
  const mobileStepSubtitle = success
    ? 'Tu inspección se ha guardado correctamente.'
    : currentNavigationStep?.description || '';

  const handleStepStatusChange = useCallback((stepIndex: number, status: boolean) => {
    setInspectionSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, status } : step
    ));
    setError(null);
  }, []);

  const handleStepNotesChange = useCallback((stepIndex: number, notes: string) => {
    setInspectionSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, notes } : step
    ));
  }, []);

  const handleImageUpload = useCallback((stepIndex: number, file: File) => {
    setInspectionSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, imageFile: file } : step
    ));
  }, []);

  const removeImage = useCallback((stepIndex: number) => {
    setInspectionSteps(prev => prev.map((step, index) => 
      index === stepIndex ? { ...step, imageFile: undefined } : step
    ));
  }, []);

  const canProceedToNext = useCallback(() => {
    if (currentStep === 0) {
      return truckLicensePlate.trim().length >= 3;
    }
    
    const currentStepData = inspectionSteps[currentStep - 1];
    return currentStepData?.status !== undefined;
  }, [currentStep, truckLicensePlate, inspectionSteps]);

  const handleNext = () => {
    if (canProceedToNext()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!truckLicensePlate.trim()) {
        throw new window.Error('Debes introducir la matrícula del camión');
      }

      const hasIncompleteSteps = inspectionSteps.some(step => step.status === undefined);
      if (hasIncompleteSteps) {
        throw new window.Error('Debes completar todos los pasos de la inspección');
      }

      const inspectionData: TruckInspectionCreate = {
        truck_license_plate: truckLicensePlate.trim().toUpperCase(),
        tires_status: inspectionSteps[0].status!,
        tires_notes: inspectionSteps[0].notes,
        brakes_status: inspectionSteps[1].status!,
        brakes_notes: inspectionSteps[1].notes,
        lights_status: inspectionSteps[2].status!,
        lights_notes: inspectionSteps[2].notes,
        fluids_status: inspectionSteps[3].status!,
        fluids_notes: inspectionSteps[3].notes,
        documentation_status: inspectionSteps[4].status!,
        documentation_notes: inspectionSteps[4].notes,
        body_status: inspectionSteps[5].status!,
        body_notes: inspectionSteps[5].notes,
        general_notes: generalNotes || undefined,
      };

      const createdInspection = await truckInspectionService.createInspection(inspectionData);

      const imagesToUpload = inspectionSteps
        .map((step) => ({ step }))
        .filter(({ step }) => step.imageFile)
        .map(({ step }) => ({
          component: step.id,
          file: step.imageFile!
        }));

      if (imagesToUpload.length > 0) {
        await truckInspectionService.uploadMultipleImages(createdInspection.id, imagesToUpload);
      }

      setSuccess(true);
      
      setTimeout(() => {
        onInspectionCompleted();
        handleModalClose();
      }, 2000);

    } catch (err: any) {
      setError(err?.message || 'Error al crear la inspección');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    if (loading) return;
    
    setCurrentStep(0);
    setTruckLicensePlate('');
    setInspectionSteps(INSPECTION_STEPS.map(step => ({ 
      ...step, 
      status: undefined, 
      notes: undefined, 
      imageFile: undefined 
    })));
    setGeneralNotes('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const renderStepsSidebar = () => {
    if (isMobile) {
      return null;
    }

    return (
      <Box
        sx={{
          width: 280,
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #e9ecef',
          p: 3,
          height: '100%',
          overflowY: 'auto'
        }}
      >
        {/* Badge OBLIGATORIA */}
        <Box sx={{ mb: 4 }}>
          <Chip 
            label="OBLIGATORIA" 
            size="small" 
            sx={{ 
              backgroundColor: '#fd7e14',
              color: 'white',
              fontWeight: 600,
              fontSize: '0.75rem'
            }} 
          />
        </Box>

        {navigationSteps.map((step) => (
          <Box
            key={step.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 3,
              opacity: step.isActive ? 1 : step.isCompleted ? 0.85 : 0.55,
              transition: 'all 0.2s ease'
            }}
          >
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: step.isActive ? '#501b36' : step.isCompleted ? '#27ae60' : '#bdc3c7',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600,
                mr: 3,
                flexShrink: 0
              }}
            >
              {step.isCompleted && !step.isActive ? (
                <CheckCircle sx={{ fontSize: 20 }} />
              ) : (
                step.number
              )}
            </Box>
            <Typography
              variant="body2"
              sx={{
                fontWeight: step.isActive ? 600 : 400,
                color: step.isActive ? '#2c3e50' : '#6c757d',
                fontSize: '0.9rem'
              }}
            >
              {step.title}
            </Typography>
          </Box>
        ))}
      </Box>
    );
  };

  const renderMobileProgress = () => {
    if (!isMobile) {
      return null;
    }

    return (
      <Box
        sx={{
          px: 2,
          pt: 1.75,
          pb: 2.5,
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: 'linear-gradient(135deg, #f8eef2 0%, #fdf7fa 40%, #ffffff 100%)',
          borderBottom: '1px solid rgba(80, 27, 54, 0.1)',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
            mb: 1.75,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ fontWeight: 700, color: '#501b36', letterSpacing: 0.2 }}
          >
            Paso {displayStepNumber} de {totalFlowSteps}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: '#6b3b51',
              textAlign: 'right',
              maxWidth: '65%',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {currentNavigationStep?.title}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{
            height: 10,
            borderRadius: 999,
            backgroundColor: 'rgba(80, 27, 54, 0.12)',
            '& .MuiLinearProgress-bar': {
              borderRadius: 999,
              background: 'linear-gradient(135deg, #501b36 0%, #824261 100%)',
            },
          }}
        />

        {mobileStepSubtitle && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              color: '#6c4d5f',
              mt: 1.5,
              lineHeight: 1.4,
            }}
          >
            {mobileStepSubtitle}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mt: 2,
          }}
        >
          {navigationSteps.map((step) => (
            <Box
              key={step.key}
              sx={{
                width: step.isActive ? 16 : 12,
                height: step.isActive ? 16 : 12,
                borderRadius: '50%',
                backgroundColor: step.isActive
                  ? '#501b36'
                  : step.isCompleted
                    ? 'rgba(80, 27, 54, 0.4)'
                    : 'rgba(80, 27, 54, 0.18)',
                border: step.isActive ? '3px solid rgba(255,255,255,0.7)' : 'none',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>
      </Box>
    );
  };

  const renderStepContent = () => {
    if (success) {
      return (
        <Fade in={success}>
          <Box sx={{ textAlign: 'center', py: isMobile ? 4 : 6, px: isMobile ? 2 : 4 }}>
            <Box
              sx={{
                width: isMobile ? 64 : 80,
                height: isMobile ? 64 : 80,
                borderRadius: '50%',
                backgroundColor: '#27ae60',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3
              }}
            >
              <CheckCircle sx={{ fontSize: 40, color: 'white' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: '#2c3e50' }}>
              ¡Inspección Completada!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Tu inspección se ha guardado correctamente.
            </Typography>
          </Box>
        </Fade>
      );
    }

    if (currentStep === 0) {
      return (
        <Box
          sx={{
            maxWidth: isMobile ? '100%' : 500,
            width: '100%',
            mx: 'auto',
            py: isMobile ? 1 : 2,
            px: isMobile ? 1 : 2,
          }}
        >
          <TextField
            fullWidth
            label="Matrícula del camión"
            placeholder="Introduce la matrícula del vehículo"
            value={truckLicensePlate}
            onChange={(e) => setTruckLicensePlate(e.target.value.toUpperCase())}
            required
            sx={{
              mb: isMobile ? 2 : 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '8px',
                '& fieldset': {
                  borderColor: '#e9ecef',
                },
                '&:hover fieldset': {
                  borderColor: '#501b36',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#501b36',
                  borderWidth: '2px',
                },
                '& input': {
                  fontSize: '1rem',
                  padding: '16px 14px',
                  fontWeight: 500
                }
              },
              '& .MuiInputLabel-root': {
                color: '#6c757d',
                fontSize: '0.95rem',
                '&.Mui-focused': {
                  color: '#501b36'
                }
              }
            }}
          />

          <TextField
            fullWidth
            label="Notas generales (opcional)"
            placeholder="Añade observaciones generales sobre el vehículo..."
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            multiline
            rows={4}
            sx={{
              mb: isMobile ? 2 : 3,
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'white',
                borderRadius: '8px',
                '& fieldset': {
                  borderColor: '#e9ecef',
                },
                '&:hover fieldset': {
                  borderColor: '#501b36',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#501b36',
                  borderWidth: '2px',
                },
                '& textarea': {
                  fontSize: '0.95rem',
                  padding: '16px 14px',
                }
              },
              '& .MuiInputLabel-root': {
                color: '#6c757d',
                fontSize: '0.95rem',
                '&.Mui-focused': {
                  color: '#501b36'
                }
              }
            }}
          />
        </Box>
      );
    }

    if (currentStep === inspectionSteps.length + 1) {
      // Resumen final
      const issuesCount = inspectionSteps.filter(step => step.status === false).length;
      
      return (
        <Box
          sx={{
            maxWidth: isMobile ? '100%' : 600,
            width: '100%',
            mx: 'auto',
            py: isMobile ? 1 : 2,
            px: isMobile ? 1 : 2,
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: isMobile ? 2.5 : 3,
              borderRadius: '12px',
              backgroundColor: 'white',
              border: '1px solid #e9ecef',
              mb: 4
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? 1 : 2,
                mb: 3,
              }}
            >
              <LocalShipping sx={{ fontSize: isMobile ? 22 : 24, color: '#501b36' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Vehículo: {truckLicensePlate}
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {inspectionSteps.map((step, index) => {
              const stepInfo = INSPECTION_STEPS[index];
              return (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    alignItems: isMobile ? 'flex-start' : 'center',
                    justifyContent: 'space-between',
                    gap: isMobile ? 1 : 0,
                    py: 2,
                    borderBottom: index < inspectionSteps.length - 1 ? '1px solid #f1f3f4' : 'none'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: isMobile ? 18 : 20, mr: 2 }}>{stepInfo.icon}</Typography>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {stepInfo.title}
                      </Typography>
                      {step.notes && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {step.notes}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Chip
                    icon={step.status ? <CheckCircle /> : <Error />}
                    label={step.status ? 'Correcto' : 'Problema'}
                    color={step.status ? 'success' : 'error'}
                    size="small"
                    sx={{ mt: isMobile ? 1 : 0 }}
                  />
                </Box>
              );
            })}

            {issuesCount > 0 && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mt: 3, 
                  borderRadius: '8px',
                  backgroundColor: '#fff3cd',
                  color: '#856404'
                }}
              >
                Se han encontrado {issuesCount} problema(s). El equipo técnico será notificado.
              </Alert>
            )}
          </Paper>
        </Box>
      );
    }

    // Pasos de inspección individual
    const stepIndex = currentStep - 1;
    const step = inspectionSteps[stepIndex];
    const stepInfo = INSPECTION_STEPS[stepIndex];
    
    return (
      <Box
        sx={{
          maxWidth: isMobile ? '100%' : 600,
          width: '100%',
          mx: 'auto',
          py: isMobile ? 1 : 2,
          px: isMobile ? 1 : 2,
        }}
      >
        {!isMobile && (
          <Box
            sx={{
              textAlign: 'center',
              mb: 4,
              px: 0,
            }}
          >
            <Typography sx={{ fontSize: 48, mb: 2 }}>
              {stepInfo.icon}
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 1, color: '#2c3e50' }}
            >
              {stepInfo.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {stepInfo.description}
            </Typography>
          </Box>
        )}

        <Paper
          elevation={0}
          sx={{
            p: isMobile ? 3 : 4,
            borderRadius: '12px',
            backgroundColor: 'white',
            border: '1px solid #e9ecef',
            mb: 3
          }}
        >
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
            Estado del componente
          </Typography>
          
          <Box
            sx={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              gap: 2,
              mb: 3,
            }}
          >
            <Button
              variant={step.status === true ? 'contained' : 'outlined'}
              startIcon={<CheckCircle />}
              onClick={() => handleStepStatusChange(stepIndex, true)}
              sx={{
                flex: 1,
                width: isMobile ? '100%' : 'auto',
                py: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                ...(step.status === true ? {
                  backgroundColor: '#27ae60',
                  '&:hover': { backgroundColor: '#219a52' }
                } : {
                  borderColor: '#e9ecef',
                  color: '#6c757d',
                  '&:hover': {
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.04)'
                  }
                })
              }}
            >
              Todo correcto
            </Button>
            <Button
              variant={step.status === false ? 'contained' : 'outlined'}
              startIcon={<Error />}
              onClick={() => handleStepStatusChange(stepIndex, false)}
              sx={{
                flex: 1,
                width: isMobile ? '100%' : 'auto',
                py: 1.5,
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 500,
                ...(step.status === false ? {
                  backgroundColor: '#e74c3c',
                  '&:hover': { backgroundColor: '#c0392b' }
                } : {
                  borderColor: '#e9ecef',
                  color: '#6c757d',
                  '&:hover': {
                    borderColor: '#e74c3c',
                    backgroundColor: 'rgba(231, 76, 60, 0.04)'
                  }
                })
              }}
            >
              Hay problemas
            </Button>
          </Box>

          <Collapse in={step.status === false}>
            <Box sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="Describe el problema"
                placeholder="Explica qué problema has encontrado..."
                value={step.notes || ''}
                onChange={(e) => handleStepNotesChange(stepIndex, e.target.value)}
                multiline
                rows={3}
                sx={{
                  mb: isMobile ? 2.5 : 3,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#fff5f5',
                    borderRadius: '8px',
                    '& fieldset': {
                      borderColor: '#fed7d7',
                    },
                    '&:hover fieldset': {
                      borderColor: '#e74c3c',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#e74c3c',
                      borderWidth: '2px',
                    }
                  }
                }}
              />

              <Box
                sx={{
                  border: '2px dashed #e9ecef',
                  borderRadius: '8px',
                  p: isMobile ? 2.5 : 3,
                  textAlign: 'center',
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: '#501b36',
                    backgroundColor: '#f3e5f5'
                  }
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(stepIndex, file);
                  }}
                  style={{ display: 'none' }}
                  id={`image-upload-${stepIndex}`}
                />
                <label htmlFor={`image-upload-${stepIndex}`} style={{ cursor: 'pointer' }}>
                  <PhotoCamera sx={{ fontSize: 32, color: '#501b36', mb: 1 }} />
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                    Subir imagen del problema
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    (Opcional)
                  </Typography>
                </label>
                
                {step.imageFile && (
                  <Box sx={{ mt: 2 }}>
                    <Chip
                      label={step.imageFile.name}
                      onDelete={() => removeImage(stepIndex)}
                      deleteIcon={<Close />}
                      color="primary"
                      variant="filled"
                    />
                  </Box>
                )}
              </Box>
            </Box>
          </Collapse>
        </Paper>

        {step.status !== undefined && (
          <Fade in={step.status !== undefined}>
            <Alert 
              severity={step.status ? 'success' : 'warning'}
              sx={{ borderRadius: '8px', mt: isMobile ? 2 : 0 }}
            >
              {step.status 
                ? `? ${stepInfo.title} marcado como correcto`
                : `⚠️ ${stepInfo.title} requiere atención`
              }
            </Alert>
          </Fade>
        )}
      </Box>
    );
  };

  if (!open) return null;

  const getModalTitle = () => {
    if (success) return '¡Inspección Completada!';
    if (currentStep === 0) return 'Información del Vehículo';
    if (currentStep === inspectionSteps.length + 1) return 'Resumen de la Inspección';
    return INSPECTION_STEPS[currentStep - 1]?.title || '';
  };

  const getModalSubtitle = () => {
    if (success) return 'Tu inspección se ha guardado correctamente';
    if (currentStep === 0) return 'Debe completar esta inspección antes de acceder al sistema';
    if (currentStep === inspectionSteps.length + 1) return `Vehículo: ${truckLicensePlate}`;
    return INSPECTION_STEPS[currentStep - 1]?.description || '';
  };

  const modalActions = !success ? (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: isMobile ? 1.5 : 2,
      }}
    >
      <ModernButton
        variant="outlined"
        onClick={handleBack}
        disabled={currentStep === 0 || loading}
        startIcon={<ArrowBack />}
        color="secondary"
        fullWidth={isMobile}
        size={isMobile ? 'large' : 'medium'}
      >
        {isMobile ? 'Atrás' : 'Anterior'}
      </ModernButton>
      
      {currentStep === inspectionSteps.length + 1 ? (
        <ModernButton
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={<Save />}
          loading={loading}
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
        >
          {loading ? 'Guardando...' : 'Finalizar inspección'}
        </ModernButton>
      ) : (
        <ModernButton
          variant="contained"
          onClick={handleNext}
          disabled={!canProceedToNext() || loading}
          endIcon={<ArrowForward />}
          fullWidth={isMobile}
          size={isMobile ? 'large' : 'medium'}
        >
          Continuar
        </ModernButton>
      )}
    </Box>
  ) : null;

  return (
    <ModernModal
      open={open}
      onClose={handleModalClose}
      title={getModalTitle()}
      subtitle={getModalSubtitle()}
      icon={<LocalShipping />}
      maxWidth="lg"
      fullWidth
      actions={modalActions}
      disableBackdropClick={true}
      disableEscapeKeyDown={true}
      showCloseButton={!loading}
      customHeaderGradient="linear-gradient(135deg, #501b36 0%, #6d2548 30%, #7d2d52 70%, #501b36 100%)"
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          minHeight: isMobile ? '100%' : 500,
        }}
      >
        {/* Sidebar con pasos */}
        {renderStepsSidebar()}
        
        {/* Contenido principal */}
        <Box sx={{ flex: 1, p: 0, display: 'flex', flexDirection: 'column' }}>
          {renderMobileProgress()}

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '12px',
                mx: isMobile ? 1 : 0,
              }}
            >
              {error}
            </Alert>
          )}

          {hasManualRequests && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                fontWeight: 600,
                color: '#a33b56',
                textAlign: isMobile ? 'center' : 'left',
                mb: 2.5,
                mx: isMobile ? 1 : 0,
              }}
            >
              Inspección manual obligatoria: completa esta revisión para poder continuar usando la plataforma.
            </Typography>
          )}

          <Box sx={{ flex: 1 }}>{renderStepContent()}</Box>
        </Box>
      </Box>
    </ModernModal>
  );
};
