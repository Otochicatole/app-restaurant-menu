# Plataforma y UI compartida

## Infraestructura

| Pieza dentro de `src/platform/` | Qué resuelve |
| --- | --- |
| `config/server-env.ts` y `config/sqlite-url.ts` | Validan configuración de servidor y rutas SQLite locales. El primero concentra acceso a variables como `APP_URL` y `TRUST_PROXY`. |
| `database/prisma.ts` y `database/sqlite-client.ts` | Exponen Prisma y construyen clientes con adaptador libSQL para la app y bases descartables. |
| `database/sqlite-transaction.ts` | Reintenta la transacción completa ante contención SQLite. Cada intento lee de nuevo las reglas de cuota u ocupación que aplica la operación. |
| `storage/blob-store.ts`, `storage/local-blob-store.ts` y `storage/index.ts` | Definen operaciones de medios, las implementan sobre disco y exponen el almacenamiento configurado. |
| `storage/asset-cleanup-queue.ts` | Encola archivos o prefijos que se pueden eliminar después de confirmar cambios de base. El worker reclama trabajos y permite volver a intentar los que fallan. |
| `application/errors.ts` y `application/action-result.ts` | Errores de aplicación y resultados para Server Actions. Permiten conservar código y mensaje para la UI. |
| `http/api-response.ts` | Envoltorio JSON `{ success, data }` o `{ success, error }`. Mapea errores de aplicación, Zod y JSON inválido a códigos HTTP. Un conflicto de revisión devuelve 409. Un error desconocido se registra y responde como 500. |
| `http/media-response.ts` | Construye respuestas de archivo y rango para medios. La autorización del archivo pertenece al handler y al módulo dueño. |
| `security/csrf.ts` | Comprueba origen en las escrituras que lo usan. Rechaza `sec-fetch-site: cross-site` y compara el origen contra la configuración. |
| `logging/logger.ts` | Punto común de logging de servidor. |
| `health/readiness.ts` | Verifica tablas requeridas y generación `READY`, y prueba escritura en storage con un archivo temporal que elimina al finalizar. `GET /api/health` responde 200 o 503. |

[Plataforma](../src/platform/) · [Endpoint de readiness](../src/app/api/health/route.ts) · [Datos y operación](datos-y-operacion.md)

## Interfaz

| Pieza dentro de `src/ui/` | Qué resuelve |
| --- | --- |
| `admin/AdminShell.tsx` | Navegación de administración, accesos del restaurante y composición de contenido. |
| `admin/AdminNavigationGuard.tsx` | Registro de guards de navegación para advertir sobre cambios pendientes. |
| `admin/AdminPrimitives.tsx` y `admin/AdminUI.tsx` | Estilos de controles, cabeceras, tarjetas, estados vacíos y modales con foco y confirmación. |
| `FloatingModalWindow.tsx` | Ventana no modal con límites de viewport, movimiento, redimensionado, minimizado y soporte de teclado. El llamador pasa tamaño inicial e insets según la pantalla. |
| `useFloatingWindows.ts` | Estado de múltiples ventanas, orden de capas, activar una existente, ocultar, cerrar y traer al frente. Una herramienta puede minimizarse sin perder el contenido montado. |
| `editor-workspace.tsx` | Crea un store Redux Toolkit por instancia con semilla de servidor y hooks tipados de lectura/escritura. |
| `MediaModal.tsx` y `button-state.ts` | Visor compartido de medios y props reutilizadas por controles transitorios. |

Los componentes de sala y carta usan Konva para los lienzos. El editor de landing usa Monaco para el código y un puente hacia su vista previa. Los tipos de documento, la geometría y las reglas de negocio se mantienen en sus respectivos módulos.

[UI compartida](../src/ui/) · [Mapa de módulos](modules/README.md)
