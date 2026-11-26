# Arquitectura

El proyecto usa el App Router de Next.js y organiza el negocio en módulos dentro del mismo proceso. Las páginas, los Route Handlers y las acciones conectan la interfaz con los casos de uso. Las reglas de negocio y el acceso a datos viven detrás de los contratos de cada módulo.

| Ubicación | Responsabilidad |
| --- | --- |
| `src/app/` | Layouts, páginas, Route Handlers y composición HTTP. Resuelve parámetros, llama a los guards y usa los puntos de entrada de los módulos. |
| `src/modules/` | Capacidades de negocio. `domain/` contiene reglas puras, `application/` casos de uso y puertos, `infrastructure/` adaptadores y persistencia, y `presentation/` vistas, formularios, estado y Server Actions según el módulo. |
| `src/platform/` | Infraestructura compartida de base de datos, almacenamiento, configuración, seguridad, HTTP, logging y readiness. |
| `src/ui/` | Primitivas visuales compartidas, shell de administración, ventanas flotantes y soporte de estado de editor. La UI específica de una función vive con su módulo. |
| `src/generated/` | Prisma Client generado desde el esquema. |

El flujo habitual es `ruta o acción → contrato y autorización → caso de uso → persistencia → respuesta`. Usá `contracts.ts` para tipos y esquemas compartidos, `server.ts` para composición y operaciones de servidor, y `ui.ts` para las vistas que consume otra capa. Algunos módulos usan únicamente los puntos de entrada que necesitan.

## Límites que verifica el repositorio

- Dependency-cruiser aplica límites de importación específicos a `identity-access`, `organization-management`, `restaurant-management`, `menu-editor`, `public-menu`, `landing-management`, `reservation-management` y `floor-management`. [Índice de flujos](README.md)
- Las rutas y otros módulos importan los puntos de entrada públicos. Las capas internas permanecen privadas. Dominio y aplicación se mantienen independientes de Next.js, React, Prisma y los adaptadores técnicos. La plataforma permanece independiente del negocio y el grafo evita ciclos.
- En el checkout inspeccionado, `admin-dashboard`, `catalog`, `menu-customization` y `merchandising` son directorios vacíos de `src/modules/`. Para ubicar un flujo vigente, partí de la ruta y seguí sus imports. [Mapa de módulos](modules/README.md)

[Reglas de dependencias](../dependency-cruiser.cjs) · [Rutas](../src/app/) · [Módulos](../src/modules/) · [Plataforma](../src/platform/) · [UI compartida](../src/ui/)

## Estado de interfaz

Carta, landing, reservas y salones usan espacios de trabajo Redux Toolkit. Cada instancia montada tiene un store y una semilla inicial. El ámbito de montaje depende del editor y puede incluir el restaurante, el proyecto o los permisos. Revisá su `*workspace.ts` antes de mover estado entre componentes. Las revisiones, los permisos y los datos persistidos se validan en servidor. Los gestos de arrastre y redimensionado de ventanas se gestionan en la UI compartida.

Antes de cambiar una ruta o un componente Next.js, consultá la guía de la versión instalada en `node_modules/next/dist/docs/` según `AGENTS.md`. `package.json` fija las versiones y define los scripts. [Store por instancia](../src/ui/editor-workspace.tsx) · [Ventanas flotantes](../src/ui/FloatingModalWindow.tsx) · [AGENTS.md](../AGENTS.md) · [Package](../package.json)

## Rutas de entrada y compatibilidad

- La portada `/` presenta la plataforma y dirige al login. Las landings de cada restaurante tienen su propia entrada por slug. Los layouts de administración separan autenticación, cuenta y áreas protegidas. El layout del restaurante aporta el contexto del shell. Los segmentos entre paréntesis agrupan layouts y no forman parte de la URL.
- `next.config.ts` redirige segmentos anteriores en español a sus equivalentes en inglés, como `/sala` a `/floor`. Las rutas retiradas de `src/app/api/editor/` devuelven 410 con `RESTAURANT_REQUIRED`. La API vigente del editor exige el ID en `/api/restaurants/[restaurantId]/editor`.
- `src/proxy.ts` agrega headers de seguridad y verifica la cookie en las áreas privadas. Los endpoints privados y las Server Actions aplican autorización sobre el recurso que reciben. Las rutas públicas resuelven sus datos por slug.

[Configuración de Next.js](../next.config.ts) · [Proxy](../src/proxy.ts) · [Plataforma y UI](plataforma-y-ui.md) · [Pruebas de redirecciones](../tests/integration/route-redirects.test.ts)
