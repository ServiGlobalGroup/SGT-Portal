# Portal Web - Backend y Frontend

## 📱 **Diseño Responsive Perfecto**

El portal está completamente optimizado para dispositivos móviles con las siguientes características:

### **Páginas Principales Optimizadas:**

#### 🗂️ **Documentos**
- ✅ **Tablas adaptables**: Vista de tabla en desktop, cards en móvil
- ✅ **Botones optimizados**: Botones de acción con altura mínima para táctil
- ✅ **Filtros responsive**: Controles de filtrado apilados en móvil
- ✅ **Estadísticas adaptables**: Grid responsive para métricas
- ✅ **Navegación mejorada**: Breadcrumbs y controles táctiles

#### 📋 **Órdenes** 
- ✅ **Layout dual**: Tabla completa (desktop) + Cards detalladas (móvil)
- ✅ **Acciones táctiles**: Botones con tamaño mínimo 40px para móvil
- ✅ **Filtros inteligentes**: Controles apilados automáticamente
- ✅ **Estados visuales**: Chips y badges optimizados para pantallas pequeñas
- ✅ **Información condensada**: Datos importantes priorizados en vista móvil

#### 👤 **Perfil**
- ✅ **Formularios adaptables**: Campos apilados en móvil, lado a lado en desktop
- ✅ **Avatar responsive**: Tamaños adaptativos según dispositivo
- ✅ **Botón flotante**: Guardar cambios accesible en móvil
- ✅ **Grid flexible**: Layouts que se adaptan automáticamente
- ✅ **Información estructurada**: Secciones organizadas para lectura móvil

---

## Descripción
Aplicación web completa con dashboard administrativo que incluye:
- Dashboard principal con estadísticas
- Módulo de análisis de tráfico
- Gestión de vacaciones
- Gestión de documentos

## Tecnologías Utilizadas

### Backend
- **FastAPI**: Framework web moderno y rápido para Python
- **Uvicorn**: Servidor ASGI para ejecutar la aplicación
- **Pydantic**: Validación de datos y serialización
- **SQLAlchemy**: ORM para base de datos (preparado para futura implementación)

### Frontend
- **React**: Biblioteca para construir interfaces de usuario
- **TypeScript**: Superset de JavaScript con tipado estático
- **Vite**: Herramienta de construcción y desarrollo rápido
- **Material-UI**: Biblioteca de componentes con diseño Material Design
- **React Router**: Enrutamiento para aplicaciones React
- **Axios**: Cliente HTTP para realizar peticiones a la API

## Estructura del Proyecto

```
portal/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── dashboard.py
│   │   │   ├── traffic.py
│   │   │   ├── vacations.py
│   │   │   └── documents.py
│   │   ├── models/
│   │   │   └── schemas.py
│   │   └── services/
│   ├── main.py
│   ├── requirements.txt
│   ├── setup.bat
│   └── setup.sh
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.tsx
    │   │   ├── Header.tsx
    │   │   └── Sidebar.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── Traffic.tsx
    │   │   ├── Vacations.tsx
    │   │   └── Documents.tsx
    │   ├── services/
    │   │   └── api.ts
    │   ├── types/
    │   │   └── index.ts
    │   └── App.tsx
    ├── package.json
    └── vite.config.ts
```

## Instalación y Configuración

### Backend

1. Navegar a la carpeta del backend:
```bash
cd backend
```

2. Ejecutar el script de configuración:
```bash
# Windows
setup.bat

# Linux/Mac
chmod +x setup.sh
./setup.sh
```

3. O configurar manualmente:
```bash
# Crear entorno virtual
python -m venv venv

# Activar entorno virtual
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt
```

### Frontend

1. Navegar a la carpeta del frontend:
```bash
cd frontend
```

2. Instalar dependencias:
```bash
npm install
```

## Ejecución

### Backend

1. Activar el entorno virtual:
```bash
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate
```

2. Ejecutar el servidor:
```bash
python main.py
```

El backend estará disponible en: `http://localhost:8000`

### Frontend

1. Ejecutar el servidor de desarrollo:
```bash
npm run dev
```

El frontend estará disponible en: `http://localhost:5173`

## Funcionalidades

### Dashboard
- Estadísticas generales del sistema
- Actividad reciente de usuarios
- Métricas de rendimiento

### Tráfico
- Análisis de visitas y visitantes únicos
- Tasa de rebote y duración de sesiones
- Páginas más visitadas

### Vacaciones
- Gestión de solicitudes de vacaciones
- Estados: pendiente, aprobado, rechazado
- Estadísticas de solicitudes

### Documentos
- Listado de documentos por categoría
- Gestión de archivos (subir, descargar, eliminar)
- Estadísticas de almacenamiento

### Órdenes (✨ NUEVO)
- Gestión de órdenes recibidas por correo electrónico
- Procesamiento automático de PDFs adjuntos
- Estados: pendiente, procesando, completada, cancelada
- Prioridades: baja, normal, alta, urgente
- Simulación de recepción de correos para demostración

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` - Obtener estadísticas generales
- `GET /api/dashboard/recent-activity` - Obtener actividad reciente

### Tráfico
- `GET /api/traffic/` - Obtener datos de tráfico
- `GET /api/traffic/analytics` - Obtener análisis de tráfico

### Vacaciones
- `GET /api/vacations/` - Obtener solicitudes de vacaciones
- `POST /api/vacations/` - Crear nueva solicitud
- `PUT /api/vacations/{id}/status` - Actualizar estado de solicitud
- `GET /api/vacations/stats` - Obtener estadísticas

### Documentos
- `GET /api/documents/` - Obtener lista de documentos
- `POST /api/documents/` - Subir nuevo documento
- `GET /api/documents/{id}` - Obtener documento específico
- `DELETE /api/documents/{id}` - Eliminar documento

### Órdenes (✨ NUEVO)
- `GET /api/orders/` - Obtener todas las órdenes
- `GET /api/orders/{id}` - Obtener orden específica
- `GET /api/orders/{id}/documents` - Obtener documentos de una orden
- `PUT /api/orders/{id}/status` - Actualizar estado de orden
- `POST /api/orders/process-email` - Procesar correo con adjuntos
- `POST /api/orders/simulate-email` - Simular recepción de correo
- `GET /api/orders/stats/summary` - Obtener estadísticas de órdenes
- `GET /api/orders/documents/{id}/view` - Ver documento PDF
- `GET /api/orders/documents/download/{id}` - Descargar documento
- `GET /api/documents/stats/summary` - Obtener estadísticas

## Desarrollo

### Agregar nuevas funcionalidades

1. **Backend**: Crear nuevos endpoints en `/app/api/`
2. **Frontend**: Crear nuevos componentes en `/src/components/` o páginas en `/src/pages/`
3. **Rutas**: Agregar nuevas rutas en el archivo `App.tsx`
4. **Navegación**: Actualizar el `Sidebar.tsx` para incluir nuevas opciones

### Configuración de base de datos

El proyecto está preparado para integrar una base de datos. Actualmente usa datos simulados en memoria. Para integrar una base de datos real:

1. Configurar SQLAlchemy en `/app/database/`
2. Crear modelos de base de datos
3. Implementar operaciones CRUD
4. Configurar migraciones

## Notas Adicionales

- El frontend usa Material-UI para un diseño consistente y profesional
- Las API calls están centralizadas en `/src/services/api.ts`
- El backend incluye CORS configurado para desarrollo
- Los tipos TypeScript están definidos en `/src/types/index.ts`
- El proyecto está configurado para desarrollo pero puede ser optimizado para producción
