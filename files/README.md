# 📁 SISTEMA DE ARCHIVOS UNIFICADO - SGT PORTAL

> **Fecha de implementación**: 29 de agosto de 2025  
> **Migración completada**: ✅ Estructura antigua eliminada exitosamente

## 🏗️ ESTRUCTURA UNIFICADA

```
files/
├── users/                 # 🔒 Carpetas personales (AUTO-GENERADAS)
│   ├── [DNI_USER]/        # ❌ NO se suben a Git (datos personales)
│   │   ├── documentos_personales/
│   │   ├── nominas/
│   │   └── ... (creadas automáticamente por rol)
│   │
├── traffic/               # ✅ Módulo de gestión de tráfico
│   ├── routes/            # Rutas y planificación
│   ├── documents/         # CMR, albaranes, etc.
│   └── reports/           # Informes de tráfico
│
├── documents/             # ✅ Documentos generales del sistema
│   ├── policies/          # Políticas de empresa
│   ├── procedures/        # Procedimientos operativos
│   └── templates/         # Plantillas corporativas
│
├── payroll/               # ✅ Gestión centralizada de nóminas
│   ├── monthly/           # Nóminas por meses
│   ├── annual/            # Resúmenes anuales
│   └── reports/           # Informes de RRHH
│
└── orders/                # ✅ Gestión de órdenes y pedidos
    ├── pending/           # Órdenes pendientes
    ├── in_progress/       # En proceso
    └── completed/         # Completadas
```

### 🔒 **IMPORTANTE - Privacidad y Git**

**❌ NO se suben a GitHub:**
- `files/users/[usuario_individual]/` - Datos personales
- Archivos de usuarios (.pdf, .doc, etc.)
- Información confidencial

**✅ SÍ se suben a GitHub:**
- Estructura base de carpetas
- Archivos `.gitkeep` para mantener estructura
- Documentación del sistema
- Código que crea carpetas automáticamente

## 🔄 CAMBIOS REALIZADOS

### ✅ Migración Completada
- **user_files/** → **files/users/**
- **traffic_files/** → **files/traffic/**
- Carpetas antiguas eliminadas completamente
- Configuración actualizada en `.env` y `config.py`

### 🔧 Configuración Actualizada

**Backend Config:**
- `USER_FILES_BASE_PATH`: `files/users/`
- `TRAFFIC_FILES_BASE_PATH`: `files/traffic/`
- Nuevos paths para documents, payroll, orders

**Variables de Entorno:**
```properties
FILES_BASE_PATH=C:/Users/PC-EMATRA-AZ/Desktop/IT/SGT-Portal/files
USER_FILES_BASE_PATH=C:/Users/PC-EMATRA-AZ/Desktop/IT/SGT-Portal/files/users
TRAFFIC_FILES_BASE_PATH=C:/Users/PC-EMATRA-AZ/Desktop/IT/SGT-Portal/files/traffic
```

### 👥 Carpetas de Usuario Migradas

**Usuarios Existentes:**
- ✅ `CONDUCTOR_DEMO` - Carpeta de demostración
- ✅ `27865403Y` - Usuario PRUEBA UNO (TRABAJADOR)

**Estructura por Rol:**
- **TRABAJADOR**: 12 carpetas especializadas
- **TRAFICO**: 9 carpetas de gestión
- **ADMINISTRADOR**: 8 carpetas administrativas

## 📋 VENTAJAS DE LA NUEVA ESTRUCTURA

### 🎯 Organización Mejorada
- **Centralización**: Todo en una sola estructura `/files/`
- **Escalabilidad**: Fácil añadir nuevos módulos
- **Mantenimiento**: Estructura clara y predecible

### 🔒 Seguridad y Acceso
- Carpetas personales aisladas por usuario
- Control de acceso basado en roles
- Logs de actividad centralizados

### 🔧 Desarrollo
- Rutas consistentes en todo el backend
- API endpoints unificados
- Facilita backups y sincronización

## 🚀 PRÓXIMOS PASOS

1. **Frontend**: Actualizar componentes de gestión de archivos
2. **API**: Validar todos los endpoints de archivos
3. **Testing**: Probar subida/descarga en nueva estructura
4. **Documentación**: Actualizar guías de usuario

## 📞 CONTACTO

Para cualquier incidencia con la nueva estructura:
- **Sistema**: Portal SGT v1.0.0
- **Administrador**: Team Backend
- **Fecha**: 29/08/2025

---
*Este archivo se genera automáticamente. No eliminar.*
