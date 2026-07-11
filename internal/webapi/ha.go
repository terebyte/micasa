// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"
	"time"
)

// Home Assistant proxy: micasa web is the household's day-to-day control
// surface; HA stays the automation engine with its own admin UI. Only
// state reads and simple service calls are proxied (see plans/floorplan.md).

// HA connection setting keys (settings table, single-file backup).
const (
	SettingHAURL   = "ha.url"
	SettingHAToken = "ha.token"
)

const haTimeout = 10 * time.Second

// haState is the subset of an HA entity state the UI needs.
type haState struct {
	EntityID   string          `json:"entity_id"`
	State      string          `json:"state"`
	Attributes json.RawMessage `json:"attributes"`
}

func (h *handlers) haConfig() (url, token string, err error) {
	url, err = h.store.GetSetting(SettingHAURL)
	if err != nil {
		return "", "", err
	}
	token, err = h.store.GetSetting(SettingHAToken)
	if err != nil {
		return "", "", err
	}
	return strings.TrimRight(url, "/"), token, nil
}

func (h *handlers) haRequest(ctx context.Context, method, path string, body io.Reader) (*http.Response, error) {
	url, token, err := h.haConfig()
	if err != nil {
		return nil, err
	}
	if url == "" || token == "" {
		return nil, errNotConfigured
	}
	req, err := http.NewRequestWithContext(ctx, method, url+path, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	return http.DefaultClient.Do(req)
}

var errNotConfigured = fmt.Errorf("home assistant url/token is not set")

func (h *handlers) registerHA(mux *http.ServeMux) {
	// Connectivity check for the settings screen.
	mux.HandleFunc("GET /api/ha/status", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), haTimeout)
		defer cancel()
		resp, err := h.haRequest(ctx, http.MethodGet, "/api/", nil)
		if err != nil {
			status := http.StatusBadGateway
			if err == errNotConfigured {
				status = http.StatusUnprocessableEntity
			}
			writeError(w, status, err.Error())
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("home assistant returned HTTP %d", resp.StatusCode))
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// Filtered entity states for the markers currently on screen.
	mux.HandleFunc("GET /api/ha/states", func(w http.ResponseWriter, r *http.Request) {
		wanted := strings.Split(r.URL.Query().Get("ids"), ",")
		wanted = slices.DeleteFunc(wanted, func(s string) bool { return strings.TrimSpace(s) == "" })

		ctx, cancel := context.WithTimeout(r.Context(), haTimeout)
		defer cancel()
		resp, err := h.haRequest(ctx, http.MethodGet, "/api/states", nil)
		if err != nil {
			status := http.StatusBadGateway
			if err == errNotConfigured {
				status = http.StatusUnprocessableEntity
			}
			writeError(w, status, err.Error())
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("home assistant returned HTTP %d", resp.StatusCode))
			return
		}
		var all []haState
		if err := json.NewDecoder(resp.Body).Decode(&all); err != nil {
			h.log.Error("decode ha states", "error", err)
			writeError(w, http.StatusBadGateway, "invalid response from home assistant")
			return
		}
		if len(wanted) > 0 {
			all = slices.DeleteFunc(all, func(s haState) bool {
				return !slices.Contains(wanted, s.EntityID)
			})
		}
		writeJSON(w, http.StatusOK, all)
	})

	// Simple control: homeassistant.toggle works across lights, switches,
	// fans, etc. Richer service calls stay in the HA admin UI.
	mux.HandleFunc("POST /api/ha/toggle", func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			EntityID string `json:"entity_id"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.EntityID == "" {
			writeError(w, http.StatusBadRequest, "entity_id is required")
			return
		}
		payload, err := json.Marshal(map[string]string{"entity_id": body.EntityID})
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to encode request")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), haTimeout)
		defer cancel()
		resp, err := h.haRequest(ctx, http.MethodPost, "/api/services/homeassistant/toggle", strings.NewReader(string(payload)))
		if err != nil {
			status := http.StatusBadGateway
			if err == errNotConfigured {
				status = http.StatusUnprocessableEntity
			}
			writeError(w, status, err.Error())
			return
		}
		defer resp.Body.Close()
		if resp.StatusCode >= 300 {
			writeError(w, http.StatusBadGateway, fmt.Sprintf("home assistant returned HTTP %d", resp.StatusCode))
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
