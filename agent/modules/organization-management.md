# organization-management

Este módulo se usa desde `/superadmin/clients`. Administra el ciclo de vida de la organización, la cuenta administrativa inicial, el máximo de restaurantes y las opciones de cada restaurante. Sus mutaciones pasan por Server Actions que requieren superadmin.

| Operación | Qué sucede |
| --- | --- |
| Crear | El contrato valida identidad, email y nombre del primer restaurante. El caso de uso genera y hashea una contraseña temporal. El repositorio crea la organización, la cuenta administrativa con cambio de contraseña pendiente, el primer restaurante y su borrador de carta. |
| Editar | Actualiza nombre, cupo y email de la cuenta. El límite de restaurantes no puede quedar por debajo de la cantidad existente. Si cambia el email, el repositorio revoca las sesiones de esa cuenta. |
| Suspender o activar | Cambia el estado de organización que leen los guards y las publicaciones. Al suspender, revoca las sesiones de su administrador. |
| Restablecer acceso | Genera otra contraseña temporal, persiste el hash y revoca las sesiones de la cuenta. |
| Cambiar opciones de restaurante | La acción valida la pertenencia del restaurante antes de cambiar los flags, estado o cuota del recurso. |
| Eliminar organización | Confirma el slug, valida los vínculos con historial de servicio y caja y programa la limpieza de medios después de la eliminación lógica de sus registros. |

`OrganizationManager.tsx` concentra el listado y los formularios de superadministración. `presentation/actions.ts` valida el rol, traduce FormData y revalida las pantallas. `application/organization-use-cases.ts` define el puerto de persistencia y aplica la política de cupo. `infrastructure/prisma-organization-repository.ts` ejecuta las operaciones sobre `Organization`, `Admin`, `Restaurant` y las referencias necesarias. `infrastructure/composition.ts` conecta la implementación, la generación de contraseñas y el hashing.

Una suspensión de organización afecta a todos sus restaurantes. El estado individual del restaurante se usa para limitar el efecto a un local. El módulo de selección y autorización individual está en la ficha de restaurantes. [Módulo](../../src/modules/organization-management/) · [Restaurantes](restaurant-management.md) · [Pruebas de superadministración](../../tests/e2e/superadmin.spec.ts)
