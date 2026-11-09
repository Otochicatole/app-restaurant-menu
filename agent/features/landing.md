# Landing

La landing es el sitio público de un restaurante. El editor combina un documento visual, módulos reutilizables, plantillas y código HTML, CSS y JavaScript. La página publicada se sirve por el slug de landing y puede incorporar la carta, el formulario de reservas y los eventos.

| Entrada | Uso |
| --- | --- |
| `/admin/restaurants/[restaurantId]/landing` | Editor de la landing. |
| `/superadmin/clients/[id]/restaurants/[restaurantId]/landing` | Entrada del superadmin al editor. |
| `/l/[slug]` | Sitio público. Puede mostrar preparación o responder como no disponible según el estado. |
| `/api/public/landing/[slug]/assets/[id]/file` | Medios de la landing. |
| `/api/public/landing/[slug]/reservations/…` | Integración pública con reservas y eventos. |

## Operaciones de diseño y publicación

| Acción | Flujo y resultado |
| --- | --- |
| Editar un bloque | La selección del lienzo o del árbol abre el inspector. Los cambios de contenido o estilo se traducen a comandos de documento y quedan en el historial del workspace. |
| Editar HTML, CSS o JavaScript | El panel Monaco edita las fuentes que se guardan con el documento. El lienzo y la compilación usan esas fuentes según el modo de edición. |
| Guardar borrador | `saveLandingDraftAction` valida acceso y guarda documento y fuentes en `LandingPage`. La página pública sigue leyendo los archivos de la última publicación. |
| Publicar | `publishLandingAction` compila con URLs del restaurante y escribe el HTML, CSS y JS publicados. `/l/[slug]` resuelve el restaurante y el visor muestra el HTML de storage en un iframe. |
| Reutilizar diseño | Los módulos personalizados representan bloques reutilizables del restaurante. Las plantillas representan diseños de landing. Las acciones contemplan plantillas privadas, paquetes para importar/exportar y moderación. |
| Usar reservas desde una publicación | El runtime identifica el widget administrado, le asigna las rutas públicas y conserva el resto del código. Una publicación con integración incompatible se señala al configurar salones. |

## Reglas que preservar

- `LandingPage` guarda el borrador visual y las fuentes de código en SQL. Publicar compila el documento y escribe los archivos de publicación en storage. La lectura pública usa el HTML publicado. Guardar el borrador y publicar tienen efectos distintos.
- El editor y sus acciones pertenecen a `landing-management`. Los modelos `LandingCustomModule` y `LandingTemplate` respaldan los módulos y plantillas que se insertan o aplican en el editor. Los medios se resuelven dentro del restaurante.
- El runtime de reservas adapta publicaciones previas al leerlas solo cuando reconoce el código generado. Conservá el código personalizado y el borrador. Al activar salones, una integración publicada incompatible requiere actualización. Los widgets administrados consultan con la cantidad de personas elegida. [Reservas](reservas.md) · [Salones](salones.md)
- Si cambiás eliminación de medios, revisá sus usos tanto en el borrador como en el HTML publicado en storage. [Datos y operación](../datos-y-operacion.md)

## Dónde mirar

[Entrada del módulo](../../src/modules/landing-management/server.ts) · [Compilador](../../src/modules/landing-management/domain/landing-compiler.ts) · [Publicación y almacenamiento](../../src/modules/landing-management/infrastructure/prisma-landing-repository.ts) · [Runtime publicado](../../src/modules/landing-management/domain/published-reservation-runtime.ts) · [Estado del editor](../../src/modules/landing-management/presentation/landing-workspace.ts)

Pruebas para compilación, adaptación de publicaciones y widgets administrados. [Compilador](../../src/modules/landing-management/domain/landing-compiler.test.ts) · [Runtime publicado](../../tests/integration/published-reservation-runtime.test.ts) · [Widget administrado](../../tests/integration/managed-reservation-widget.test.ts)

Mapa de editor, compilación y almacenamiento. [Módulo de landing](../modules/landing-management.md)
