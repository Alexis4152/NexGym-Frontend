# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime ----
FROM nginx:1.27-alpine
# URL del backend al que nginx reenvia /api y /uploads (se sustituye al arrancar)
ENV BACKEND_URL=https://api-gym.nexorasistemas.com.mx
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
