# NexoraSport — Frontend

React 18 + Vite + Tailwind. Mismo esqueleto de arquitectura que DemoPV-Frontend (contexto de
auth, RBAC por secciones, theming por color de marca en tiempo de ejecucion, capa de API con
axios) adaptado al dominio de centros deportivos.

## Requisitos

- Node 18+

## Arranque

```
npm install
npm run dev
```

Corre en `http://localhost:5174` y hace proxy de `/api` y `/uploads` hacia el backend en
`http://localhost:8081` (ver `vite.config.js`). Ajusta `.env.production` con la URL real de
la API antes de desplegar.

## Estructura

```
api/          un archivo por recurso del backend (axios)
context/      AuthContext (sesion/RBAC/tenant) y NotifyContext (toasts/confirm)
components/   Layout (sidebar), PrivateRoute (guard por seccion/rol), Modal, Pagination
config/       catalogo de secciones para el sidebar y el guard de rutas
pages/        una pantalla por ruta
utils/        theming de marca (rampa de color por centro)
```

## Rutas relevantes

- `/tienda/:slug` — catalogo publico sin login, pensado para compartirse por WhatsApp,
  Facebook o QR (ver pagina `Tienda.jsx` para generar el link/QR desde el panel).
- `/select-centro` — selector de centro para el usuario SUPER_ADMIN.

## Pendiente

Ver "Funcionalidades recomendadas para versiones posteriores" en el documento de analisis:
portal de alumno con login propio, generacion de QR/PDF del lado del servidor (como hace
DemoPV con ZXing/OpenPDF), reportes avanzados, y pruebas end-to-end.
