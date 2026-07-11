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

// The house profile is a singleton: GET returns 404 until one exists and
// PUT upserts (create on first write, update afterwards).
func (h *handlers) registerHouse(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/house", func(w http.ResponseWriter, _ *http.Request) {
		profile, err := h.store.HouseProfile()
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				writeError(w, http.StatusNotFound, "house profile not found")
				return
			}
			h.log.Error("get house profile", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to get house profile")
			return
		}
		writeJSON(w, http.StatusOK, profile)
	})

	mux.HandleFunc("PUT /api/house", func(w http.ResponseWriter, r *http.Request) {
		var profile data.HouseProfile
		if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		_, err := h.store.HouseProfile()
		switch {
		case errors.Is(err, gorm.ErrRecordNotFound):
			profile.ID = ""
			err = h.store.CreateHouseProfile(profile)
		case err == nil:
			err = h.store.UpdateHouseProfile(profile)
		}
		if err != nil {
			h.log.Error("upsert house profile", "error", err)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		saved, err := h.store.HouseProfile()
		if err != nil {
			h.log.Error("reload house profile", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to reload house profile")
			return
		}
		writeJSON(w, http.StatusOK, saved)
	})
}
