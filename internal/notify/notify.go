// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

// Package notify sends home-status digests to a Discord webhook. The
// webhook URL lives in settings (single-file backup principle); when it
// is unset or the digest is empty, nothing is sent (silence is success).
package notify

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/micasa-dev/micasa/internal/data"
)

// Setting keys (see internal/data settings conventions).
const (
	SettingWebhookURL = "notify.discord_webhook"
	SettingLastDigest = "notify.last_digest"
)

// upcomingWindow is how far ahead the digest looks for due maintenance.
const upcomingWindow = 7 * 24 * time.Hour

// Send posts content to a Discord-compatible webhook.
func Send(ctx context.Context, client *http.Client, webhookURL, content string) error {
	payload, err := json.Marshal(map[string]string{"content": content})
	if err != nil {
		return fmt.Errorf("marshal webhook payload: %w", err)
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("build webhook request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("post webhook: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned HTTP %d", resp.StatusCode)
	}
	return nil
}

// BuildDigest assembles the daily Korean-language home digest: overdue
// maintenance, maintenance due within a week, and open incidents. Returns
// "" when there is nothing to report. (User-facing text is Korean by
// design; the web UI is Korean-first.)
func BuildDigest(store *data.Store, now time.Time) (string, error) {
	items, err := store.ListMaintenanceWithSchedule()
	if err != nil {
		return "", fmt.Errorf("list maintenance: %w", err)
	}
	incidents, err := store.ListOpenIncidents()
	if err != nil {
		return "", fmt.Errorf("list incidents: %w", err)
	}

	var overdue, upcoming []data.MaintenanceItem
	horizon := now.Add(upcomingWindow)
	for _, m := range items {
		if m.DueDate == nil {
			continue
		}
		switch {
		case m.DueDate.Before(now):
			overdue = append(overdue, m)
		case m.DueDate.Before(horizon):
			upcoming = append(upcoming, m)
		}
	}

	if len(overdue) == 0 && len(upcoming) == 0 && len(incidents) == 0 {
		return "", nil
	}

	var b strings.Builder
	b.WriteString("🏠 **micasa 아침 브리핑** (" + now.Format("2006-01-02") + ")\n")
	writeSection(&b, "⏰ 지연된 유지보수", overdue)
	writeSection(&b, "📅 7일 내 예정", upcoming)
	if len(incidents) > 0 {
		fmt.Fprintf(&b, "\n🚨 **미해결 문제** (%d)\n", len(incidents))
		for _, i := range incidents {
			fmt.Fprintf(&b, "- %s\n", i.Title)
		}
	}
	return strings.TrimRight(b.String(), "\n"), nil
}

func writeSection(b *strings.Builder, title string, items []data.MaintenanceItem) {
	if len(items) == 0 {
		return
	}
	fmt.Fprintf(b, "\n**%s** (%d)\n", title, len(items))
	for _, m := range items {
		fmt.Fprintf(b, "- %s (%s)\n", m.Name, m.DueDate.Format("2006-01-02"))
	}
}
