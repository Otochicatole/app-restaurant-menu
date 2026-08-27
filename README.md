# Menús digitales multiusuario

La aplicación usa PostgreSQL y separa los datos por tenant. Cada cliente tiene una cuenta CMS y un menú público en `/m/[slug]`. El superadministrador gestiona cuentas desde `/superadmin`; el login único está en `/admin/login`.

## Configuración

Copiá `.env.example` a `.env` y definí `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `APP_URL` y `STORAGE_ROOT`. La contraseña del superadministrador debe tener al menos 12 caracteres y el secreto JWT al menos 32.

## Desarrollo

```bash
bun install
bun x prisma migrate deploy
bun run db:seed
bun run dev
```

La verificación local usa `bun run test` y `bun run test:e2e`. La prueba de aislamiento PostgreSQL se habilita definiendo `TEST_DATABASE_URL` sobre una base de pruebas ya migrada.

En una instalación existente, hacé un backup de PostgreSQL y de `STORAGE_ROOT`, ejecutá `bun run db:migrate-storage` durante la ventana de mantenimiento y reiniciá el servicio. El migrador aborta si encuentra archivos referenciados que no existen.

El almacenamiento actual es local y debe estar en un volumen persistente. No hay cuota total por cliente; se mantienen los límites por archivo de imagen, video y fuente. Para escalar a varias instancias será necesario migrar a object storage.
