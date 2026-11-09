# landing-management

Administra el sitio público del restaurante, su editor visual y de código, sus módulos personalizados y sus plantillas. La URL pública usa `Restaurant.landingSlug`. La landing se publica como HTML en almacenamiento local. El documento Canvas de carta se publica por separado.

## Guardado y publicación

1. La página administrativa carga el estado del restaurante y el contenido inicial mediante `landingManagement`. `landing-workspace.ts` conserva bloques, estado de UI, historial y versiones de edición en el cliente.
2. Las herramientas de editor convierten las interacciones del lienzo en comandos de documento. El inspector y el árbol de capas editan los bloques. El editor Monaco permite modificar HTML, CSS y JavaScript.
3. `saveLandingDraftAction` valida el contexto y guarda el documento visual y fuentes en `LandingPage`. `publishLandingAction` llama al caso de uso, que compila el contenido con contexto y URLs del restaurante. El repositorio actualiza el estado publicado y escribe `index.html`, `style.css` y `script.js` en el almacenamiento de la landing.
4. La página pública llama a `getPublicLanding`. El resultado distingue restaurante inexistente, deshabilitado, en preparación y listo. Para una landing lista, el lector usa el HTML publicado, aplica las adaptaciones de runtime reconocidas y lo entrega al visor. Si la base marca la landing como publicada y falta el HTML en storage, el caso de uso recompila desde las fuentes SQL disponibles y vuelve a escribir la publicación. Revisá ese camino si cambiás la recuperación de archivos.

## Piezas por trabajo

| Si cambiás… | Dónde se decide |
| --- | --- |
| Formato de documento, bloque, tema o módulo | `contracts.ts`, `domain/landing-module-catalog.ts` y `presentation/landing-studio-catalog.ts`. |
| Compilación y URLs públicas | `domain/landing-compiler.ts`, `landing-route-context.ts` y `landing-asset-urls.ts`. |
| Lienzo, selección y sincronización de vista | `LandingCanvas.tsx`, `useLandingCanvasBridge.ts`, `landing-canvas-port.ts` y `landing-document-commands.ts` en presentación. |
| Código, paneles y propiedades | `MonacoLandingEditor.tsx`, `LandingCodeDrawer.tsx`, `LandingInspector*.tsx`, `LandingLayersPanel.tsx` y `LandingLayerTree.tsx`. |
| Medios, módulos y diálogos | `LandingMedia*`, `LandingModuleDialog.tsx` y `LandingTemplateDialogs.tsx`. |
| Presets, importación y moderación | `domain/landing-template-presets.ts`, `landing-template-bundle.ts`, `application/landing-use-cases.ts` y `LandingTemplateModerationPanel.tsx`. |
| Lectura pública o escritura de base y archivos | `application/landing-use-cases.ts`, `application/ports.ts`, `infrastructure/prisma-landing-repository.ts` y `PublicLandingViewer.tsx`. |

## Integración de reservas

`published-reservation-runtime.ts` distingue el código de widgets administrados que reconoce y adapta. Esto permite corregir su integración en lectura sin publicar el borrador ni reemplazar código personalizado. `getReservationRuntimeCompatibility` informa si la publicación existente permite activar salones. La disponibilidad y las solicitudes se ejecutan en `reservation-management` por las rutas de reservas públicas bajo `/api/public/landing/[slug]`.

[Módulo](../../src/modules/landing-management/) · [Acciones](../../src/modules/landing-management/presentation/actions.ts) · [Ruta pública](../../src/app/l/[slug]/page.tsx) · [Reservas](reservation-management.md) · [Pruebas de runtime](../../tests/integration/published-reservation-runtime.test.ts)
