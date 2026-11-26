# menu-editor

Es dueño del documento Canvas de la carta, sus revisiones, los medios del restaurante y las plantillas de carta. El contrato `CanvasDocumentV1` contiene versión, límites, vista inicial, fondo, nodos y grupos. El proyecto persistido tiene un borrador editable y un documento publicado. El consumo público vive en `public-menu`.

## Del lienzo al almacenamiento

1. La página del restaurante autoriza el contexto y usa `requireActiveMenuProject`. Carga proyecto, assets y plantillas antes de montar `CanvasEditor`.
2. `CanvasEditor` coordina herramientas, biblioteca y las operaciones de revisión. `menu-workspace.ts` guarda documento, selección, deshacer/rehacer, estado de edición pendiente, revisión y la operación en curso. El autoguardado espera 800 ms desde el último cambio si la edición está pendiente y no hay conflicto ni otra operación.
3. `GET /editor/project` lee el proyecto, `PUT /editor/project` guarda el borrador y `POST /editor/publish` publica. Esas rutas están bajo `/api/restaurants/[restaurantId]` y resuelven el proyecto autorizado. Guardar y publicar envían `document` y `baseRevision`. El caso de uso valida el documento y el tipo y pertenencia de cada asset. El repositorio aplica la escritura y actualiza las referencias con control de revisión.
4. Una revisión obsoleta genera un conflicto 409. El editor detiene el autoguardado y ofrece recargar o confirmar sobrescritura usando la revisión del servidor. Publicar actualiza el documento público, su revisión y los vínculos de assets publicados.

## Piezas del editor

| Archivos o grupo | Qué hace |
| --- | --- |
| `contracts.ts` y `domain/document-policy.ts` | Formato de nodos y grupos, normalización de documentos anteriores, validación y extracción de referencias de assets. |
| `domain/layer-tree.ts`, `node-placement.ts`, `canvas-clipboard.ts` | Jerarquía de capas y grupos, inserción de nodos y copiado con remapeo de identidades. |
| `domain/canvas-geometry.ts`, `canvas-smart-guides.ts`, `rectangle-fill.ts`, `rectangle-border.ts` | Cálculos de geometría, ajuste a guías y representación de rellenos y bordes. |
| `presentation/KonvaCanvas.tsx` y `ui/CanvasStage.tsx` | Interacción con el lienzo en edición y renderizado de los nodos. |
| `presentation/CanvasInspector.tsx`, `LayersPanel.tsx`, `EditorToolsPanel.tsx` | Propiedades de nodos, orden y grupos, herramientas de inserción. |
| `presentation/MediaSelectorModal.tsx`, `FontLibraryClient.tsx`, `RestaurantProfileForm.tsx` | Biblioteca de imágenes, videos y fuentes, y edición de nombre, descripción y URLs públicas. |
| `application/menu-editor-use-cases.ts` y `application/ports.ts` | Orquestan proyecto, validación de assets, guardado, publicación y perfil sobre el puerto de persistencia. |
| `infrastructure/active-menu.ts`, `prisma-menu-editor-repository.ts`, `asset-quota.ts` | Resuelven el proyecto, guardan documentos y referencias y comprueban el espacio de archivos. |

## Plantillas y medios

`template-use-cases.ts` administra plantillas privadas, envíos públicos, exportación, importación, aplicación y moderación. `template.ts` y `template-presets.ts` construyen presets. `template-bundle.ts` serializa y valida el formato portable. `prisma-template-repository.ts` persiste plantillas y remapea IDs de medios al importar o aplicar. Una plantilla aplicada modifica el borrador. Su aplicación se incorpora al historial del editor y deja la publicación vigente para una publicación explícita.

La cuota se comprueba en la misma transacción que registra los assets. En plantillas se reutilizan coincidencias por tipo, MIME y checksum. Al eliminar un asset se comprueban referencias que lo mantienen en uso y se encola su limpieza física. Los tipos de archivo se validan según el nodo que los referencia. Un texto con fuente, un fondo de rectángulo y un modal multimedia tienen reglas distintas.

[Módulo](../../src/modules/menu-editor/) · [Contratos Canvas](../../src/modules/menu-editor/contracts.ts) · [Rutas del editor](../../src/app/api/restaurants/[restaurantId]/editor/) · [Carta pública](public-menu.md) · [Pruebas de revisiones en UI](../../src/modules/menu-editor/presentation/menu-workspace.test.ts)
