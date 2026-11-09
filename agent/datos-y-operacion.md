# Datos y operación

SQLite se ejecuta en un único host con WAL. Prisma usa el adaptador libSQL y el almacenamiento de archivos es local y persistente. La organización agrupa restaurantes. Cada restaurante tiene sus propias cartas, biblioteca, landing, reservas, salones y cuentas de servicio. Los presets y las plantillas públicas aprobadas se comparten según las reglas de cada editor.

| Datos | Modelos principales |
| --- | --- |
| Acceso y ámbito | `Admin`, `Session`, `LoginThrottle`, `Organization`, `Restaurant` |
| Contenido y medios | `MenuProject`, `MenuAsset`, `MenuAssetReference`, `MenuTemplate`, `LandingPage`, `LandingCustomModule`, `LandingTemplate`, `AssetCleanupJob` |
| Agenda y asignaciones | `ReservationTimeSlot`, `ReservationRecurringClosure`, `ReservationBlockedDate`, `RestaurantEvent`, `TableReservation`, `DiningRoom`, `DiningRoomLocation`, `DiningTable`, `ReservationAllocation`, `ReservationAllocationTable` |
| Pedidos y caja | `ServiceProduct`, `ServiceAccount`, `ServiceAccountTable`, `ServiceOrderLine`, `ServiceCashEvent` |

## Invariantes de persistencia

- Delimitá las lecturas y escrituras por restaurante. Conservá las claves foráneas compuestas, los `CHECK`, la collation de email sin distinción de mayúsculas y los índices especiales del SQL al reconstruir tablas. Prisma no representa todas esas restricciones en su esquema.
- Validá las cuotas, el aforo y la asignación en la transacción que aplica el cambio. Usá las revisiones esperadas donde el contrato las define. El wrapper de SQLite permite hasta tres intentos ante contención transitoria.
- Los medios de la biblioteca del restaurante se aíslan por clave de almacenamiento. La cuota considera archivos nuevos después de deduplicar cuando corresponde. La limpieza de archivos reemplazados o eliminados se encola después de confirmar la base.
- El guard de referencias de archivos cubre cartas y plantillas privadas de carta. La protección de referencias de landings debe considerar tanto el borrador SQL como la publicación en storage. Revisá ambos lugares antes de tocar esa limpieza.

[Esquema Prisma](../prisma/schema.prisma) · [Migraciones SQL](../prisma/migrations/) · [Transacciones](../src/platform/database/sqlite-transaction.ts) · [Almacenamiento](../src/platform/storage/)

## Preparación y despliegue

La versión actual usa **generación 5**. `app-schema-generation` declara la generación esperada y `AppSchemaState` registra la generación y el estado de la base. El arranque exige una base compatible en estado `READY` con WAL. La migración de Servicio y Caja agrega las cuentas, los pedidos, los recibos, los cierres y la liberación por mesa.

En desarrollo, la actualización de una base existente usa `bun run db:cutover` con el servidor detenido. El procedimiento valida los datos, crea un backup SQLite consistente que incluye los cambios confirmados en WAL, aplica migraciones, ejecuta el backfill cuando corresponde y regenera Prisma Client. En producción, el flujo coordinado de `redeploy.sh` administra el backup, la compatibilidad de generación y la activación del release. Consultá el runbook antes de operar una base existente. Para experimentos y verificaciones usá una [base descartable](verificacion.md).

La plantilla de configuración documenta `DATABASE_URL`, `TEST_DATABASE_URL`, `STORAGE_ROOT`, `APP_URL`, `JWT_SECRET`, `TRUST_PROXY` y las variables de aprovisionamiento. En producción, la base y el storage usan rutas absolutas persistentes fuera del directorio de cada release.

[Configuración de ejemplo](../.env.example) · [Generación esperada](../app-schema-generation) · [Guard de arranque](../scripts/assert-schema-ready.ts) · [Migración de Servicio](../prisma/migrations/20261109120000_table_service/migration.sql) · [Runbook de despliegue](../README.md#despliegue)

## Para qué sirve cada grupo de scripts

| Script | Responsabilidad |
| --- | --- |
| `assert-schema-ready.ts` y `configure-sqlite-wal.ts` | Comprueban compatibilidad antes del arranque y configuran el modo WAL en preparación de base. |
| `schema-hardening-preflight.ts` y `sqlite-backup.ts` | Detectan datos incompatibles y crean un snapshot consistente verificado antes de cambios de esquema. |
| `db-cutover.ts`, `cutover-menu-editor.ts` y `cutover-organizations.ts` | Coordinan el pase de esquemas anteriores, la conversión de contenido Canvas y el backfill por organización y restaurante. |
| `migrate-development.ts` y `deploy-local.ts` | Ejecutan los flujos de migración para desarrollo y preparación de despliegue local. |
| `drain-asset-cleanup.ts` | Procesa la cola de limpieza física y deja los fallos disponibles para reintento. |
| `require-test-database.ts`, `run-ci-checks.ts` y `verify-*.ts` | Preparan bases descartables y verifican migraciones, compatibilidad e integración. |
| `scripts/deploy/` | Administra releases, servicios, backup, migración y rollback. La activación se coordina con la generación de la base y el health check. |

[Scripts](../scripts/) · [Verificación](verificacion.md)
