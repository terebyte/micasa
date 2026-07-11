// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import (
	"encoding/json"
	"net/http"

	"github.com/micasa-dev/micasa/internal/data"
)

type settingsResponse struct {
	Currency      string `json:"currency"`
	UnitSystem    string `json:"unit_system"`
	ShowDashboard bool   `json:"show_dashboard"`
}

// settingsUpdate uses pointers so PUT can be partial: only supplied fields
// are written.
type settingsUpdate struct {
	Currency      *string `json:"currency"`
	UnitSystem    *string `json:"unit_system"`
	ShowDashboard *bool   `json:"show_dashboard"`
}

func (h *handlers) registerSettings(mux *http.ServeMux) {
	read := func(w http.ResponseWriter) {
		currency, err := h.store.GetCurrency()
		if err != nil {
			h.log.Error("get currency", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to read settings")
			return
		}
		units, err := h.store.GetUnitSystem()
		if err != nil {
			h.log.Error("get unit system", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to read settings")
			return
		}
		show, err := h.store.GetShowDashboard()
		if err != nil {
			h.log.Error("get show dashboard", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to read settings")
			return
		}
		writeJSON(w, http.StatusOK, settingsResponse{
			Currency:      currency,
			UnitSystem:    units.String(),
			ShowDashboard: show,
		})
	}

	mux.HandleFunc("GET /api/settings", func(w http.ResponseWriter, _ *http.Request) {
		read(w)
	})

	mux.HandleFunc("PUT /api/settings", func(w http.ResponseWriter, r *http.Request) {
		var upd settingsUpdate
		if err := json.NewDecoder(r.Body).Decode(&upd); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		if upd.Currency != nil {
			if err := h.store.PutCurrency(*upd.Currency); err != nil {
				h.log.Error("put currency", "error", err)
				writeError(w, http.StatusUnprocessableEntity, err.Error())
				return
			}
		}
		if upd.UnitSystem != nil {
			if err := h.store.PutUnitSystem(data.ParseUnitSystem(*upd.UnitSystem)); err != nil {
				h.log.Error("put unit system", "error", err)
				writeError(w, http.StatusUnprocessableEntity, err.Error())
				return
			}
		}
		if upd.ShowDashboard != nil {
			if err := h.store.PutShowDashboard(*upd.ShowDashboard); err != nil {
				h.log.Error("put show dashboard", "error", err)
				writeError(w, http.StatusUnprocessableEntity, err.Error())
				return
			}
		}
		read(w)
	})
}
