// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package main

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/micasa-dev/micasa/internal/notify"
)

// digestHour is the local hour (24h) after which the daily digest fires.
const digestHour = 9

// runReminderLoop sends the daily Discord digest once per day after
// digestHour. It checks hourly; the last-sent date persists in settings so
// restarts do not double-send. No webhook configured or an empty digest
// both mean silence.
func runReminderLoop(ctx context.Context, store *data.Store, log *slog.Logger) {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()

	// Also evaluate once shortly after boot so a restarted server still
	// delivers today's digest.
	first := time.NewTimer(30 * time.Second)
	defer first.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-first.C:
			sendDailyDigest(ctx, store, log)
		case <-ticker.C:
			sendDailyDigest(ctx, store, log)
		}
	}
}

func sendDailyDigest(ctx context.Context, store *data.Store, log *slog.Logger) {
	now := time.Now()
	if now.Hour() < digestHour {
		return
	}
	webhook, err := store.GetSetting(notify.SettingWebhookURL)
	if err != nil {
		log.Error("reminder: read webhook setting", "error", err)
		return
	}
	if webhook == "" {
		return
	}
	today := now.Format("2006-01-02")
	last, err := store.GetSetting(notify.SettingLastDigest)
	if err != nil {
		log.Error("reminder: read last digest date", "error", err)
		return
	}
	if last == today {
		return
	}

	digest, err := notify.BuildDigest(store, now)
	if err != nil {
		log.Error("reminder: build digest", "error", err)
		return
	}
	// Mark the day handled even when there is nothing to report, so the
	// hourly tick does not re-evaluate all day.
	if err := store.PutSetting(notify.SettingLastDigest, today); err != nil {
		log.Error("reminder: save last digest date", "error", err)
		return
	}
	if digest == "" {
		return
	}

	sendCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	if err := notify.Send(sendCtx, http.DefaultClient, webhook, digest); err != nil {
		log.Error("reminder: send digest", "error", err)
		return
	}
	log.Info("reminder: daily digest sent")
}
