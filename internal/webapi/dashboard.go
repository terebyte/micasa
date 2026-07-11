// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import (
	"net/http"
	"time"

	"github.com/micasa-dev/micasa/internal/data"
)

// Warranty window mirrors the TUI dashboard: expired within the last 30
// days or expiring within the next 90.
const (
	warrantyLookBack = 30 * 24 * time.Hour
	warrantyHorizon  = 90 * 24 * time.Hour
	recentLogLimit   = 5
)

type dashboardResponse struct {
	Maintenance            []data.MaintenanceItem `json:"maintenance"`
	ActiveProjects         []data.Project         `json:"active_projects"`
	OpenIncidents          []data.Incident        `json:"open_incidents"`
	ExpiringWarranties     []data.Appliance       `json:"expiring_warranties"`
	RecentServiceLogs      []data.ServiceLogEntry `json:"recent_service_logs"`
	LowStockConsumables    []data.Consumable      `json:"low_stock_consumables"`
	YTDServiceSpendCents   int64                  `json:"ytd_service_spend_cents"`
	TotalProjectSpendCents int64                  `json:"total_project_spend_cents"`
	MonthlyFixedCostCents  int64                  `json:"monthly_fixed_cost_cents"`
	Counts                 map[string]int         `json:"counts"`
}

func (h *handlers) dashboard(w http.ResponseWriter, _ *http.Request) {
	now := time.Now()
	resp := dashboardResponse{}

	fail := func(what string, err error) bool {
		if err != nil {
			h.log.Error("dashboard: "+what, "error", err)
			writeError(w, http.StatusInternalServerError, "failed to load dashboard: "+what)
			return true
		}
		return false
	}

	var err error
	if resp.Maintenance, err = h.store.ListMaintenanceWithSchedule(); fail("maintenance", err) {
		return
	}
	if resp.ActiveProjects, err = h.store.ListActiveProjects(); fail("projects", err) {
		return
	}
	if resp.OpenIncidents, err = h.store.ListOpenIncidents(); fail("incidents", err) {
		return
	}
	if resp.ExpiringWarranties, err = h.store.ListExpiringWarranties(now, warrantyLookBack, warrantyHorizon); fail("warranties", err) {
		return
	}
	if resp.RecentServiceLogs, err = h.store.ListRecentServiceLogs(recentLogLimit); fail("service logs", err) {
		return
	}
	yearStart := time.Date(now.Year(), time.January, 1, 0, 0, 0, 0, now.Location())
	if resp.YTDServiceSpendCents, err = h.store.YTDServiceSpendCents(yearStart); fail("ytd spend", err) {
		return
	}
	if resp.TotalProjectSpendCents, err = h.store.TotalProjectSpendCents(); fail("project spend", err) {
		return
	}
	if resp.LowStockConsumables, err = h.store.ListLowStockConsumables(); fail("consumables", err) {
		return
	}
	if resp.MonthlyFixedCostCents, err = h.store.MonthlyFixedCostCents(); fail("fixed cost", err) {
		return
	}

	counts, err := h.store.RowCounts(
		data.TableAppliances,
		data.TableMaintenanceItems,
		data.TableProjects,
		data.TableQuotes,
		data.TableVendors,
		data.TableIncidents,
		data.TableServiceLogEntries,
		data.TableDocuments,
		data.TableAssets,
		data.TableConsumables,
	)
	if fail("counts", err) {
		return
	}
	resp.Counts = counts

	writeJSON(w, http.StatusOK, resp)
}
