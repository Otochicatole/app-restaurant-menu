# restaurant-management

Este módulo resuelve el contexto de restaurante de los administradores. También implementa el selector, creación y eliminación de restaurantes de una organización.

## Recorridos

- **Cargar el selector.** `getRestaurantWorkspace` obtiene el actor tenant-admin, lee la cookie y llama a `loadRestaurantWorkspace`. El repositorio carga los restaurantes de la organización y calcula la selección y el cupo disponible.
- **Abrir un restaurante.** `selectRestaurantAction` toma el ID explícito, llama a `requireRestaurantContext`, recuerda la selección y redirige a `/admin/restaurants/[restaurantId]`.
- **Autorizar una operación.** `requireRestaurantContext` resuelve actor, restaurante y organización y delega en `assertRestaurantAccess`. Para tenant-admin comprueba pertenencia, estados y cambio de contraseña pendiente. El llamador puede habilitar explícitamente el acceso de superadmin. La cookie no concede permisos.
- **Crear.** `createRestaurantAction` valida el nombre y el slug. El repositorio comprueba el estado y cupo dentro de la transacción y crea el restaurante con su proyecto de carta inicial. La acción lo selecciona y redirige.
- **Eliminar.** La acción verifica la contraseña actual, determina los IDs de la organización y llama al repositorio. El repositorio protege el historial de servicio y caja. Los archivos se limpian mediante la cola compartida. La acción borra la selección y revalida vistas privadas y públicas.

| Pieza | Responsabilidad |
| --- | --- |
| `contracts.ts` | Comandos y vistas del selector, datos del restaurante y contexto autorizado. |
| `application/restaurant-policy.ts` | Política pura de acceso por actor, pertenencia, estado y permiso del llamador. |
| `presentation/restaurant-context.ts` | Lee actor y registros antes de ejecutar la política. |
| `presentation/RestaurantPickerScreen.tsx` y `presentation/actions.ts` | Listado, creación, confirmación de borrado y acciones del selector. |
| `infrastructure/prisma-restaurant-repository.ts` | Consultas de workspace, creación con carta y borrado delimitado por organización. |
| `infrastructure/active-restaurant-cookie.ts` | Preferencia de navegación utilizada por el selector. |

El perfil que consume la carta se administra desde el endpoint de perfil de restaurante, que autoriza con este módulo y delega la edición del proyecto al editor de carta. [Módulo](../../src/modules/restaurant-management/) · [Perfil por restaurante](../../src/app/api/restaurants/[restaurantId]/profile/route.ts) · [Pruebas de aislamiento](../../tests/integration/tenant-isolation.test.ts)
