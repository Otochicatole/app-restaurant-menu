# public-menu

Es el módulo de lectura y renderizado de la carta pública. Se apoya en el documento publicado por `menu-editor` y lo sirve en `/m/[slug]`. El slug de la carta se busca en `MenuProject`.

1. La ruta consulta el estado y los metadatos públicos. El lector exige restaurante y organización activos. Un proyecto sin versión publicada muestra una pantalla de preparación. Si no hay un proyecto visible, la ruta responde como no encontrado.
2. `getPublishedCanvasBySlug` toma `publishedJson`, valida el documento con el contrato Canvas y reúne IDs de imágenes, fuentes, medios de modal y fondos. Busca los assets dentro del restaurante y entrega un mapa con URLs públicas.
3. `PublicCanvasScreen` presenta la carta y `PublicCanvasStage` dibuja el documento. Reutilizan componentes y reglas de renderizado del editor para mantener correspondencia entre edición y publicación.
4. `GET /api/public/menus/[slug]/assets/[id]/file` vuelve a resolver el slug y usa las referencias publicadas para autorizar el archivo. El handler de medios construye la respuesta de entrega.

| Pieza | Responsabilidad |
| --- | --- |
| `contracts.ts` | Forma de la carta pública y metadatos de sus medios. |
| `server.ts` | Expone estado, metadata, resolución de slug y lectura publicada. |
| `infrastructure/prisma-published-canvas-reader.ts` | Lee la versión publicada y compone el mapa de assets del restaurante. |
| `ui.ts` y `ui/PublicCanvas*.tsx` | Exponen y representan la vista pública. |

La publicación se genera en el módulo de edición. La landing es una superficie pública distinta, con otro slug y almacenamiento propio. [Módulo](../../src/modules/public-menu/) · [Ruta de carta](../../src/app/m/[slug]/page.tsx) · [Archivo público](../../src/app/api/public/menus/[slug]/assets/[id]/file/route.ts) · [Editor de carta](menu-editor.md) · [Landing](landing-management.md)
