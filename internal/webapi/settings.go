// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/micasa-dev/micasa/internal/notify"
)

type settingsResponse struct {
	Currency          string `json:"currency"`
	UnitSystem        string `json:"unit_system"`
	ShowDashboard     bool   `json:"show_dashboard"`
	DiscordWebhookURL string `json:"discord_webhook_url"`
}

// settingsUpdate uses pointers so PUT can be partial: only supplied fields
// are written.
type settingsUpdate struct {
	Currency          *string `json:"currency"`
	UnitSystem        *string `json:"unit_system"`
	ShowDashboard     *bool   `json:"show_dashboard"`
	DiscordWebhookURL *string `json:"discord_webhook_url"`
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
		webhook, err := h.store.GetSetting(notify.SettingWebhookURL)
		if err != nil {
			h.log.Error("get discord webhook", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to read settings")
			return
		}
		writeJSON(w, http.StatusOK, settingsResponse{
			Currency:          currency,
			UnitSystem:        units.String(),
			ShowDashboard:     show,
			DiscordWebhookURL: webhook,
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
		if upd.DiscordWebhookURL != nil {
			if err := h.store.PutSetting(notify.SettingWebhookURL, *upd.DiscordWebhookURL); err != nil {
				h.log.Error("put discord webhook", "error", err)
				writeError(w, http.StatusUnprocessableEntity, err.Error())
				return
			}
		}
		read(w)
	})

	// Sends a test message to the saved webhook so users can verify the
	// Discord wiring from the settings screen.
	mux.HandleFunc("POST /api/notify/test", func(w http.ResponseWriter, r *http.Request) {
		webhook, err := h.store.GetSetting(notify.SettingWebhookURL)
		if err != nil {
			h.log.Error("get discord webhook", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to read settings")
			return
		}
		if webhook == "" {
			writeError(w, http.StatusUnprocessableEntity, "discord webhook url is not set")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()
		if err := notify.Send(ctx, http.DefaultClient, webhook,
			"✅ micasa 알림 연결 테스트 - 이 메시지가 보이면 성공!"); err != nil {
			h.log.Error("send test notification", "error", err)
			writeError(w, http.StatusBadGateway, err.Error())
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
