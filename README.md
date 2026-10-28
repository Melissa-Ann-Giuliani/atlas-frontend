# "ATLAS" - Sistema de Gestión de Mapa Docente FFHA <!-- test-button-prompt -->

Servicio frontend para automatizar la gestión de trámites correspondientes a los docentes (designaciones, licencias, renuncias, subrogaciones), así como también realizar auditorías y brindar un acceso rápido a estadísticas e información consolidada.

## Tecnologías
- React 19
- TypeScript
- Vite
- Docker / Nginx

## Requisitos
- Node.js 20+
- npm 10+
- Docker Desktop (si se ejecuta con contenedores)

---

## Cómo empezar

### Opción 1: Con Docker (Recomendada para producción o pruebas integradas)

Requisitos: Tener instalado Docker Desktop.

#### Levantar solo el Frontend en Docker:
```bash
docker build -t atlas-frontend .
docker run -d -p 80:80 --name atlas_frontend atlas-frontend
```
- La aplicación estará disponible en `http://localhost` (puerto 80).
- Para detener el contenedor: `docker stop atlas_frontend` y para eliminarlo: `docker rm atlas_frontend`.

#### Levantar todo el sistema (Base de Datos + Backend + Frontend):
Desde la carpeta raíz del proyecto (`atlas/`):
```bash
docker compose up -d
```
- El frontend iniciará en `http://localhost` (puerto 80).
- El backend iniciará en `http://localhost:8081`.
- Para detener todos los servicios: `docker compose down`.

---

### Opción 2: Ejecución local para desarrollo (Vite)

Requisitos: Node.js 20+ y npm instalados.

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar servidor de desarrollo con HMR:**
   ```bash
   npm run dev
   ```
   - La aplicación se iniciará por defecto en `http://localhost:5173`.
   - Se conectará automáticamente al backend en `http://localhost:8081`.

3. **Compilar para producción (Build y verificación de tipos):**
   ```bash
   npm run build
   ```

4. **Ejecutar linter:**
   ```bash
   npm run lint
   ```
