# Organizaciones y restaurantes

La aplicación usa SQLite en un único host. Cada cuenta CMS administra una organización con uno o varios restaurantes. Cada restaurante tiene una carta, landing, reservas, eventos, horarios y biblioteca de archivos independientes. El superadministrador gestiona organizaciones, cupos y habilitaciones por restaurante desde `/superadmin`; el login único está en `/admin/login`.

El selector está en `/admin/restaurantes`. Todas las pantallas y APIs privadas incluyen el ID del restaurante: `/admin/restaurantes/[restaurantId]` y `/api/restaurants/[restaurantId]/editor/...`. La cookie recuerda la última selección, pero las operaciones siempre autorizan el restaurante explícito contra la organización autenticada. Cuenta, correo y contraseña se administran en `/admin/account`.

Las URLs públicas siguen en `/m/[slug]` y `/l/[landingSlug]`; ambos slugs pueden ser distintos. Suspender una organización deshabilita todos sus restaurantes. Suspender uno de ellos no afecta a los demás.

## Arquitectura

El código está organizado como monolito modular por capacidades en `src/modules`: `identity-access`, `organization-management`, `restaurant-management`, `menu-editor`, `public-menu`, `landing-management` y `reservation-management`. El contenido gastronómico vive en documentos Canvas versionados; cada módulo publica solamente `contracts.ts`, `server.ts` y, cuando tiene interfaz, `ui.ts`; dominio, aplicación, infraestructura y presentación permanecen privados.

`src/app` es el composition root HTTP/Next.js, `src/platform` contiene adaptadores técnicos y `src/ui` conserva únicamente UI realmente compartida. ESLint y dependency-cruiser bloquean imports profundos, ciclos, dependencias de frameworks en dominio/aplicación y dependencias de plataforma hacia negocio.

## Plantillas Canvas

El editor incluye tres presets globales (Minimalista vertical, Cafetería y Gourmet) y permite guardar el borrador de cada restaurante como plantilla privada. Una plantilla puede enviarse a la comunidad para moderación desde `/superadmin`; sólo las plantillas públicas aprobadas aparecen para otros restaurantes. Las miniaturas se generan desde el documento Canvas y los assets públicos se clonan para mantener el aislamiento entre restaurantes. Aplicar una plantilla reemplaza únicamente el borrador y se puede deshacer; la publicación vigente sólo cambia al pulsar **Publicar**.

## Configuración

Copiá `.env.example` a `.env` y definí `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `APP_URL` y `STORAGE_ROOT`. La contraseña del superadministrador debe tener al menos 8 caracteres y el secreto JWT al menos 32. Dejá `TRUST_PROXY=false` salvo que la aplicación sólo sea accesible detrás de un proxy que sanee los headers reenviados.

SQLite y el storage usan rutas absolutas en producción. Para `APP_RELEASE_ROOT=/opt/app-res`, los valores requeridos son `DATABASE_URL=file:/opt/app-res/shared/database/app.db` y `STORAGE_ROOT=/opt/app-res/shared/storage`. La base nunca debe quedar dentro de `releases/<id>`. `TEST_DATABASE_URL` debe apuntar a otro archivo SQLite descartable y exclusivo para pruebas.

## Desarrollo

```bash
bun install
bun run db:cutover
bun run db:seed
bun run dev
```

En Windows o en un host sin systemd podés preparar el despliegue local con `bun run deploy:local` (SQLite en `storage/app.db`, migraciones, Prisma Client y build) y levantarlo con `bun run deploy:local:start` en el puerto 8201. Los alias `deploy:manual` y `deploy:manual:start` expresan el mismo flujo para un VPS sin releases. Para actualizar un checkout manual con backup, migraciones, build, health-check y reinicio usá `./scripts/deploy/redeploy.sh`. En VPS, `./scripts/deploy/start.sh` y `./scripts/deploy/stop.sh` detectan un checkout manual sin enlace `current` y administran directamente el proceso, su PID, logs y health-check; cuando existe un release systemd usan el servicio configurado.

Operación habitual desde la raíz del proyecto en el VPS, sin variables adicionales:

```bash
./scripts/deploy/start.sh
./scripts/deploy/stop.sh
./scripts/deploy/redeploy.sh
```

`bun run db:seed` es idempotente: crea/actualiza el superadmin definido por `SUPER_ADMIN_EMAIL` y prepara un restaurante Canvas de desarrollo (`Fuzion`, slug `fuzion`) con `admin@fuzion.local` y contraseña `FuzionAdmin2026!`. Podés personalizarlo con `SEED_RESTAURANT_NAME`, `SEED_RESTAURANT_SLUG`, `SEED_RESTAURANT_ADMIN_EMAIL` y `SEED_RESTAURANT_ADMIN_PASSWORD`. También siembra los presets globales Minimalista vertical, Cafetería y Gourmet.

Para una base existente, ejecutá `bun run db:cutover`. Crea un backup, convierte los datos legacy a documentos Canvas, publica la primera versión de cada restaurante, aplica la migración destructiva y regenera Prisma Client.

La verificación rápida es `bun run check`. Para reproducir CI, migrá primero la base de pruebas y ejecutá la verificación completa:

```bash
DATABASE_URL="$TEST_DATABASE_URL" bun x prisma migrate deploy
bun run check:ci
```

`check:ci` exige `TEST_DATABASE_URL`, fuerza que toda la aplicación use ese archivo durante la verificación y ejecuta lint, límites arquitectónicos, typecheck, unitarias, cobertura, integración SQLite, build y Playwright. Playwright usa build limpio, puerto, base y storage dedicados, sin reutilizar servidores.

El almacenamiento actual es local y debe estar en un volumen persistente. Cada restaurante tiene una cuota configurable y sus archivos se guardan bajo `restaurants/[restaurantId]`. Las bibliotecas y plantillas privadas se aíslan por restaurante; el catálogo público aprobado y los presets son globales. Para escalar a varias instancias será necesario migrar a object storage.

## Migración de cuentas existentes

El cambio a organizaciones usa la generación de esquema **2**, registrada en `app-schema-generation` y en `AppSchemaState`. El despliegue coordinado detiene el servicio, crea un backup consistente, aplica SQL y ejecuta `scripts/cutover-organizations.ts` antes de validar el candidato y reabrir tráfico. `db:cutover` y `deploy:local` también respaldan la base existente con `VACUUM INTO` antes de modificarla, incluyendo los datos del WAL. `deploy:local` y la preparación de bases de prueba completan el backfill. En un entorno local, detené el servidor antes de ejecutar `bun run db:cutover` o `bun run deploy:local`; en producción usá el flujo coordinado de `redeploy.sh`.

Cada menú anterior se convierte en restaurante dentro de la organización de su cuenta. El principal recibe la landing histórica, módulos y plantillas de landing, eventos, horarios y reservas; los demás comienzan con esos sistemas vacíos. Se conservan las credenciales, sesiones, documentos, revisiones y URLs públicas. La biblioteca y las plantillas privadas de carta se copian a cada restaurante y se remapean sus referencias, de modo que modificar o eliminar una copia no afecta a otra.

El backfill es reanudable: mientras falta un archivo o una validación no termina, el esquema permanece en `MIGRATING` y readiness rechaza servir tráfico. Los archivos originales se conservan para recuperar el backup previo. No ejecutar limpieza manual de esos originales durante el cutover.

Antes de reabrir tráfico, un fallo del despliegue restaura el snapshot. Después, no se restauran datos automáticamente. Los guards de arranque y rollback rechazan releases de generación 1 contra una base de generación 2. El rollback con restauración explícita conserva el consentimiento destructivo existente. Las migraciones que cambien de generación requieren el despliegue coordinado; `migrate.sh` no reiniciará un release incompatible.

Verificaciones de migración en bases temporales:

```bash
bun run test:migration-cutover
bun run test:migration-organizations
bun run test:migration-hardening
bun run test:schema-compatibility
```

## Integridad SQL y concurrencia

La migración de endurecimiento conserva los datos y las claves foráneas compuestas entre restaurantes. Restablece emails únicos sin distinguir mayúsculas y valida roles, pertenencia a organización, estados, capacidades, tamaños, dimensiones y revisiones mediante restricciones SQL. Los códigos de reserva son únicos dentro de cada restaurante. Estas restricciones y la collation de email están escritas en SQL: deben conservarse cuando una migración futura reconstruya una tabla, aunque Prisma no las represente en su esquema.

Los comandos `db:migrate`, `db:cutover` y los despliegues ejecutan un preflight que informa tablas e IDs incompatibles antes de migrar. No corrige ni elimina datos automáticamente. `db:migrate` también respalda la base existente; ejecutalo con el servidor detenido. Para comprobar solamente los datos usá `bun run scripts/schema-hardening-preflight.ts`. La preparación local y de pruebas habilita WAL, igual que el despliegue en Linux. El guard de arranque rechaza bases en otro modo para evitar bloqueos al convertir lecturas concurrentes en escrituras.

Las cuotas se verifican en la misma transacción que registra los archivos, incluyendo importaciones y aplicación de plantillas. Las plantillas reutilizan contenido del mismo tipo, MIME y checksum antes de calcular los bytes nuevos. Los archivos se preparan fuera de la transacción y se limpian si ésta falla. Las transacciones de cuota y aforo reintentan hasta tres veces ante bloqueos transitorios de SQLite.

El aforo de eventos cuenta personas en reservas pendientes, confirmadas y completadas. Crear, editar o reactivar una reserva debe respetarlo; cancelar o rechazar libera cupo. Varias reservas regulares pueden compartir horario. El campo `dailyReservationCapacity` se conserva sin aplicar todavía un límite diario.

Seguimientos pendientes: las referencias de archivos usadas por landings requieren proteger conjuntamente el borrador SQL y la publicación en storage; el guard de borrado actual sólo cubre cartas y plantillas privadas de carta. La paginación SQL de plantillas también queda para un cambio independiente.

Los reemplazos y borrados encolan la limpieza física después del commit de base. Ejecutá `./scripts/deploy/run-locked.sh bun run storage:cleanup` periódicamente desde un timer/cron; el wrapper comparte el lock de operación con los despliegues. El comando es idempotente, aplica lease entre workers y devuelve error si algún archivo debe reintentarse.

## Despliegue

Los scripts ejecutables de `scripts/deploy` construyen releases inmutables por commit, serializan deploys, migraciones, backups y comandos operativos con `flock`, y activan el release mediante el symlink atómico `current`. En Linux el directorio estándar `/opt/app-res` se selecciona automáticamente cuando ya existe o cuando los scripts se ejecutan como root; en los demás entornos se usa la ruta absoluta `.deploy` dentro del proyecto. `APP_RELEASE_ROOT` continúa disponible como sobrescritura opcional. Antes de validar, los scripts sincronizan `DATABASE_URL` y `STORAGE_ROOT` en `shared/.env` con las rutas persistentes canónicas del release, conservando el resto de la configuración.

La configuración, `shared/database/app.db`, sus archivos WAL/SHM, los backups y `shared/storage` viven fuera de cada release. Todo debe estar en un disco local persistente: SQLite no se admite sobre NFS, CIFS, volúmenes de red ni despliegues con más de una instancia/host escritor. El directorio de la base debe ser escribible para que SQLite pueda crear `-wal` y `-shm`.

Preparación inicial:

```bash
# Debian/Ubuntu: instalá sqlite3 además de Bun, Git y curl.

# .env debe contener las rutas absolutas bajo /opt/app-res/shared.
# El primer deploy lo copia con permisos 0600 a shared/.env.
./scripts/deploy/create_service.sh
./scripts/deploy/redeploy.sh
```

`redeploy.sh` obtiene `origin/main` sin modificar el checkout y compila el release mientras la versión actual sigue activa. Después entra en una ventana de mantenimiento: detiene el servicio, completa el checkpoint WAL, valida integridad y foreign keys, crea un backup consistente mediante la API de backup de SQLite y aplica las migraciones. El candidato se levanta primero en un puerto loopback privado y debe superar `/api/health` antes de activar `current`.

Si la migración o ese health privado fallan, el script restaura automáticamente el snapshot y vuelve a iniciar el release anterior. Una vez validado el candidato, cualquier fallo posterior permite solamente rollback de código compatible: nunca restaura una base antigua que pudiera descartar escrituras de usuarios. Si el release previo corresponde a otra generación, el servicio queda detenido y se conserva la base nueva para recuperar con código compatible.

Para volver manualmente al release previo sin modificar datos:

```bash
./scripts/deploy/rollback.sh
```

El rollback normal es code-only y comprueba compatibilidad antes de cambiar los enlaces. Restaurar datos para volver a otra generación es una operación distinta y destructiva que exige un snapshot administrado y confirmación explícita:

```bash
./scripts/deploy/rollback.sh \
  --restore-database /opt/app-res/shared/backups/AAAAMMDD-pre-release.db \
  --confirm-data-loss
```

Antes de esa restauración el script crea otro backup de rescate, mantiene el servicio detenido y prueba ambos releases contra el snapshot. No restaura datos automáticamente después de reabrir tráfico.

Las migraciones también pueden ejecutarse de forma independiente con `./scripts/deploy/migrate.sh /ruta/al/release`; el script detiene temporalmente el servicio, respalda la base, ejecuta el preflight/backfill Canvas y verifica compatibilidad antes de reiniciarlo. Los seeds son operaciones manuales bloqueadas, no forman parte del deploy habitual:

```bash
./scripts/deploy/run-locked.sh bun run db:seed
```

Para crear un snapshot consistente sin detener el servicio:

```bash
./scripts/deploy/backup.sh
```

Los snapshots bajo `shared/backups` protegen un despliegue, pero no la pérdida del disco. Copialos periódicamente a un destino externo y probá la restauración. Nunca hagas backup copiando sólo `app.db` mientras la aplicación está activa: el WAL también forma parte del estado de la base.
