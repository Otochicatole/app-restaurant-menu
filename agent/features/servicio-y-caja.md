# Servicio y caja

El personal de sala abre una cuenta desde una mesa ocupada en el modo **Servicio**. Un grupo de mesas unidas comparte una cuenta. Una misma reserva puede tener varios grupos independientes. El administrador mantiene el catálogo y revisa los recibos y cierres en Caja.

| Entrada | Uso |
| --- | --- |
| `/floor`, modo **Servicio** | Abrir cuentas, cargar pedidos, registrar entregas y cerrar la cuenta. |
| `/admin/restaurants/[restaurantId]/cash` | Consultar ventas por fecha y medio de pago, imprimir recibos y gestionar cierres. |
| `/admin/restaurants/[restaurantId]/cash/products` | Crear, editar o archivar productos del catálogo. |
| `/api/restaurants/[restaurantId]/service` | GET de sala, caja o productos y POST de comandos de servicio. |

## Contrato de servicio

`GET` sin modo o con `mode=board` devuelve cuentas, productos activos, estado de caja y grupos vencidos sin servir. Con `at` consulta un momento fechado y la cuenta de sala recibe una vista vacía. `mode=products` lista el catálogo administrativo. `mode=cash` recibe `from` y `to` y devuelve recibos, totales por medio y eventos de caja. Los modos administrativos requieren contexto de restaurante.

| Comando POST | Datos y efecto |
| --- | --- |
| `open` | `allocationId`, `tableId` y `expectedAllocationVersion`. Resuelve el grupo a partir de mesas unidas y abre o devuelve su cuenta. |
| `add-line` | `accountId`, `expectedVersion`, cantidad de 1 a 99 y un `productId` o nombre y precio en centavos. Persiste el precio y nombre usados en la línea. |
| `update-line` | Identifica cuenta, revisión y línea. Envía totales entregados y cancelados. La suma no puede superar la cantidad original. |
| `checkout` | Identifica cuenta y revisión. Para un total positivo requiere medio de pago. Persiste importe, fecha, recibo y liberación de las mesas del grupo. |
| `close-empty` | Identifica un grupo vencido sin servir en una asignación con historial de servicio y comprueba su versión. Registra el recibo de importe cero y libera sus mesas. Dentro del horario se usa una cuenta abierta y su checkout. |
| `save-product` y `archive-product` | Crean/actualizan nombre y precio o marcan inactivo el producto. Las líneas anteriores conservan su precio original. |
| `close-day` y `reopen-day` | Operan sobre una fecha local y generan un evento con actor, revisión y totales. Reabrir requiere motivo. |

## Flujo y reglas

- Al abrir la cuenta, el servidor obtiene las mesas del grupo a partir de la asignación. Una mesa física solo puede pertenecer a una cuenta abierta por vez. Mientras siga abierta, conserva su ocupación en el tablero actual incluso si vence el intervalo previsto. La composición de ese grupo se protege hasta el cierre.
- El mozo puede buscar productos por nombre o cargar un ítem manual. Cada línea conserva nombre y precio unitario en centavos al cargarla. La cantidad pedida se distribuye entre entregada, cancelada y pendiente. Para cerrar, resolvé todos los pendientes. Se cobra únicamente lo entregado.
- El pago se realiza por fuera de la aplicación. Se registra un medio por cuenta, efectivo, tarjeta o transferencia/QR, cuando el total es positivo. El cierre sin consumo conserva un recibo de importe cero. En una transacción, el checkout guarda el recibo y libera solo las mesas de esa cuenta. Al liberar la última mesa asignada se completa la reserva. Un reintento equivalente del checkout devuelve el recibo existente.
- Caja usa la fecha local del cobro. Un día cerrado bloquea nuevos cierres de cuentas para esa fecha. Cerrar el día actual exige que se cierren antes las cuentas abiertas. Solo se puede reabrir el día actual, con motivo y registro del actor. Los comandos de catálogo y caja requieren acceso administrativo. El personal de sala opera sobre su restaurante y no recibe el historial de recibos de consultas fechadas.

`orderedCents` suma el precio por cantidad pedida menos cancelada. `deliveredCents` suma el precio por cantidad entregada. `pendingQuantity` es la cantidad pedida menos la entregada y cancelada. El recibo se numera al cerrar y el total persistido toma `deliveredCents`. El checkout repetido devuelve ese recibo si corresponde a la revisión de la operación original y coincide el medio de pago.

## Dónde mirar

La ventana operativa vive en `floor-management`. Los contratos, la lógica transaccional, el catálogo y Caja viven en `reservation-management`. Los modelos son `ServiceProduct`, `ServiceAccount`, `ServiceAccountTable`, `ServiceOrderLine` y `ServiceCashEvent`. `ReservationAllocationTable.releasedAt` registra la liberación por mesa.

[Ventana de servicio](../../src/modules/floor-management/presentation/FloorServiceWindow.tsx) · [Contrato de comandos](../../src/modules/reservation-management/service-contracts.ts) · [Servicio transaccional](../../src/modules/reservation-management/infrastructure/table-service.ts) · [Caja](../../src/modules/reservation-management/presentation/CashCmsScreen.tsx) · [API](../../src/app/api/restaurants/[restaurantId]/service/route.ts)

Las pruebas cubren cierre parcial, competencia entre conexiones SQLite, ocupación vencida, recibos y cambio de fecha local. [Integración de servicio](../../tests/integration/table-service.test.ts) · [Permisos de la API](../../src/app/api/restaurants/[restaurantId]/service/route.test.ts)

Este flujo corresponde a la generación 5. [Datos y operación](../datos-y-operacion.md) · [Salones](salones.md) · [Reservas](reservas.md)

Distribución del código de servicio y caja. [Módulo de reservas](../modules/reservation-management.md) · [Módulo de salones](../modules/floor-management.md)
