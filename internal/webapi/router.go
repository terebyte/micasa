// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

// Package webapi exposes internal/data.Store over a JSON HTTP API. Handlers
// must only call Store methods so the web layer stays in parity with the TUI;
// business logic lives in internal/data, never here.
package webapi

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/micasa-dev/micasa/internal/data"
)

// NewRouter builds the HTTP handler for the micasa web API.
func NewRouter(store *data.Store, log *slog.Logger) http.Handler {
	h := &handlers{store: store, log: log}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", h.health)

	mux.HandleFunc("GET /api/appliances", h.listAppliances)
	mux.HandleFunc("POST /api/appliances", h.createAppliance)
	mux.HandleFunc("GET /api/appliances/{id}", h.getAppliance)
	mux.HandleFunc("PUT /api/appliances/{id}", h.updateAppliance)
	mux.HandleFunc("DELETE /api/appliances/{id}", h.deleteAppliance)

	return withCORS(mux)
}

type handlers struct {
	store *data.Store
	log   *slog.Logger
}

func (h *handlers) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// apiError is the JSON error envelope returned for non-2xx responses.
type apiError struct {
	Error string `json:"error"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, apiError{Error: msg})
}

// withCORS permits the Vite dev server to call the API during development.
// MVP is unauthenticated (LAN only); an auth middleware slots in here later.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
