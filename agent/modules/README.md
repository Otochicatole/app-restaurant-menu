# Mapa de módulos

Cada ficha describe qué recibe el módulo, qué decide, dónde persiste sus cambios y qué archivo conviene abrir para modificar una conducta. Las [fichas por función](../README.md#qué-leer-según-la-tarea) muestran cómo se combinan varios módulos en un mismo recorrido.

| Módulo | Responsabilidad | Ficha |
| --- | --- | --- |
| `identity-access` | Identificar al actor, administrar sesiones y verificar credenciales. | [Identidad](identity-access.md) |
| `organization-management` | Administrar organizaciones, cupos y estado de restaurantes desde superadministración. | [Organizaciones](organization-management.md) |
| `restaurant-management` | Seleccionar y administrar restaurantes propios y autorizar recursos por ID. | [Restaurantes](restaurant-management.md) |
| `menu-editor` | Editar y publicar la carta, administrar archivos y operar plantillas. | [Editor de carta](menu-editor.md) |
| `public-menu` | Resolver el slug de la carta y representar únicamente el documento público. | [Carta pública](public-menu.md) |
| `landing-management` | Diseñar, compilar, publicar y servir la landing. | [Landing](landing-management.md) |
| `reservation-management` | Resolver agenda, disponibilidad, eventos, asignaciones transaccionales y servicio de mesa. | [Reservas y servicio](reservation-management.md) |
| `floor-management` | Configurar y representar salones, calcular geometría e intervalos y coordinar el tablero operativo. | [Salones](floor-management.md) |

En el checkout inspeccionado, `admin-dashboard`, `catalog`, `menu-customization` y `merchandising` son directorios vacíos de `src/modules/`. La carpeta `src/features/tenants/` también contiene solo directorios vacíos. No representan funcionalidades implementadas. El catálogo de productos de servicio pertenece a `reservation-management`. La personalización de la carta pertenece a `menu-editor`. Estos directorios vacíos pueden faltar en un checkout nuevo porque Git no registra directorios sin archivos.
