# Cartas y publicación

El administrador edita la carta digital del restaurante como un documento Canvas. El editor muestra el borrador y permite editar capas, textos, formas y medios. El visitante abre la versión publicada por el slug de la carta.

| Entrada | Uso |
| --- | --- |
| `/admin/restaurants/[restaurantId]` | Editor de la carta del restaurante. |
| `/api/restaurants/[restaurantId]/editor/…` | Proyecto, publicación, medios y plantillas con restaurante explícito. |
| `/superadmin/templates` | Moderación de plantillas compartidas. |
| `/m/[slug]` | Carta pública. |
| `/api/public/menus/[slug]/assets/[id]/file` | Medios de una carta pública. |

## Operaciones del editor

Las rutas de esta tabla son relativas a `/api/restaurants/[restaurantId]/editor`. El servidor resuelve el proyecto de carta del restaurante autorizado.

| Operación | Petición y efecto |
| --- | --- |
| Leer y guardar proyecto | `GET /project` trae documento y revisiones. `PUT /project` valida `document` y `baseRevision`, guarda el borrador y devuelve el proyecto actualizado. |
| Publicar | `POST /publish` recibe documento y revisión y actualiza la carta visible por slug y sus referencias de medios. |
| Gestionar medios | `GET /assets` lista y permite filtrar por tipo. `POST /assets` carga. `GET /assets/[id]` obtiene metadatos, `GET /assets/[id]/file` sirve contenido privado y `DELETE /assets/[id]` comprueba referencias antes de eliminar. |
| Guardar, editar o moderar plantillas | `GET/POST /templates` lista o crea desde el borrador y permite enviar a moderación. `GET/PATCH/DELETE /templates/[id]` consulta, edita o elimina según permisos. La moderación de plantillas públicas está bajo `/api/superadmin/templates`. |
| Transportar o aplicar una plantilla | `POST /templates/import` importa el paquete, `GET /templates/[id]/export` lo descarga y `POST /templates/[id]/apply` remapea assets y guarda el documento en el borrador usando `baseRevision`. |

Al editar, el lienzo genera cambios que pasan por el historial y el autoguardado. Ante un 409 se conserva la edición local hasta que el usuario recargue o confirme sobrescribir con la revisión actual del servidor. Los medios vinculados a la publicación quedan disponibles aunque el borrador cambie.

## Reglas que preservar

- El esquema vigente tiene un `MenuProject` por restaurante. `draftJson` y `publishedJson` tienen revisiones separadas. Guardar edita el borrador con control de concurrencia. Publicar actualiza la versión que lee el visitante. Una carta de un restaurante activo puede estar en preparación si todavía no se publicó.
- Aplicar una plantilla reemplaza el borrador y se puede deshacer desde el editor. Los presets y las plantillas públicas aprobadas están disponibles según sus reglas de visibilidad. Las plantillas privadas y sus referencias pertenecen a su restaurante.
- Las referencias de medios distinguen borrador y publicación. Las plantillas portables remapean los assets al restaurante de destino. La deduplicación y el cálculo de cuota preceden al registro de archivos nuevos en la misma transacción. [Datos y operación](../datos-y-operacion.md)
- La carta pública consulta por slug de `MenuProject`. La landing tiene su propia ruta y su propio slug. Preservá los contratos públicos al tocar identificadores, archivos o publicaciones. [Landing](landing.md)

## Dónde mirar

`menu-editor` contiene el editor, los casos de uso y el almacenamiento de documentos, assets y plantillas. `public-menu` resuelve el estado de la carta y construye la vista pública a partir del documento publicado. Los modelos relacionados incluyen `MenuAsset`, `MenuAssetReference`, `MenuTemplate`, `MenuTemplateAsset` y `MenuTemplateAssetReference`.

[Editor y plantillas](../../src/modules/menu-editor/server.ts) · [Estado Canvas](../../src/modules/menu-editor/presentation/menu-workspace.ts) · [Lector público](../../src/modules/public-menu/infrastructure/prisma-published-canvas-reader.ts)

Pruebas para borradores, publicación, plantillas y cuota. [Editor](../../src/modules/menu-editor/application/menu-editor-use-cases.test.ts) · [Plantillas](../../src/modules/menu-editor/application/template-use-cases.test.ts) · [Cuota](../../tests/integration/asset-quota.test.ts)

Desglose de renderizado, estado y persistencia. [Editor de carta](../modules/menu-editor.md) · [Carta pública](../modules/public-menu.md)
