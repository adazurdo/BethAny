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
- Ejecución local-first (sin dependencias cloud obligatorias).
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

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Linux/macOS/WSL
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Base de datos
Si usas Docker, PostgreSQL quedará disponible en:
- `localhost:5432`

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
