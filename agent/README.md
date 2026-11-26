# Contexto del proyecto

La aplicación permite que una organización administre uno o varios restaurantes. Cada restaurante tiene una carta digital, un sitio público, reservas y eventos, un plano operativo de mesas y un flujo de pedidos, cobro y caja. Es un monolito modular en TypeScript con Next.js, React, Bun, Prisma y SQLite.

## Quién usa el sistema

| Persona | Qué hace | Entrada principal |
| --- | --- | --- |
| Visitante | Consulta cartas y landings y solicita reservas según la disponibilidad. | `/m/[slug]`, `/l/[slug]` |
| Administrador de organización | Selecciona un restaurante de su organización y administra sus cartas, landing, reservas, salones, catálogo de servicio y caja. | `/admin/restaurants`, `/admin/restaurants/[restaurantId]` |
| Personal de sala | Consulta y acomoda mesas, recibe grupos, carga pedidos y registra cobros para el restaurante de su cuenta de sala. | `/floor` |
| Superadministrador | Administra organizaciones, límites y estado de los restaurantes, y modera plantillas. | `/superadmin` |

El acceso al CMS y a sala empieza en `/admin/login`. La cuenta de sala queda vinculada a un restaurante. Los administradores llegan al tablero de un restaurante con `/floor?restaurantId=…`.

## Qué leer según la tarea

Las fichas de función explican el recorrido completo desde la interfaz o API hasta sus efectos. Las fichas de módulo sirven para ubicar un caso de uso, contrato, componente o repositorio antes de editarlo. [Mapa de los ocho módulos](modules/README.md)

| Si vas a trabajar en… | Leé primero |
| --- | --- |
| Organización del código, dependencias, UI compartida o estado | [Arquitectura](arquitectura.md) |
| Errores HTTP, CSRF, almacenamiento, estado compartido o ventanas flotantes | [Plataforma y UI](plataforma-y-ui.md) |
| Prisma, SQLite, archivos, migraciones o despliegue | [Datos y operación](datos-y-operacion.md) |
| Pruebas, lint, tipos, build o preparación de datos de prueba | [Verificación](verificacion.md) |
| Login, roles, aislamiento, organizaciones o selector de restaurante | [Acceso y restaurantes](features/acceso-y-restaurantes.md) |
| Editor Canvas, carta pública, biblioteca o plantillas de carta | [Cartas y publicación](features/cartas-y-publicacion.md) |
| Editor del sitio, módulos, código de la landing o integración publicada de reservas | [Landing](features/landing.md) |
| Agenda, horarios, eventos, disponibilidad o confirmación | [Reservas](features/reservas.md) |
| Plano, sectores, inventario, asignación, visitas o ventanas de sala | [Salones](features/salones.md) |
| Cuentas por mesa, pedidos, recibos, catálogo de servicio o cierres | [Servicio y caja](features/servicio-y-caja.md) |

Si recibís solo `agent/`, las fichas incluyen el flujo, las reglas y los nombres de las piezas para orientarte. Con el repositorio, los enlaces externos a la carpeta llevan a las fuentes. Las rutas que empiezan con `/` son URLs de la aplicación. Los enlaces al código son relativos al archivo Markdown.

Para diagnosticar una conducta, identificá la URL y el rol, leé el recorrido de la función, buscá la pieza responsable en su ficha de módulo y contrastá el contrato con la prueba enlazada. Si la operación cruza módulos, seguí también la regla del segundo módulo, como pasa entre reservas, salones y servicio.

Antes de editar, leé las instrucciones del repositorio y verificá los detalles en la implementación y las pruebas correspondientes. La guía describe el esquema de generación 5. Actualizá la ficha correspondiente si un cambio modifica sus rutas o reglas. [AGENTS.md](../AGENTS.md) · [Contexto de producto](../PRODUCT.md)
