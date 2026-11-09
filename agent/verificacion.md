# Verificación

Ejecutá los comandos desde la raíz con Bun. Elegí los controles según la función modificada. Las fichas del [índice](README.md) enlazan pruebas concretas.

| Objetivo | Comando |
| --- | --- |
| Estilo, reglas estáticas y tipos | `bun run lint`, `bun run architecture`, `bun run typecheck` |
| Pruebas unitarias o de componentes junto al código | `bun run test:unit` |
| Integración SQLite | `bun run test:integration` con la base descartable preparada |
| Compilación de producción | `bun run build` |
| Controles habituales de código y build | `bun run check` |
| Migraciones de menú, organizaciones, restricciones y salones | `bun run test:migration-cutover`, `bun run test:migration-organizations`, `bun run test:migration-hardening`, `bun run test:migration-floor` |
| Compatibilidad entre release y base | `bun run test:schema-compatibility` |
| Navegador y CI completo | `bun run test:e2e`, `bun run check:ci` |

`check` ejecuta lint, arquitectura, tipos, unitarias y build. Para una prueba puntual se puede ejecutar `bun x vitest run <ruta-del-test>`. Los casos de integración que dependen de `TEST_DATABASE_URL`, como aislamiento y cuota, se omiten si falta esa variable.

## Base descartable

El helper de pruebas valida que `TEST_DATABASE_URL` sea una URL SQLite `file:` dentro de `test-results/`, con extensión `.db` o `.sqlite` y un segmento de nombre como `test` o `ci`. `--prepare` recrea el archivo dedicado, habilita WAL, aplica las migraciones y completa el cutover. Usá un nombre exclusivo para esa corrida.

```powershell
$env:TEST_DATABASE_URL = 'file:./test-results/context-test.db'
bun run scripts/require-test-database.ts --prepare
bun run test:integration
```

En Bash, la asignación equivalente es `export TEST_DATABASE_URL=file:./test-results/context-test.db`. En CI, `check:ci` prepara su propia base descartable y usa su URL también como `DATABASE_URL`.

## Servidor local

El trabajo asistido requiere autorización explícita para iniciar o reiniciar servicios. `dev`, `start`, `start:e2e` y los comandos de despliegue con `:start` levantan un servidor. `test:e2e` y `check:ci` también lo levantan mediante Playwright, en `127.0.0.1:3100`, con base y almacenamiento de pruebas. Lint, tipos, arquitectura, unitarias, integración, verificadores de migración y build se pueden ejecutar sin iniciar localhost.

[Scripts](../package.json) · [Helper de base descartable](../scripts/require-test-database.ts) · [Configuración de Playwright](../playwright.config.ts) · [Flujo de CI](../scripts/run-ci-checks.ts)
