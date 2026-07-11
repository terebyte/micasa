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

// Expense records are scoped to their expense for listing/creation and
// addressed directly for update/delete. Scanned bills attach to a record
// through the documents API (entity_kind = "expense_record").
func (h *handlers) registerExpenseRecords(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/expenses/{id}/records", func(w http.ResponseWriter, r *http.Request) {
		records, err := h.store.ListExpenseRecords(r.PathValue("id"), false)
		if err != nil {
			h.log.Error("list expense records", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list expense records")
			return
		}
		writeJSON(w, http.StatusOK, records)
	})

	mux.HandleFunc("POST /api/expenses/{id}/records", func(w http.ResponseWriter, r *http.Request) {
		var record data.ExpenseRecord
		if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
			writeError(w, http.StatusBadRequest, "invalid JSON body")
			return
		}
		record.ID = ""
		record.ExpenseID = r.PathValue("id")
		if err := h.store.CreateExpenseRecord(&record); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) ||
				errors.Is(err, data.ErrParentNotFound) ||
				errors.Is(err, data.ErrParentDeleted) {
				writeError(w, http.StatusNotFound, "expense not found")
				return
			}
			h.log.Error("create expense record", "error", err)
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, record)
	})

	mux.HandleFunc("PUT /api/expense-records/{id}", updateHandler(h.log, "expense record",
		func(rec *data.ExpenseRecord, id string) { rec.ID = id },
		h.store.UpdateExpenseRecord))
	mux.HandleFunc("DELETE /api/expense-records/{id}", deleteHandler(h.log, "expense record", h.store.DeleteExpenseRecord))
}
