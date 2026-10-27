import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:celular`: mismo servidor pero con https (certificado autofirmado) y abierto a
// la red local, para probar el escaneo con la camara desde un celular/tablet -- el navegador
// solo permite la camara en https o en localhost. `npm run dev` queda igual que siempre.
export default defineConfig(({ mode }) => ({
  plugins: [react(), ...(mode === 'celular' ? [basicSsl()] : [])],
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:8081', changeOrigin: true },
      '/uploads': { target: 'http://localhost:8081', changeOrigin: true },
    },
  },
}));
