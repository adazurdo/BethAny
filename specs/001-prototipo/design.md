# Diseño web: Layout y guías visuales

Este documento describe la actualización de la interfaz web para el prototipo `001-prototipo`.
El objetivo es ofrecer una versión de escritorio con una disposición en tres columnas (navegación izquierda, contenido principal y barra lateral derecha) inspirada en la imagen de referencia, pero usando la paleta naranja/blanco definida en la especificación.

Principales decisiones:

- Paleta: mantener la gama naranja/blanco del prototipo. Tokens en `frontend/theme/index.ts`.
- Layout de escritorio: 3 columnas responsivas.
  - Columna izquierda: navegación vertical compacta (links de secciones y categorías).
  - Columna central: contenido principal (hero, secciones, tarjetas de eventos).
  - Columna derecha: panel contextual (bet-slip mock, promociones, accesos rápidos).
- Comportamiento responsive:
  - Ancho >= 900px: mostrar layout de tres columnas.
  - Ancho < 900px: usar la experiencia mobile actual con navegación inferior.

Tokens y estilos (resumen)

- Colors: usar `colors.primary` como color principal naranja, `colors.surface` como fondo de tarjetas y `colors.background` como fondo general.
- Tipografía: títulos pesados (800-900), subtítulos y meta en `colors.muted`.
- Espaciado y radios: usar `spacing` y `radii` desde `frontend/theme`.

Accesibilidad

- Contraste: asegurar texto oscuro (`colors.text`) sobre fondo claro. Para textos sobre naranja, usar `colors.surface` (blanco) como color de texto.
- Botones/targets: mantener tamaño táctil mínimo de 44px en mobile.

Entregables en repositorio

- `frontend/components/DesktopShell.tsx`: componente contenedor responsivo para escritorio.
- Pequeños ajustes en `frontend/app/(tabs)/index.tsx` para renderizar el `DesktopShell` en web.
- Documentación de diseño en este archivo (esta página).

Notas

- Esta tarea se centra en la apariencia y layout visual; no añade integraciones de backend. Todos los datos siguen siendo mock.
