// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package notify_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/micasa-dev/micasa/internal/notify"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newStore(t *testing.T) *data.Store {
	t.Helper()
	store, err := data.Open(filepath.Join(t.TempDir(), "test.db"))
	require.NoError(t, err)
	require.NoError(t, store.AutoMigrate())
	require.NoError(t, store.SeedDefaults())
	t.Cleanup(func() { _ = store.Close() })
	return store
}

func TestBuildDigestEmpty(t *testing.T) {
	store := newStore(t)
	digest, err := notify.BuildDigest(store, time.Now())
	require.NoError(t, err)
	assert.Empty(t, digest, "nothing to report -> empty digest -> no send")
}

func TestBuildDigestOverdueAndIncident(t *testing.T) {
	store := newStore(t)

	cats, err := store.MaintenanceCategories()
	require.NoError(t, err)
	require.NotEmpty(t, cats)

	past := time.Now().Add(-48 * time.Hour)
	require.NoError(t, store.CreateMaintenance(&data.MaintenanceItem{
		Name:       "세탁조 청소",
		CategoryID: cats[0].ID,
		DueDate:    &past,
	}))
	require.NoError(t, store.CreateIncident(&data.Incident{
		Title:       "욕실 누수",
		Status:      data.IncidentStatusOpen,
		Severity:    data.IncidentSeverityUrgent,
		DateNoticed: time.Now(),
	}))

	digest, err := notify.BuildDigest(store, time.Now())
	require.NoError(t, err)
	assert.Contains(t, digest, "세탁조 청소")
	assert.Contains(t, digest, "지연된 유지보수")
	assert.Contains(t, digest, "욕실 누수")
}

func TestSend(t *testing.T) {
	var got map[string]string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		require.NoError(t, json.NewDecoder(r.Body).Decode(&got))
		w.WriteHeader(http.StatusNoContent)
	}))
	defer srv.Close()

	err := notify.Send(context.Background(), srv.Client(), srv.URL, "hello")
	require.NoError(t, err)
	assert.Equal(t, "hello", got["content"])
}

func TestSendHTTPError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusForbidden)
	}))
	defer srv.Close()

	err := notify.Send(context.Background(), srv.Client(), srv.URL, "hello")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "403")
}
