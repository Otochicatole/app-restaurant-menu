# Acceso y restaurantes

Una organización administra uno o varios restaurantes. Cada restaurante es el ámbito de autorización para las operaciones sobre carta, landing, reservas, salón y caja. La administración global gestiona organizaciones, límites y habilitaciones. La cuenta compartida de sala pertenece a un restaurante y tiene permisos operativos propios.

| Entrada | Uso |
| --- | --- |
| `/admin/login` y `/api/auth` | Acceso común a administración y sala. |
| `/admin/account` | Perfil, email y contraseña. |
| `/admin/restaurants` y `/admin/restaurants/[restaurantId]` | Selector y espacio del restaurante. |
| `/superadmin` y `/superadmin/clients` | Administración de organizaciones y restaurantes. |
| `/floor` | Tablero del restaurante vinculado a la cuenta de sala. |

## Qué pasa en cada recorrido

| Acción | Entrada y resultado |
| --- | --- |
| Iniciar sesión | `POST /api/auth` recibe email y contraseña. La API aplica CSRF, limita intentos y devuelve rol, organización y estado de cambio de contraseña. El formulario usa esos datos para dirigir a cuenta, CMS, sala o superadministración. |
| Consultar o cerrar la sesión | `GET /api/auth` devuelve la vista de sesión o `null`. `DELETE /api/auth` revoca la sesión y elimina la selección anterior de restaurante. |
| Cambiar datos de cuenta | `GET/PATCH /api/account/profile` consulta o cambia el nombre de la organización y el email de su administrador. Cambiar el email exige la contraseña actual. `POST /api/account/password` aplica el cambio de contraseña. Las páginas de cuenta están en `/admin/account` y `/admin/account/password`. |
| Aprovisionar una organización | Superadmin crea la organización con administrador temporal, primer restaurante y borrador de carta. Al restablecer la contraseña revoca las sesiones vigentes y exige cambiarla en el próximo ingreso. |
| Crear o elegir otro restaurante | El selector carga el cupo de la organización. Crear valida el cupo en base y crea su borrador inicial. Elegir escribe una preferencia en la cookie y abre el editor de ese restaurante. |
| Configurar URLs públicas y descripción | `GET/PATCH /api/restaurants/[restaurantId]/profile` valida el contexto y trabaja sobre el perfil de carta. El endpoint anterior `/api/account/restaurant-profile` devuelve 410 y pide abrir un restaurante. |
| Dar o quitar acceso de sala | El editor de salones administra la cuenta `WAITER` por restaurante. Cambiar sus credenciales revoca sesiones anteriores. El login dirige al tablero vinculado. |

## Reglas que preservar

- `identity-access` valida credenciales, aplica limitación de intentos y resuelve el actor a partir de la sesión. Los roles persistidos son `SUPER_ADMIN`, `TENANT_ADMIN` y `WAITER`. Los guards también aplican el cambio obligatorio de contraseña donde corresponde.
- El selector recuerda el último restaurante en una cookie. Cada lectura o escritura privada valida el `restaurantId` explícito contra el actor mediante `requireRestaurantContext` o un guard específico. El acceso de superadmin al contexto de un restaurante depende de que el flujo lo habilite.
- Suspender una organización deshabilita sus restaurantes. Suspender un restaurante solo afecta a ese restaurante. Las consultas públicas también comprueban esos estados.
- La cuenta de sala accede mediante `requireFloorReadAccess`. Puede atender visitas, gestionar inventario y reacomodar mesas dentro de sus permisos. La configuración de salones y sectores queda en administración. Las vistas de sala limitan los datos de reserva a lo necesario para operar.
- Las escrituras por API aplican la protección CSRF donde corresponde. La validación del token en el proxy es una primera barrera. La autorización por recurso se aplica en el servidor.

## Dónde mirar

Los modelos son `Admin`, `Session`, `LoginThrottle`, `Organization` y `Restaurant`. Los módulos responsables son `identity-access`, `organization-management`, `restaurant-management` y, para el acceso de sala, `floor-management`.

[Identidad](../../src/modules/identity-access/server.ts) · [Organizaciones](../../src/modules/organization-management/server.ts) · [Contexto de restaurante](../../src/modules/restaurant-management/presentation/restaurant-context.ts) · [Acceso a sala](../../src/modules/floor-management/server.ts) · [Proxy](../../src/proxy.ts)

Pruebas para permisos, aislamiento y navegación. [Identidad](../../src/modules/identity-access/application/identity-access.test.ts) · [Aislamiento](../../tests/integration/tenant-isolation.test.ts) · [Redirecciones](../../tests/integration/route-redirects.test.ts)

Continuá con [Salones](salones.md) y [Servicio y caja](servicio-y-caja.md) para los permisos operativos.

Desglose de implementación por módulo. [Identidad](../modules/identity-access.md) · [Organizaciones](../modules/organization-management.md) · [Restaurantes](../modules/restaurant-management.md)
