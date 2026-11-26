# identity-access

Este módulo convierte credenciales o una cookie de sesión en un actor de servidor. Distingue `SuperAdminActor`, `TenantAdminActor` y `WaiterActor`. El actor determina qué operaciones puede intentar la cuenta. La pertenencia al restaurante se verifica después en el módulo dueño del recurso.

## Flujo de autenticación

1. `POST /api/auth` valida el origen y el contrato de login, arma la clave de limitación con email y origen de conexión y llama a `login`. Los headers reenviados se usan para obtener la IP solo con `TRUST_PROXY`.
2. El caso de uso consulta la limitación de intentos y la cuenta, verifica la contraseña con bcrypt y valida que el actor se pueda autenticar. Cuando el login tiene éxito, registra la sesión y entrega un JWT por cookie. El handler limpia el restaurante seleccionado de la sesión anterior.
3. En una solicitud posterior, el proxy verifica la firma para entrar a las zonas privadas. `getAuthenticatedAccount` vuelve a resolver el actor contra la base, incluyendo vigencia de sesión y estado. `requireAuthenticatedAccount`, `requireTenantAdmin` y `requireSuperAdmin` aplican las condiciones de acceso de cada flujo.
4. `GET /api/auth` devuelve la vista de sesión o `null`. `DELETE /api/auth` revoca la sesión actual y limpia las cookies. El cambio de contraseña invalida las otras sesiones. El email de cuenta se cambia desde el perfil.

## Piezas y responsabilidades

| Archivo dentro del módulo | Qué hace |
| --- | --- |
| `contracts.ts` y `domain/current-actor.ts` | Validan comandos, definen las vistas de respuesta y distinguen el ámbito de cada actor. |
| `domain/session.ts` y `application/ports.ts` | Definen claims y contratos de repositorio, firma, cookies, hashing y limitación. |
| `application/identity-access.ts` | Coordina login, logout, lectura de actor, validación de contraseña y cambios de cuenta. |
| `infrastructure/prisma-identity-repository.ts` | Lee `Admin` y `Session` con el ámbito vigente, registra login y revoca sesiones. |
| `infrastructure/prisma-login-throttle.ts` | Persiste el estado de limitación en `LoginThrottle`. |
| `infrastructure/jose-session-token-service.ts`, `next-session-cookie.ts` y `bcrypt-password-hasher.ts` | Firman y verifican JWT, administran la cookie y comparan hashes. |
| `server.ts`, `ui.ts` y `presentation/` | Publican los guards y formularios de login, perfil, contraseña y cierre de sesión. |

Los permisos de sala se verifican en `floor-management`. Los permisos de administración por restaurante se verifican en `restaurant-management`. Los contratos de error HTTP y CSRF viven en plataforma. [Módulo](../../src/modules/identity-access/) · [API de autenticación](../../src/app/api/auth/route.ts) · [Pruebas de casos de uso](../../src/modules/identity-access/application/identity-access.test.ts)
