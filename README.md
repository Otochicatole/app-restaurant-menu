# Menús digitales multiusuario

La aplicación usa SQLite en un único host y separa los datos por tenant. Cada cliente tiene una cuenta CMS y un menú público en `/m/[slug]`. El superadministrador gestiona cuentas desde `/superadmin`; el login único está en `/admin/login`.

## Arquitectura

El código está organizado como monolito modular por capacidades en `src/modules`: `identity-access`, `tenant-management`, `menu-editor` y `public-menu`. El contenido gastronómico vive en documentos Canvas versionados; cada módulo publica solamente `contracts.ts`, `server.ts` y, cuando tiene interfaz, `ui.ts`; dominio, aplicación, infraestructura y presentación permanecen privados.

`src/app` es el composition root HTTP/Next.js, `src/platform` contiene adaptadores técnicos y `src/ui` conserva únicamente UI realmente compartida. ESLint y dependency-cruiser bloquean imports profundos, ciclos, dependencias de frameworks en dominio/aplicación y dependencias de plataforma hacia negocio.

## Plantillas Canvas

El editor incluye tres presets globales (Minimalista vertical, Cafetería y Gourmet) y permite guardar el borrador de cada restaurante como plantilla privada. Una plantilla puede enviarse a la comunidad para moderación desde `/superadmin`; sólo las plantillas públicas aprobadas aparecen para otros restaurantes. Las miniaturas se generan desde el documento Canvas y los assets públicos se clonan para mantener el aislamiento entre tenants. Aplicar una plantilla reemplaza únicamente el borrador y se puede deshacer; la publicación vigente sólo cambia al pulsar **Publicar**.

## Configuración

Copiá `.env.example` a `.env` y definí `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `APP_URL` y `STORAGE_ROOT`. La contraseña del superadministrador debe tener al menos 12 caracteres y el secreto JWT al menos 32. Dejá `TRUST_PROXY=false` salvo que la aplicación sólo sea accesible detrás de un proxy que sanee los headers reenviados.

SQLite y el storage usan rutas absolutas en producción. Para `APP_RELEASE_ROOT=/opt/app-res`, los valores requeridos son `DATABASE_URL=file:/opt/app-res/shared/database/app.db` y `STORAGE_ROOT=/opt/app-res/shared/storage`. La base nunca debe quedar dentro de `releases/<id>`. `TEST_DATABASE_URL` debe apuntar a otro archivo SQLite descartable y exclusivo para pruebas.

## Desarrollo

```bash
bun install
bun x prisma migrate deploy
bun run db:seed
bun run dev
```

`bun run db:seed` es idempotente: crea/actualiza el superadmin definido por `SUPER_ADMIN_EMAIL` y prepara un restaurante Canvas de desarrollo (`Fuzion`, slug `fuzion`) con `admin@fuzion.local` y contraseña `FuzionAdmin2026!`. Podés personalizarlo con `SEED_RESTAURANT_NAME`, `SEED_RESTAURANT_SLUG`, `SEED_RESTAURANT_ADMIN_EMAIL` y `SEED_RESTAURANT_ADMIN_PASSWORD`. También siembra los presets globales Minimalista vertical, Cafetería y Gourmet.

Para una base existente, ejecutá `bun run db:cutover`. Crea un backup, convierte los datos legacy a documentos Canvas, publica la primera versión de cada restaurante, aplica la migración destructiva y regenera Prisma Client.

La verificación rápida es `bun run check`. Para reproducir CI, migrá primero la base de pruebas y ejecutá la verificación completa:

```bash
DATABASE_URL="$TEST_DATABASE_URL" bun x prisma migrate deploy
bun run check:ci
```

`check:ci` exige `TEST_DATABASE_URL`, fuerza que toda la aplicación use ese archivo durante la verificación y ejecuta lint, límites arquitectónicos, typecheck, unitarias, cobertura, integración SQLite, build y Playwright. Playwright usa build limpio, puerto, base y storage dedicados, sin reutilizar servidores.

El almacenamiento actual es local y debe estar en un volumen persistente. Cada tenant tiene una cuota configurable y se mantienen los límites por archivo de imagen y fuente. Para escalar a varias instancias será necesario migrar a object storage.

Los reemplazos y borrados encolan la limpieza física después del commit de base. Ejecutá `bash scripts/deploy/run-locked.sh bun run storage:cleanup` periódicamente desde un timer/cron; el wrapper comparte el lock de operación con los despliegues. El comando es idempotente, aplica lease entre workers y devuelve error si algún archivo debe reintentarse.

## Despliegue

Los scripts de `scripts/deploy` construyen releases inmutables por commit bajo `APP_RELEASE_ROOT` (por defecto, la ruta absoluta `.deploy` dentro del proyecto), serializan deploys, migraciones, backups y comandos operativos con `flock`, y activan el release mediante el symlink atómico `current`. En producción se recomienda `APP_RELEASE_ROOT=/opt/app-res`.

La configuración, `shared/database/app.db`, sus archivos WAL/SHM, los backups y `shared/storage` viven fuera de cada release. Todo debe estar en un disco local persistente: SQLite no se admite sobre NFS, CIFS, volúmenes de red ni despliegues con más de una instancia/host escritor. El directorio de la base debe ser escribible para que SQLite pueda crear `-wal` y `-shm`.

Preparación inicial:

```bash
# Debian/Ubuntu: instalá sqlite3 además de Bun, Git y curl.
export APP_RELEASE_ROOT=/opt/app-res

# .env debe contener las rutas absolutas bajo /opt/app-res/shared.
# El primer deploy lo copia con permisos 0600 a shared/.env.
bash scripts/deploy/create_service.sh
bash scripts/deploy/redeploy.sh
```

`redeploy.sh` obtiene `origin/main` sin modificar el checkout y compila el release mientras la versión actual sigue activa. Después entra en una ventana de mantenimiento: detiene el servicio, completa el checkpoint WAL, valida integridad y foreign keys, crea un backup consistente mediante la API de backup de SQLite y aplica las migraciones. El candidato se levanta primero en un puerto loopback privado y debe superar `/api/health` antes de activar `current`.

Si la migración o ese health privado fallan, el script restaura automáticamente el snapshot y vuelve a iniciar el release anterior. Una vez validado el candidato, cualquier fallo posterior hace solamente rollback de código: nunca restaura una base antigua que pudiera descartar escrituras de usuarios.

Para volver manualmente al release previo sin modificar datos:

```bash
bash scripts/deploy/rollback.sh
```

El rollback normal siempre es code-only. Por eso las migraciones productivas deben ser compatibles con el release anterior. Restaurar datos es una operación distinta y destructiva que exige un snapshot administrado y confirmación explícita:

```bash
bash scripts/deploy/rollback.sh \
  --restore-database /opt/app-res/shared/backups/AAAAMMDD-pre-release.db \
  --confirm-data-loss
```

Antes de esa restauración el script crea otro backup de rescate, mantiene el servicio detenido y prueba ambos releases contra el snapshot. No restaura datos automáticamente después de reabrir tráfico.

Las migraciones también pueden ejecutarse de forma independiente con `bash scripts/deploy/migrate.sh /ruta/al/release`; el script detiene temporalmente el servicio, respalda la base, ejecuta el preflight/backfill Canvas y verifica compatibilidad antes de reiniciarlo. Los seeds son operaciones manuales bloqueadas, no forman parte del deploy habitual:

```bash
bash scripts/deploy/run-locked.sh bun run db:seed
```

Para crear un snapshot consistente sin detener el servicio:

```bash
bash scripts/deploy/backup.sh
```

Los snapshots bajo `shared/backups` protegen un despliegue, pero no la pérdida del disco. Copialos periódicamente a un destino externo y probá la restauración. Nunca hagas backup copiando sólo `app.db` mientras la aplicación está activa: el WAL también forma parte del estado de la base.
