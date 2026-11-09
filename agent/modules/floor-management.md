# floor-management

Administra salones, sectores, referencias, inventario y armados predefinidos. Define las reglas de geometría e intervalos y representa el plano para administración y sala. Las escrituras que asignan una mesa a una reserva o visita se ejecutan en `reservation-management`.

## Configuración y lectura

1. `FloorAdminScreen` carga el plano y administra borradores de salones, sectores y referencias. Envía dimensiones, inventario, posiciones y revisión esperada. El repositorio valida el plano, pertenencia y asignaciones futuras antes de guardar o archivar.
2. La configuración de sala incluye zona horaria, acceso del personal y activación de la planificación. `server.ts` verifica compatibilidad del runtime de reservas antes de activar. `requireFloorReadAccess` distingue cuentas de sala de administradores y valida el restaurante que pueden consultar.
3. `FloorBoardScreen` combina el plano base con mesas asignadas al instante consultado, cuenta unidades físicas y controla herramientas independientes. En vivo incluye cuentas de servicio abiertas que siguen ocupando mesas.
4. El armado temporal permite seleccionar sector y mesas, cambiar ubicación o capacidad y guardar una confirmación o visita. El backend vuelve a calcular disponibilidad y geometría antes de aceptar.

## Piezas por trabajo

| Si cambiás… | Dónde se decide |
| --- | --- |
| Estructura del plano o vistas de API | `contracts.ts` valida dimensiones, sectores, mesas, rotaciones, combinaciones y propuestas. Define `FloorRoom`, `FloorBoardView`, `FloorPose` y `FloorAssignmentInput`. |
| Capacidad, límites y solapamiento | `domain/floor-policy.ts` calcula capacidad útil, transforma posiciones, identifica grupos unidos, valida sectores, obstáculos y ocupaciones, y busca una colocación posible. |
| Horario, zona y bloqueos | `domain/time-policy.ts` convierte fecha y hora local a UTC, valida zona y cruces de día y calcula intervalos de servicio y bloqueo. |
| Lectura y escritura de salones | `infrastructure/prisma-floor-repository.ts` carga configuración y tablero, guarda plano e inventario, protege asignaciones futuras y gestiona la cuenta de sala. |
| Editor de salones | `FloorAdminScreen.tsx`, `FloorAdminForms.tsx`, `FloorSectorResizeHandles.tsx`, `FloorSectorContextMenu.tsx` y `floor-sector-resize.ts`. |
| Canvas operativo y herramientas | `FloorBoardScreen.tsx`, `FloorCanvas.tsx`, `FloorCanvasStage.tsx`, `FloorBoardToolbar.tsx`, `FloorRoomSelector.tsx` y `floor-workspaces.ts`. |
| Selección, grupos y posición | `floor-selection.ts`, `floor-table-groups.ts`, `floor-table-layout.ts`, `FloorSelectionEditor.tsx`, `FloorTableEditor.tsx` y `FloorTableContextMenu.tsx`. |
| Inventario y ocupación | `floor-inventory.ts`, `FloorInventoryPanel.tsx`, `floor-table-summary.ts` y `FloorTableSummary.tsx`. |
| Armar para reserva o visita | `useFloorAssembly.ts`, `floor-assembly.ts`, `FloorAssemblyControls.tsx`, `FloorAssemblyGrouping.tsx`, `FloorAssignmentPicker.tsx` y `FloorReservationEditor.tsx`. |
| Servicio y transporte HTTP | `FloorServiceWindow.tsx` muestra cuentas y pedidos, `useFloorService.ts` sincroniza sus datos y `floor-api.ts` encapsula las llamadas del plano. |

Las revisiones de plano, reserva y asignación protegen objetos diferentes. La posición de la ventana flotante es estado de interfaz. Las posiciones de las mesas y los tiempos de ocupación se guardan como datos de asignación. El resumen físico usa las asignaciones confirmadas.

[Módulo](../../src/modules/floor-management/) · [Rutas de sala](../../src/app/api/restaurants/[restaurantId]/floor/) · [Flujos de salones](../features/salones.md) · [Pruebas de geometría](../../src/modules/floor-management/domain/floor-policy.test.ts)
