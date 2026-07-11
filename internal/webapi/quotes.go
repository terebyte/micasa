// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/micasa-dev/micasa/internal/data"
	"gorm.io/gorm"
)

// Quotes and service logs take a vendor value alongside the entity so the
// store can find-or-create the vendor by name (mirrors the TUI forms).
// The payload embeds the entity plus a vendor_name field.

type quotePayload struct {
	data.Quote
	VendorName string `json:"vendor_name"`
}

type serviceLogPayload struct {
	data.ServiceLogEntry
	VendorName string `json:"vendor_name"`
}

func vendorFor(name string) data.Vendor {
	return data.Vendor{Name: strings.TrimSpace(name)}
}

func (h *handlers) registerQuotes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/quotes", listHandler(h.log, "quote",
		func() ([]data.Quote, error) { return h.store.ListQuotes(false) }))
	mux.HandleFunc("GET /api/quotes/{id}", getHandler(h.log, "quote", h.store.GetQuote))
	mux.HandleFunc("DELETE /api/quotes/{id}", deleteHandler(h.log, "quote", h.store.DeleteQuote))

	mux.HandleFunc("POST /api/quotes", func(w http.ResponseWriter, r *http.Request) {
		var p quotePayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		p.Quote.ID = ""
		if err := h.store.CreateQuote(&p.Quote, vendorFor(p.VendorName)); err != nil {
			h.log.Error("create quote", "error", err)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, p.Quote)
	})

	mux.HandleFunc("PUT /api/quotes/{id}", func(w http.ResponseWriter, r *http.Request) {
		var p quotePayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		p.Quote.ID = r.PathValue("id")
		if err := h.store.UpdateQuote(p.Quote, vendorFor(p.VendorName)); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				writeError(w, http.StatusNotFound, "quote not found")
				return
			}
			h.log.Error("update quote", "error", err, "id", p.Quote.ID)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, p.Quote)
	})
}

func (h *handlers) registerServiceLogs(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/service-logs", listHandler(h.log, "service log",
		func() ([]data.ServiceLogEntry, error) { return h.store.ListAllServiceLogEntries(false) }))
	mux.HandleFunc("GET /api/service-logs/{id}", getHandler(h.log, "service log", h.store.GetServiceLog))
	mux.HandleFunc("DELETE /api/service-logs/{id}", deleteHandler(h.log, "service log", h.store.DeleteServiceLog))

	mux.HandleFunc("POST /api/service-logs", func(w http.ResponseWriter, r *http.Request) {
		var p serviceLogPayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		p.ServiceLogEntry.ID = ""
		if err := h.store.CreateServiceLog(&p.ServiceLogEntry, vendorFor(p.VendorName)); err != nil {
			h.log.Error("create service log", "error", err)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, p.ServiceLogEntry)
	})

	mux.HandleFunc("PUT /api/service-logs/{id}", func(w http.ResponseWriter, r *http.Request) {
		var p serviceLogPayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		p.ServiceLogEntry.ID = r.PathValue("id")
		if err := h.store.UpdateServiceLog(p.ServiceLogEntry, vendorFor(p.VendorName)); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				writeError(w, http.StatusNotFound, "service log not found")
				return
			}
			h.log.Error("update service log", "error", err, "id", p.ServiceLogEntry.ID)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, p.ServiceLogEntry)
	})
}
