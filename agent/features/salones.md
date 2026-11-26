# Salones

El administrador prepara el plano base de cada salón con sectores, inventario de mesas y referencias como paredes o barras. La mesa física pertenece al inventario. Su posición operativa se guarda en la asignación de la reserva o la visita. El personal de sala consulta y modifica el armado dentro de sus permisos.

| Entrada | Uso |
| --- | --- |
| `/admin/restaurants/[restaurantId]/rooms` | Editor del plano base y configuración de acceso de sala. |
| `/floor` | Tablero operativo con modos Seleccionar, Mover vista y Servicio. |
| `/api/restaurants/[restaurantId]/floor` | Configuración, tablero, opciones y operaciones de sala. |
| `/api/restaurants/[restaurantId]/floor/assignments` | Reasignación por lote. La variante con `/[reservationId]` opera sobre una reserva. |
| `/api/restaurants/[restaurantId]/floor/tables` | Inventario de mesas. |

## Configurar y operar

| Acción | Entrada y efecto |
| --- | --- |
| Preparar el salón | El administrador define dimensiones, sectores y referencias, agrega mesas al inventario y puede guardar armados predefinidos. `POST /floor` con `save-room` o `archive-room` exige revisión. |
| Habilitar operación | `settings` cambia la zona horaria, `staff` y `disable-staff` gestionan acceso y `activate` comprueba la configuración y la compatibilidad de la landing. |
| Consultar plano | `GET /floor?mode=board` compone las poses de mesas al instante `at` o en vivo. `config` devuelve la configuración administrativa. `options`, `walk-in-options` y `reassign-options` calculan alternativas según el tipo de operación y sus permisos. |
| Armar para una reserva | La propuesta indica salón, opción de mesa/combinación o armado personalizado, posiciones, giro y revisión de salón. Puede incluir sector, capacidad y las mesas del armado. La escritura de confirmación también valida la revisión de la reserva. |
| Atender sin reserva | La UI consulta con personas y duración. Se permiten entre 15 y 720 minutos, con 120 por defecto. `walk-in` guarda la visita confirmada y su asignación juntas. `release-walk-in` cierra una visita sin servicio con revisión esperada. Una visita que tiene servicio se libera desde la cuenta. |
| Reacomodar o editar inventario | `PUT /floor/assignments` aplica un lote de cambios sobre reservas y asignaciones con revisiones. `PUT /floor/tables` acepta inventario y combinaciones del salón con su revisión. |

En **Seleccionar**, el primer clic sobre una mesa unida elige el grupo y el doble clic permite elegir una sola mesa. Se puede sumar a la selección con modificadores y abrir **Editar** o **Separar** desde el menú contextual. **Mover vista** desplaza la cámara. **Servicio** abre la cuenta de un grupo ocupado. Las ventanas flotantes conservan tamaño, posición y campos mientras se minimizan.

## Reglas que preservar

- El inventario muestra cantidades por tipo y conserva la identidad de cada mesa. Los sectores pueden alojar varios grupos. Los bordes pueden tocarse y se rechazan superposiciones. Un grupo unido pierde capacidad útil por sus lados o puntos de contacto. Dos mesas de cuatro unidas por un lado ofrecen seis lugares y ocupan dos unidades físicas.
- La disponibilidad usa intervalos UTC con inicio incluido y fin excluido, calculados en la zona horaria del restaurante. Una reserva común a las 20:00 bloquea de 18:00 a 22:00. Un evento bloquea desde dos horas antes hasta el fin, con dos horas posteriores al inicio si falta el fin. Una visita sin reserva comienza al llegar y tiene duración ajustable. Las liberaciones anticipadas acortan la ocupación efectiva.
- Las reasignaciones por lote validan y escriben juntas las posiciones. Conservan los intervalos y el vínculo con la reserva. Las revisiones impiden pisar un plano o armado que cambió. El tablero cuenta unidades físicas según las asignaciones guardadas, mientras que el armado en edición es un borrador.
- El tablero se actualiza cada 15 segundos mientras está visible. Las herramientas flotantes se pueden mover, redimensionar y minimizar. Las ventanas operativas abren con 800 × 1240 px de tamaño preferido y 800 × 1280 px para armado. El componente compartido ajusta la ventana al espacio disponible.

## Dónde mirar

`floor-management` contiene configuración, geometría, cálculo de intervalos y UI. `reservation-management` ejecuta las asignaciones, reasignaciones y visitas en base. Los modelos incluyen `DiningRoom`, `DiningRoomLocation`, `DiningTable`, `DiningTableCombination`, `ReservationAllocation` y `ReservationAllocationTable`.

[Tablero](../../src/modules/floor-management/presentation/FloorBoardScreen.tsx) · [Geometría](../../src/modules/floor-management/domain/floor-policy.ts) · [Intervalos](../../src/modules/floor-management/domain/time-policy.ts) · [Reasignaciones](../../src/modules/reservation-management/infrastructure/floor-reassignments.ts)

Pruebas para ocupación, cambios de posición y visitas. [Asignaciones](../../tests/integration/floor-allocation.test.ts) · [Reasignaciones](../../tests/integration/floor-reassignments.test.ts) · [Visitas](../../tests/integration/floor-walk-ins.test.ts) · [Interacción del tablero](../../src/modules/floor-management/presentation/floor-table-interactions.test.ts)

Consultá [Reservas](reservas.md) para la confirmación y [Servicio y caja](servicio-y-caja.md) para la ocupación posterior al turno y la liberación por grupo.

Mapa de componentes y reglas puras. [Módulo de salones](../modules/floor-management.md)
