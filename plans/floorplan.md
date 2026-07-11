<!-- Copyright 2026 Phillip Cloud -->
<!-- Licensed under the Apache License, Version 2.0 -->

# Floor plan module (rooms, plans, markers, HA control surface)

Goal: the web UI becomes the household control surface. A floor plan image
(exported from Sweet Home 3D or similar) is displayed with tappable markers;
markers link to rooms, appliances, or Home Assistant entities so a tablet on
the wall can show and control the home.

## Entities (internal/data)

- `Room` - name, floor number, notes. Soft-deletable. Loosely coupled to
  other entities: existing `location` string fields keep working; the web
  form offers room names as suggestions rather than adding FK columns to
  every entity (deliberate, keeps upstream diff small).
- `FloorPlan` - name, floor number. The plan image is a `Document` linked
  via the existing polymorphic pattern (`entity_kind = "floor_plan"`),
  reusing upload/download/size-limit infrastructure.
- `PlanMarker` - belongs to a FloorPlan (FK, RESTRICT via cascade delete in
  store method); `x`/`y` are percentages (0-100) of the image so markers
  survive any display size. `kind` is one of `room | appliance | ha`;
  `room_id`/`appliance_id` (SET NULL) or `ha_entity` carry the target.

Deleting a floor plan soft-deletes its markers in one transaction; deleting
a room or appliance nulls the marker target (marker keeps its label).

## Home Assistant proxy (internal/webapi)

HA remains the automation engine with its own admin UI; micasa web only
proxies day-to-day state/control so the household never needs the HA UI:

- Settings keys `ha.url`, `ha.token` (settings table; single-file backup).
- `GET /api/ha/status` - connectivity check (`{ha}/api/`).
- `GET /api/ha/states?ids=a,b` - filtered states for markers on screen.
- `POST /api/ha/toggle {"entity_id": ...}` - `homeassistant.toggle` service.

## Web UI

- New primary tab (도면): plan picker + image + markers. Edit mode: tap the
  image to drop a marker, dialog sets label/kind/target. View mode: tap a
  marker - appliance navigates to the appliance list, ha toggles the entity
  and reflects its state (on/off tint).
- Rooms get a standard config-driven CRUD page under 더보기.
- Settings gains HA URL/token fields next to the Discord webhook.

## Deviations from /add-entity checklist (deliberate)

- TUI wiring (TabKind/handler/forms/mouse) is deferred: rooms/plans/markers
  are web-first surfaces; parity direction for this fork is web >= TUI.
  Tracked in tasks/todo.md.
- `entity_context.go` / `entity_rows.go` untouched: those feed the LLM
  extraction pipeline, which does not extract rooms or markers.
- FTS: rooms/plans are excluded from the entity search index for now.
