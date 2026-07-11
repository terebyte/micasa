<!-- Copyright 2026 Phillip Cloud -->
<!-- Licensed under the Apache License, Version 2.0 -->

# Home inventory: assets, consumables, recurring expenses

Appliances alone do not describe a home. Three additions make micasa a
real household operating system, especially during a move (the asset
inventory doubles as the packing list).

## Entities

- `Asset` - any owned thing beyond appliances: furniture, electronics,
  tools, artwork. Fields: name, category (free text), room FK (SET NULL),
  brand, serial, purchase date, cost. Documents attach via the existing
  polymorphic link (`entity_kind = "asset"`). Rooms give assets a physical
  place, which also powers the floor plan (`PlanMarker.asset_id`).
- `Consumable` - stocked supplies (filters, bulbs, batteries). Fields:
  name, quantity, min quantity, unit, purchase URL, notes. "Low stock"
  means `quantity <= min_quantity`; low-stock items surface on the
  dashboard and in the daily Discord digest.
- `RecurringExpense` - fixed costs (HOA fee, internet, insurance,
  subscriptions). Fields: name, amount, interval (`monthly | yearly`),
  billing day, active flag, notes. The dashboard shows the monthly fixed
  total (yearly amounts divided by 12).

## Floor plan polish (deferred items now done)

- Markers drag to reposition in edit mode (pointer events; save on drop).
- Plans can be renamed and deleted from the page; deleting cascades
  markers (already in store) and the plan image document stays linked to
  the soft-deleted plan.
- The plan image can be replaced (upload replaces the linked document).
- New marker kind `asset` linking to an Asset.

## Deviations

Same as plans/floorplan.md: web-first surfaces, TUI wiring deferred, not
in the LLM extraction context, not in FTS yet.
