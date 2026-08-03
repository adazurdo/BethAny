# BethAny 💵

Aplicación de apuestas sociales con **moneda virtual** (sin dinero real), enfocada en retos entre amigos, clasificaciones y experiencia competitiva.

> ⚠️ **Importante:** BethAny **no permite apuestas con dinero real**.  
> Todas las apuestas se realizan con monedas internas del juego.

---

## 📌 ¿Qué es BethAny?

**BethAny** es una plataforma donde los usuarios pueden:

- Apostar con moneda del juego.
- Crear y aceptar retos con amigos.
- Competir en rankings y clasificaciones.
- Disfrutar de una experiencia social y competitiva.

La monetización para desarrolladores se basa en:

- **Publicidad dentro de la app** (anuncios).

---

## 🧭 Estado actual de desarrollo (constitución activa)

En esta fase inicial, BethAny se desarrolla con estas reglas activas:

- Código sencillo y fácil de mantener.
- Ejecución local-first para desarrollo diario; despliegue a staging/producción permitido cuando el equipo lo decida explícitamente (sin levantar las restricciones de la fase mock: sin secretos reales ni datos de usuarios reales).
- Backend y automatizaciones con **Python**.
- Frontend con **React**.
- Arranque de desarrollo frontend con `npm start dev`.
- Validación de flujos móviles con **Expo** en dispositivos móviles.
- Seguridad avanzada diferida temporalmente por tratarse de una fase mock.

Estas reglas se formalizan en `.specify/memory/constitution.md`.

---

## 🎯 Objetivo del producto

Construir una app social de apuestas virtuales, divertida y escalable, con una arquitectura moderna y preparada para producción.

---

## ✅ Requisitos del sistema

Para ejecutar y desarrollar **BethAny** en entorno local necesitas:

### Sistema operativo
- **Windows 10/11** con **WSL2** + Ubuntu, o
- **Linux** (Ubuntu 22.04+ recomendado), o
- **macOS** (Ventura+ recomendado)

### Software necesario
- **Git** `>= 2.40`
- **Docker Desktop** `>= 4.x` (o Docker Engine + Docker Compose en Linux)
- **Docker Compose** `v2` (incluido normalmente en Docker Desktop)
- **Node.js** `>= 20` (recomendado para desarrollo frontend fuera de contenedores)
- **pnpm** o **npm** (según se defina en frontend)
- **Python** `>= 3.11` (recomendado para desarrollo backend fuera de contenedores)
- **VS Code** (opcional, recomendado)

### Recursos recomendados
- **CPU:** 4 núcleos
- **RAM:** 8 GB mínimo (16 GB recomendado)
- **Disco libre:** 10 GB mínimo

---

## 🧪 Variables de entorno

Antes de levantar el proyecto, crea un archivo `.env` en la raíz basado en `.env.example` (cuando exista).

Ejemplo de variables típicas:

```env
# App
NODE_ENV=development

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000

# Backend
API_PORT=8000
JWT_SECRET=change_me

# Database
POSTGRES_DB=bethany
POSTGRES_USER=bethany
POSTGRES_PASSWORD=bethany_dev
POSTGRES_PORT=5432
```

---

## 🚀 Puesta en marcha (desarrollo local)

### 1) Clonar repositorio
```bash
git clone https://github.com/adazurdo/BethAny.git
cd BethAny
```

### 2) Levantar servicios con Docker Compose
```bash
docker compose up --build -d
```

### 3) Verificar estado de contenedores
```bash
docker compose ps
```

### 4) Ver logs (opcional)
```bash
docker compose logs -f
```

### 5) Detener servicios
```bash
docker compose down
```

---

## 🧰 Desarrollo por servicio (opcional)

Si trabajas sin contenedores en alguna parte:

### Arranque completo
```bash
npm run dev
```

Esto levanta la API local en Python y el frontend de Expo al mismo tiempo.

### Frontend (Expo)
```bash
cd frontend
npm install
npm start
```

### Backend (Python local API)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/macOS/WSL
pip install -r requirements.txt
python scripts/run_local_api.py
```

Si abres la app desde un dispositivo físico, define `EXPO_PUBLIC_BETHANY_API_URL` con la IP de tu máquina y el puerto `8000`.

---

## 🌐 Entorno desplegado (Vercel + Railway)

Desde `ec89f4efc`/`a48edc688`, el backend se despliega en **Railway** (usa `backend/Procfile`, con `BETHANY_DATA_DIR` apuntando a un volumen persistente para que el SQLite sobreviva a redeploys) y el frontend en **Vercel** (usa `frontend/vercel.json`, `expo export -p web`).

**Importante**: hoy el flujo habitual de prueba manual es contra estas URLs desplegadas, no contra `npm run dev` en local. Esto significa:

- Un cambio de backend/frontend solo existe para quien prueba en Vercel/Railway **después** de `git push` a la rama conectada y de que ambos servicios completen su redeploy (automático o disparado manualmente desde su dashboard). Mientras tanto, es indistinguible de "el cambio no existe".
- El frontend de Vercel necesita `EXPO_PUBLIC_BETHANY_API_URL` configurada en las variables de entorno de su propio proyecto (dashboard de Vercel), apuntando al dominio del backend en Railway — no se lee de ningún `.env` del repo en producción.
- Cualquier secreto real que una feature necesite en producción (p. ej. credenciales SMTP para verificación de correo, ver `specs/009-verificacion-correo`) se configura como variable de entorno en el proyecto de Railway, nunca en el repositorio.
- Si algo no falla en local pero tampoco aparece en lo desplegado, lo primero a revisar es si el cambio llegó a desplegarse (logs/estado del deploy en cada dashboard) antes de asumir un bug de código.

---


## 🗂️ Estructura del proyecto

```txt
proyecto/
│
├── frontend/
├── backend/
├── postgres/
├── docker-compose.yml
└── .env
```

---

## 🛠️ Roadmap técnico

## Nivel 1
- Dockerfile
- Imagen
- Contenedor
- Volumen
- Red

## Nivel 2
- Docker Compose
- Variables de entorno
- Persistencia de datos

## Nivel 3
- Despliegue en VPS
- CI/CD con GitHub Actions
- Reverse proxy con Nginx o Traefik

---

## 🚀 CI/CD 

### CI
En cada `push` o `pull request`:
- Ejecutar tests
- Ejecutar linting
- Verificar build Docker

### CD
En cada merge a `main`:
- Conectar con servidor VPS
- Actualizar código
- Reconstruir contenedores
- Levantar versión nueva automáticamente

---


## 🧩 Funcionalidades principales (MVP)

- Registro/Login
- Moneda virtual
- Sistema de amigos
- Retos entre amigos
- Clasificación/ranking
- Historial de resultados
- Publicidad in-app

---

## 💻 Desarrollo local 

Requisitos:
- WSL
- Ubuntu
- Docker Desktop
- VS Code

---

## 👤 Autores

**adazurdo**
**joseaceituno**
