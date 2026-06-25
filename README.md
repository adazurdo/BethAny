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

## 🎯 Objetivo del producto

Construir una app social de apuestas virtuales, divertida y escalable, con una arquitectura moderna y preparada para producción.

---

## 🧱 Stack tecnológico

### Frontend
- Next.js
- TypeScript

### Backend
- FastAPI (Python)

### Base de datos
- PostgreSQL

### Autenticación
- Firebase Auth o Clerk

### IA (futuro)
- APIs de modelos
- Agentes en Python

### Infraestructura
- Docker
- GitHub
- GitHub Actions
- VPS Linux
- Reverse Proxy (Nginx o Traefik)

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
