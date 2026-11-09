# Reservas

El visitante consulta disponibilidad, indica la cantidad de personas y envía una solicitud pendiente. El administrador gestiona la agenda, horarios, cierres recurrentes, fechas bloqueadas y eventos. Con salones activos, confirmar exige un armado de mesas válido para el grupo y el horario.

| Entrada | Uso |
| --- | --- |
| `/admin/restaurants/[restaurantId]/reservations` | Agenda, configuración, eventos y gestión de reservas. |
| `/api/public/landing/[slug]/reservations` | Contrato público de reservas desde la landing. |
| `/api/public/landing/[slug]/reservations/tables` y `…/tables/availability` | Solicitud y disponibilidad para mesas. |
| `/api/public/landing/[slug]/reservations/events` | Integración pública de eventos. |

## Consultar disponibilidad y crear una solicitud

1. `GET /availability` y `GET /tables/availability`, relativos a la base pública de reservas, aceptan `date` o `from` y `to`, más `partySize`. El inicio se ajusta a la fecha local actual y el rango se limita a 120 días inclusivos. La respuesta usa fecha, hora y zona del restaurante e incluye fechas, horarios, sectores y eventos según la variante.
2. El caso de uso reúne horarios activos, días de cierre recurrente, fechas bloqueadas y eventos. Con salones activos también consulta si existe una combinación de mesas y sector para el grupo en el intervalo. El motor de agenda combina los datos y elimina horas pasadas.
3. `POST /tables` solicita mesa con fecha, hora, personas y datos del cliente. El sector preferido es opcional. `GET /events` lista eventos públicos y `POST /events` solicita lugares para el evento. La ruta base también acepta solicitudes generales. La confirmación administrativa es un paso posterior.

## Gestionar una reserva desde el CMS

| Caso | Qué se comprueba |
| --- | --- |
| Editar horarios o cierres | El CMS guarda turnos activos, días de la semana o excepciones por fecha. Las siguientes consultas públicas vuelven a calcular los horarios ofrecidos. |
| Crear o editar evento | Fecha, horas, aforo, estado de publicación y salones seleccionados. Si el evento bloquea reservas normales, con salones activos el bloqueo es espacial además de temporal. |
| Confirmar | Con salones activos se abre el editor de armado, que propone sector, mesas y posiciones. El servidor comprueba aforo, revisión y disponibilidad y guarda reserva y asignación juntas. |
| Mover o cambiar cantidad | El backend vuelve a validar estado, capacidad y disponibilidad. Si se cambia un armado con servicio abierto, también protege la composición de la cuenta. |
| Completar, cancelar o rechazar | El repositorio sincroniza la liberación cuando corresponde. Si existe servicio que requiere cierre, el flujo de cuenta conserva el historial y libera por grupo. |

## Reglas que preservar

- El slug público se resuelve en servidor al restaurante correspondiente. Las acciones de administración validan el contexto privado. Los códigos de reserva son únicos dentro de cada restaurante.
- La disponibilidad combina horarios, cierres, eventos y, si está activada la planificación, inventario y espacio físico. El contrato público de disponibilidad conserva dos personas por defecto al omitir `partySize`. Una preferencia pública de sector se registra como preferencia. La mesa se asigna al confirmar.
- Con salones activos, las pendientes no apartan mesas ni aforo de eventos. Confirmadas y completadas cuentan para el aforo del evento. Sin salones activos, también cuentan las pendientes. `dailyReservationCapacity` permanece como campo de esquema sin límite diario aplicado.
- Confirmar con mesas guarda la reserva y la asignación en una transacción. Los cambios relevantes requieren validar las revisiones y recalcular disponibilidad. La liberación conserva el historial. Con Servicio, el cierre de la última parte del armado completa la reserva. [Salones](salones.md) · [Servicio y caja](servicio-y-caja.md)

## Dónde mirar

`reservation-management` contiene las acciones, validaciones, agenda, disponibilidad y persistencia. Los modelos principales son `TableReservation`, `ReservationTimeSlot`, `ReservationRecurringClosure`, `ReservationBlockedDate`, `RestaurantEvent`, `RestaurantEventRoom` y `ReservationAllocation`.

[Contratos](../../src/modules/reservation-management/contracts.ts) · [Pantalla de reservas](../../src/modules/reservation-management/presentation/ReservationCmsScreen.tsx) · [Repositorio](../../src/modules/reservation-management/infrastructure/prisma-reservation-repository.ts) · [Asignación transaccional](../../src/modules/reservation-management/infrastructure/floor-allocations.ts)

Pruebas para aforo, disponibilidad y confirmación con salones. [Integridad de reservas](../../tests/integration/reservation-integrity.test.ts) · [Disponibilidad por sector](../../tests/integration/floor-sector-availability.test.ts) · [Confirmación en UI](../../src/modules/reservation-management/presentation/reservation-floor-flow.test.ts)

La [ficha de landing](landing.md) explica cómo llegan las solicitudes públicas desde el sitio.

Desglose de contratos, motor y persistencia. [Módulo de reservas](../modules/reservation-management.md)
