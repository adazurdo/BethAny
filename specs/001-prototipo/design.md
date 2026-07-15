# Diseño web: Layout y guías visuales

Este documento describe la actualización de la interfaz web para el prototipo `001-prototipo`.
El objetivo es ofrecer una versión de escritorio con una disposición en tres columnas (navegación izquierda, contenido principal y barra lateral derecha) inspirada en la imagen de referencia.

**Actualización (2026-07-16)**: la paleta naranja/blanco original de la especificación nunca llegó a implementarse; la app ya usaba un tema oscuro azul marino con acento verde menta. Tras nuevo feedback de estilo, este documento pasa a describir la paleta realmente vigente: **tema oscuro índigo/violeta**, manteniendo el mismo layout de tres columnas. Ver `spec.md` Amendment (2026-07-16) y FR-006a.

Principales decisiones:

- Paleta: tema oscuro con fondo y paneles en índigo casi negro, y un único acento violeta vivo reservado para acciones principales y estados activos (nunca decorativo ni repetido por toda la pantalla, para que no se sienta sobrecargado). Tokens en `frontend/theme/index.ts`.
- Layout de escritorio: 3 columnas responsivas.
  - Columna izquierda: navegación vertical compacta (links de secciones y categorías).
  - Columna central: contenido principal (hero, secciones, tarjetas de eventos).
  - Columna derecha: panel contextual (boleto de apuestas, promociones, accesos rápidos).
- Comportamiento responsive:
  - Ancho >= 900px: mostrar layout de tres columnas.
  - Ancho < 900px: usar la experiencia mobile actual con navegación inferior (más el acceso flotante al boleto de `005-combinada`).

Tokens y estilos (resumen)

- Colors: `colors.primary` (violeta vivo) solo para botones de acción principal, pestañas/estado activo y elementos seleccionados; `colors.surface`/`colors.surfaceSoft` para tarjetas y paneles sobre `colors.background`; `colors.accent` (azul claro) reservado para enlaces y metadatos secundarios (horas, cifras), para que no compita visualmente con el violeta de las acciones.
- Tipografía: títulos pesados (800-900) en `colors.text` (blanco cálido), subtítulos y meta en `colors.muted`.
- Espaciado y radios: usar `spacing` y `radii` desde `frontend/theme`; preferir aire (padding/gap generoso) y bordes de 1px en `colors.border` en vez de sombras o separadores adicionales, para mantener las tarjetas limpias.

Accesibilidad

- Contraste: `colors.text` (casi blanco) sobre `colors.background`/`colors.surface` (índigo muy oscuro) ya cumple contraste alto por diseño; evitar texto en `colors.muted` sobre `colors.surfaceSoft` para bloques largos.
- Botones/targets: mantener tamaño táctil mínimo de 44px en mobile.

Entregables en repositorio

- `frontend/theme/index.ts`: única fuente de verdad de la paleta; todo el resto de componentes consume estos tokens (no hay colores hardcodeados fuera de overlays de fondo neutros).
- `frontend/components/DesktopShell.tsx`: componente contenedor responsivo para escritorio.
- Pequeños ajustes en `frontend/app/(tabs)/index.tsx` para renderizar el `DesktopShell` en web.
- Documentación de diseño en este archivo (esta página).

Notas

- Esta tarea se centra en la apariencia y layout visual; no añade integraciones de backend. Todos los datos siguen siendo mock.
- El cambio de paleta (2026-07-16) se aplicó únicamente editando `frontend/theme/index.ts` (y dos overlays `rgba(...)` que replicaban el acento anterior en `app/(tabs)/index.tsx` y `components/DesktopShell.tsx`), precisamente porque ningún componente tenía colores de marca hardcodeados fuera de esos tokens — el cambio se propaga a toda la app de forma consistente sin tocar cada pantalla una por una.
