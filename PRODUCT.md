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
- The operational room view fills the viewport. A floating toolbar gives direct access to rooms, schedule, reservations, arrivals, administration and sign-out. Room selection uses a small nonmodal popover. Walk-in data entry uses a modal; table placement and rotation happen directly on the single main board, preserving zoom and drafts during background updates.
- The room creator reuses the existing CMS sidebar; its board fills the remaining viewport. Only module tools float over the board, with visible labels at every viewport size. A direct Add sector action starts placement on the main plan. Inventory, dimensions and settings use focused modals; sectors and fixtures are selected and moved on the plan. Selected sectors resize directly through their edges and corners while preserving rotation and room boundaries. Sector actions open on right-click at the cursor, with an accessible alternative through the Sectors list. Pending changes are protected before switching rooms, leaving through the sidebar or signing out.
- Table inventory and assembly selectors group by shape and dimensions, showing quantities instead of individual table rows or seat counts. Quantity edits preserve physical table identities, capacities and allocation history. Operational quantities select available units in one batch and retain positions of the tables already placed.
- On `/floor`, a table context menu provides Edit, Rotate and Move. Administrators and waiters edit individual inventory properties in a modal; placement and rotation remain on the main board. A floating Tables action manages inventory quantities and predefined combinations. Existing assignments can be rearranged with explicit saving, preserved intervals and optimistic revisions. Table writes use dedicated endpoints that reject room and sector data.
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
