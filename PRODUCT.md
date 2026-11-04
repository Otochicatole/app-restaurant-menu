# Restaurant menu and reservations

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Administrators manage restaurants, digital menus, landing pages and reservations. A shared waiter account for each restaurant consults its rooms and receives walk-in groups on a phone.

## Product Purpose

Coordinate reservations and arrivals with the actual table inventory available in each room. Administrators confirm a request by assembling physical tables inside a named sector such as Ventana or Terraza.

## Operating Context

An organization can manage several restaurants. Each restaurant has independent menus, reservations, events and rooms. Administrators define inventory quantities, custom room dimensions and sectors; waiters consult reservations and assemble tables for walk-in groups.

## Capabilities and Constraints

- Ordinary reservations block tables two hours before and two hours after their scheduled start.
- Events block selected rooms from two hours before their start until the event ends, or two hours after the start if no end is specified.
- Pending requests do not hold tables or event capacity after floor planning is activated.
- Completing a reservation releases its tables immediately while retaining its allocation record.
- Each table combination has an explicit usable capacity; two tables of four can form a group of six.
- The base room plan contains sectors and fixed references. Unused inventory has no position on the board; each reservation or arrival owns its selected table positions.
- Multiple groups may share a sector if their table surfaces do not overlap. Tables can be joined at assignment time, with an explicit useful capacity; predefined combinations remain optional shortcuts.
- A reservation may use separate tables or several joined groups within its sector. Joined groups are derived from physical contact and show a shared outline and table labels. Explicit Join and Separate actions preserve table identities and assignments; group movement affects only the selection. Preset combinations still require connected tables. Automatic useful capacity adjusts for joins; a manually chosen capacity is preserved.
- Time zones are configurable per restaurant, defaulting to Buenos Aires.
- Waiter accounts can manage table inventory and rearrange tables for all confirmed groups in their own restaurant, including administrative and public reservations, events and walk-in visits. They can register and finish walk-ins. They cannot change rooms, sectors, fixed references, reservation details or statuses, settings or credentials, and do not receive contact information or administrative notes.
- The operational room view fills the viewport. A floating toolbar gives direct access to rooms, schedule, reservations, arrivals, administration and sign-out. Room selection uses a small nonmodal popover. Operational tools use movable, resizable and minimizable nonmodal windows; minimizing or bringing forward an existing tool preserves its fields, scroll and inventory draft. Only releasing tables requires a modal confirmation. Table placement and rotation happen directly on the single main board, preserving zoom and drafts during background updates. A restrained petroleum-blue action/selection palette and cool neutral canvas distinguish operations from the green administrative editor; occupied tables retain their warm semantic color.
- The room creator reuses the existing CMS sidebar; its board fills the remaining viewport. Only module tools float over the board, with visible labels at every viewport size. A direct Add sector action starts placement on the main plan. Inventory, dimensions, properties and settings use the shared nonmodal editor window, with drag, resize, minimization and independent closing. Its bounds keep the CMS sidebar and module toolbar reachable. Compact forms have a scrollable body and fixed action footer; destructive confirmations remain modal. Sectors and fixtures are selected and moved on the plan. Selected sectors resize directly through their edges and corners while preserving rotation and room boundaries. Sector actions open on right-click at the cursor, with an accessible alternative through the Sectors list. Pending changes are protected before switching rooms, leaving through the sidebar or signing out.
- Table inventory and assembly selectors group by shape and dimensions, showing quantities instead of individual table rows or seat counts. Quantity edits preserve physical table identities, capacities and allocation history. Operational quantities select available units in one batch and retain positions of the tables already placed.
- On `/floor`, a table context menu provides Edit, Rotate and Move. Administrators and waiters edit individual inventory properties in a modal; placement and rotation remain on the main board. A floating Tables action manages inventory quantities and predefined combinations. Existing assignments can be rearranged with explicit saving, preserved intervals and optimistic revisions. Table writes use dedicated endpoints that reject room and sector data.
- The table assembly tools use the same floating window as the editor icon picker: movable, resizable and minimizable, with a fixed action footer. Minimizing preserves selection, scroll, fields and the board viewport. Closing the palette removes its window while retaining the board assembly, which can be reopened through group actions. Precise position and capacity fields are progressively disclosed; explicit Cancel discards the assembly.
- The operational table summary counts distinct active physical tables in the selected saved room at the board instant: free, occupied and active total, with inactive inventory shown separately when present. Occupied includes the assignment preparation interval and ends at the earlier of planned end or release. Draft assemblies and inventory edits do not change committed counts. Free means unassigned; final availability is validated when assembling.
- Floor operations and the room editor keep independent tool/entity windows open together. Each retains its own form, scroll, position, size and minimized state; reopening the same entity restores it and brings it forward. Pointer or keyboard focus controls a bounded stacking order. X and Cancel close only their own window; minimizing retains fields. Closed windows do not leave a restore dock. Confirmations preserve background tools. Edits merge into current data and stale entity snapshots must be reopened instead of overwriting other changes.
- Table and joined-group context menus are separate vertical lists: a table opens individual edit/move/rotate and optional separation, while the joined outline, label or group action button opens group edit/move/rotate. Group edit selects its complete set of tables in the main assembly tools; individual edit opens only that physical table’s properties.
- Preserve existing data and the established modular monolith, SQLite and Prisma.
- Do not start local servers or restart services without an explicit user request.

## Brand Commitments

Extend the existing Spanish-language CMS visual system. The supplied floor-plan reference establishes spatial table placement, table numbers and visible capacities; it does not require replacing the application's identity.

## Product Principles

- Use physical tables as the resource, rather than an aggregate pool of seats.
- Prevent double allocation through transactional validation.
- Keep administrative configuration separate from operational consultation.
- Show pending requests honestly as awaiting administrative confirmation.

## Explicit Limits

No billing, orders, individual seat assignments, individual waiter assignments, automatic table layout solver or circulation simulation. Daily aggregate capacity remains inactive.
