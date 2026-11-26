# reservation-management

Es dueño de la agenda, eventos, disponibilidad pública, solicitudes y confirmaciones. También persiste las asignaciones de mesas, visitas y cuentas de servicio. Las reglas geométricas y temporales puras provienen de los contratos públicos de `floor-management`.

## Agenda, solicitud y confirmación

1. Las rutas públicas reciben el slug de landing y el filtro de fecha, rango y cantidad. `reservation-use-cases.ts` resuelve el restaurante, comprueba habilitación y reúne horarios, cierres, eventos, reservas y, con salones activos, disponibilidad física.
2. `availability-engine.ts` calcula las reglas de agenda. `floor-allocations.ts` busca combinaciones y ubicaciones posibles cuando importa la ocupación de mesas. La respuesta pública ofrece los horarios. El envío vuelve a validar sus condiciones y guarda una solicitud pendiente.
3. Las acciones de administración autorizan al restaurante y validan los comandos. El repositorio usa transacciones para comprobar aforo, generar un código único y sincronizar la asignación. La confirmación con salones activos requiere un armado y revisiones vigentes.
4. Una reasignación puede mover varias reservas en una escritura. La liberación de una asignación conserva su historial. Las cuentas de servicio pueden extender la ocupación operativa y liberar mesas de un mismo armado por grupos.

## Mapa de implementación

| Archivo dentro del módulo | Qué hace |
| --- | --- |
| `contracts.ts` y `service-contracts.ts` | Esquemas de horarios, cierres, eventos, solicitudes, edición administrativa, visitas y comandos de servicio. Los contratos de servicio se reexportan desde el punto de entrada compartido. |
| `domain/availability-engine.ts` y `reservation-code.ts` | Disponibilidad de agenda y generación de códigos. |
| `application/reservation-use-cases.ts` y `ports.ts` | Orquestación de CMS y operaciones públicas, y puerto del repositorio. |
| `infrastructure/prisma-reservation-repository.ts` | Horarios, cierres, eventos, consultas de reservas, aforo y mutaciones de reserva. |
| `infrastructure/floor-allocations.ts` | Lee planos y ocupaciones, calcula opciones, prepara y valida asignaciones y persiste las posiciones o su liberación. |
| `infrastructure/floor-reassignments.ts` y `floor-walk-ins.ts` | Reasignación individual y por lote con revisiones, y entrada y salida de grupos sin reserva. |
| `infrastructure/table-service.ts` | Cuentas, catálogo, entregas, cobro, recibo, liberación por mesa, informes y cierres de caja. |
| `presentation/ReservationCmsScreen.tsx`, `ReservationAgenda.tsx`, `ReservationScheduleSections.tsx` | Composición del CMS, agenda y secciones de configuración. |
| `presentation/Reservation*Dialogs.tsx`, `reservation-workspace.ts` y `reservation-commands.ts` | Formularios, selección, estado y envío de cambios del CMS. |
| `presentation/actions.ts`, `CashCmsScreen.tsx`, `ServiceCatalogScreen.tsx`, `CashReceipt.tsx` | Acciones de reserva, vistas administrativas de caja y catálogo, y recibo imprimible. |

El CMS usa Server Actions para reservas y eventos. La API pública sirve solicitudes y disponibilidad. Las APIs privadas de sala y servicio montan casos de uso de este módulo junto al guard correspondiente. Para editar un intervalo o cambiar un estado, revisá a la vez aforo, asignación y estado de cuenta.

[Módulo](../../src/modules/reservation-management/) · [Reglas de reservas](../features/reservas.md) · [Contrato operativo de servicio](../features/servicio-y-caja.md) · [Pruebas de integridad](../../tests/integration/reservation-integrity.test.ts)
