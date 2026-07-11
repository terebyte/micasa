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
	mux.HandleFunc("GET /api/dashboard", h.dashboard)
	mux.HandleFunc("GET /api/search", h.search)

	registerEntity(mux, log, "/api/appliances", "appliance", entityOps[data.Appliance]{
		list:   func() ([]data.Appliance, error) { return store.ListAppliances(false) },
		get:    store.GetAppliance,
		create: store.CreateAppliance,
		update: store.UpdateAppliance,
		remove: store.DeleteAppliance,
		setID:  func(a *data.Appliance, id string) { a.ID = id },
	})
	registerEntity(mux, log, "/api/vendors", "vendor", entityOps[data.Vendor]{
		list:   func() ([]data.Vendor, error) { return store.ListVendors(false) },
		get:    store.GetVendor,
		create: store.CreateVendor,
		update: store.UpdateVendor,
		remove: store.DeleteVendor,
		setID:  func(v *data.Vendor, id string) { v.ID = id },
	})
	registerEntity(mux, log, "/api/projects", "project", entityOps[data.Project]{
		list:   func() ([]data.Project, error) { return store.ListProjects(false) },
		get:    store.GetProject,
		create: store.CreateProject,
		update: store.UpdateProject,
		remove: store.DeleteProject,
		setID:  func(p *data.Project, id string) { p.ID = id },
	})
	registerEntity(mux, log, "/api/maintenance", "maintenance item", entityOps[data.MaintenanceItem]{
		list:   func() ([]data.MaintenanceItem, error) { return store.ListMaintenance(false) },
		get:    store.GetMaintenance,
		create: store.CreateMaintenance,
		update: store.UpdateMaintenance,
		remove: store.DeleteMaintenance,
		setID:  func(m *data.MaintenanceItem, id string) { m.ID = id },
	})
	registerEntity(mux, log, "/api/incidents", "incident", entityOps[data.Incident]{
		list:   func() ([]data.Incident, error) { return store.ListIncidents(false) },
		get:    store.GetIncident,
		create: store.CreateIncident,
		update: store.UpdateIncident,
		remove: store.DeleteIncident,
		setID:  func(i *data.Incident, id string) { i.ID = id },
	})

	registerListOnly(mux, log, "/api/project-types", "project type", store.ProjectTypes)
	registerListOnly(mux, log, "/api/maintenance-categories", "maintenance category", store.MaintenanceCategories)

	h.registerQuotes(mux)
	h.registerServiceLogs(mux)
	h.registerHouse(mux)
	h.registerSettings(mux)
	h.registerDocuments(mux)

	return withCORS(mux)
}

// registerListOnly wires a read-only list route (seeded lookup tables).
func registerListOnly[T any](mux *http.ServeMux, log *slog.Logger, basePath, name string, list func() ([]T, error)) {
	mux.HandleFunc("GET "+basePath, listHandler(log, name, list))
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
