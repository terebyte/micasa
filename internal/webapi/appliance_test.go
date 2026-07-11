// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi_test

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/micasa-dev/micasa/internal/webapi"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestServer(t *testing.T) *httptest.Server {
	t.Helper()
	path := filepath.Join(t.TempDir(), "test.db")
	store, err := data.Open(path)
	require.NoError(t, err)
	require.NoError(t, store.SetMaxDocumentSize(50<<20))
	require.NoError(t, store.AutoMigrate())
	require.NoError(t, store.SeedDefaults())
	t.Cleanup(func() { _ = store.Close() })

	srv := httptest.NewServer(webapi.NewRouter(store, slog.New(slog.NewTextHandler(io.Discard, nil))))
	t.Cleanup(srv.Close)
	return srv
}

func decode[T any](t *testing.T, r *http.Response) T {
	t.Helper()
	var v T
	require.NoError(t, json.NewDecoder(r.Body).Decode(&v))
	_ = r.Body.Close()
	return v
}

func TestHealth(t *testing.T) {
	srv := newTestServer(t)
	resp, err := http.Get(srv.URL + "/api/health")
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	body := decode[map[string]string](t, resp)
	assert.Equal(t, "ok", body["status"])
}

func TestApplianceCRUD(t *testing.T) {
	srv := newTestServer(t)
	base := srv.URL + "/api/appliances"

	// Empty list on a fresh database.
	resp, err := http.Get(base)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Empty(t, decode[[]data.Appliance](t, resp))

	// Create (Korean payload; ID is server-generated).
	resp, err = http.Post(base, "application/json",
		bytes.NewBufferString(`{"name":"세탁기","brand":"LG","location":"베란다"}`))
	require.NoError(t, err)
	assert.Equal(t, http.StatusCreated, resp.StatusCode)
	created := decode[data.Appliance](t, resp)
	assert.NotEmpty(t, created.ID)
	assert.Equal(t, "세탁기", created.Name)

	// Get by ID.
	resp, err = http.Get(base + "/" + created.ID)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "LG", decode[data.Appliance](t, resp).Brand)

	// List now has one item.
	resp, err = http.Get(base)
	require.NoError(t, err)
	assert.Len(t, decode[[]data.Appliance](t, resp), 1)

	// Update.
	req, _ := http.NewRequest(http.MethodPut, base+"/"+created.ID, bytes.NewBufferString(
		`{"name":"세탁기 수정","brand":"LG","location":"주방"}`))
	req.Header.Set("Content-Type", "application/json")
	resp, err = http.DefaultClient.Do(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "세탁기 수정", decode[data.Appliance](t, resp).Name)

	// Delete.
	req, _ = http.NewRequest(http.MethodDelete, base+"/"+created.ID, nil)
	resp, err = http.DefaultClient.Do(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)

	// Deleted item is gone.
	resp, err = http.Get(base + "/" + created.ID)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestApplianceErrors(t *testing.T) {
	srv := newTestServer(t)
	base := srv.URL + "/api/appliances"

	// Unknown ID -> 404.
	resp, err := http.Get(base + "/does-not-exist")
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	_ = resp.Body.Close()

	// Malformed JSON -> 400.
	resp, err = http.Post(base, "application/json", bytes.NewBufferString("not json"))
	require.NoError(t, err)
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
	_ = resp.Body.Close()
}
