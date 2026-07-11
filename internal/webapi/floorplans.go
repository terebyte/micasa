// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/micasa-dev/micasa/internal/data"
	"gorm.io/gorm"
)

func (h *handlers) registerFloorPlans(mux *http.ServeMux) {
	registerEntity(mux, h.log, "/api/floorplans", "floor plan", entityOps[data.FloorPlan]{
		list:   func() ([]data.FloorPlan, error) { return h.store.ListFloorPlans(false) },
		get:    h.store.GetFloorPlan,
		create: h.store.CreateFloorPlan,
		update: h.store.UpdateFloorPlan,
		remove: h.store.DeleteFloorPlan,
		setID:  func(p *data.FloorPlan, id string) { p.ID = id },
	})

	// Markers are scoped to their plan for listing/creation and addressed
	// directly for update/delete.
	mux.HandleFunc("GET /api/floorplans/{id}/markers", func(w http.ResponseWriter, r *http.Request) {
		markers, err := h.store.ListPlanMarkers(r.PathValue("id"), false)
		if err != nil {
			h.log.Error("list plan markers", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list markers")
			return
		}
		writeJSON(w, http.StatusOK, markers)
	})

	mux.HandleFunc("POST /api/floorplans/{id}/markers", func(w http.ResponseWriter, r *http.Request) {
		var marker data.PlanMarker
		if err := json.NewDecoder(r.Body).Decode(&marker); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		marker.ID = ""
		marker.FloorPlanID = r.PathValue("id")
		if err := h.store.CreatePlanMarker(&marker); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) ||
				errors.Is(err, data.ErrParentNotFound) ||
				errors.Is(err, data.ErrParentDeleted) {
				writeError(w, http.StatusNotFound, "floor plan not found")
				return
			}
			h.log.Error("create plan marker", "error", err)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, marker)
	})

	mux.HandleFunc("PUT /api/markers/{id}", updateHandler(h.log, "marker",
		func(m *data.PlanMarker, id string) { m.ID = id },
		h.store.UpdatePlanMarker))
	mux.HandleFunc("DELETE /api/markers/{id}", deleteHandler(h.log, "marker", h.store.DeletePlanMarker))
}
