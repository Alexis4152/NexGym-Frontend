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

## Variables de entorno

No hay secretos aqui: Vite solo usa `VITE_API_URL` (la base de la API). Ya vienen
commiteados dos archivos con valores no sensibles:

| Archivo | Cuando se usa | Valor |
|---|---|---|
| `.env.development` | `npm run dev` | `/api` (proxy local hacia el backend, ver `vite.config.js`) |
| `.env.production` | `npm run build` | URL real de la API en produccion — **ajusta esto a tu dominio antes de desplegar** |
| `.env.local` *(no se commitea, ya esta en `.gitignore`)* | sobreescribe cualquiera de los dos en tu maquina | opcional, para pruebas locales sin tocar los archivos de arriba |

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
