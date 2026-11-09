# syntax=docker/dockerfile:1

# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# URL pública del sitio (ej. https://atlas.ffha.unsj.edu.ar). Vite la incrusta en el bundle;
# el nginx de esta imagen reenvía /api/ al backend, así front y API comparten origen.
ARG VITE_API_URL
RUN test -n "$VITE_API_URL" || (echo "Falta el build-arg VITE_API_URL" && exit 1)
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Serve ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
