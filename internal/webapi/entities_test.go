// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"testing"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func doJSON(t *testing.T, method, url string, body string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(method, url, bytes.NewBufferString(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

// TestVendorCRUD exercises the generic entity registrar end to end; the
// other standard entities share the exact same code path.
func TestVendorCRUD(t *testing.T) {
	srv := newTestServer(t)
	base := srv.URL + "/api/vendors"

	resp := doJSON(t, http.MethodPost, base, `{"name":"한빛설비","phone":"010-1234-5678"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	created := decode[data.Vendor](t, resp)
	assert.NotEmpty(t, created.ID)

	resp = doJSON(t, http.MethodPut, base+"/"+created.ID, `{"name":"한빛설비(수정)"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "한빛설비(수정)", decode[data.Vendor](t, resp).Name)

	req, _ := http.NewRequest(http.MethodDelete, base+"/"+created.ID, nil)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
}

func TestQuoteWithVendorName(t *testing.T) {
	srv := newTestServer(t)

	// Quotes need a project; project types are seeded.
	resp, err := http.Get(srv.URL + "/api/project-types")
	require.NoError(t, err)
	types := decode[[]data.ProjectType](t, resp)
	require.NotEmpty(t, types)

	resp = doJSON(t, http.MethodPost, srv.URL+"/api/projects",
		`{"title":"주방 리모델링","project_type_id":"`+types[0].ID+`","status":"planned"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	project := decode[data.Project](t, resp)

	// vendor_name triggers find-or-create on the vendor.
	resp = doJSON(t, http.MethodPost, srv.URL+"/api/quotes",
		`{"project_id":"`+project.ID+`","total_cents":150000000,"vendor_name":"믿음인테리어"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	quote := decode[data.Quote](t, resp)
	assert.NotEmpty(t, quote.VendorID)

	resp, err = http.Get(srv.URL + "/api/vendors")
	require.NoError(t, err)
	vendors := decode[[]data.Vendor](t, resp)
	require.Len(t, vendors, 1)
	assert.Equal(t, "믿음인테리어", vendors[0].Name)
}

func TestHouseUpsert(t *testing.T) {
	srv := newTestServer(t)

	resp, err := http.Get(srv.URL + "/api/house")
	require.NoError(t, err)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	_ = resp.Body.Close()

	resp = doJSON(t, http.MethodPut, srv.URL+"/api/house", `{"nickname":"우리집","city":"서울"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	created := decode[data.HouseProfile](t, resp)
	assert.Equal(t, "우리집", created.Nickname)

	resp = doJSON(t, http.MethodPut, srv.URL+"/api/house", `{"nickname":"새 집","city":"서울"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	assert.Equal(t, "새 집", decode[data.HouseProfile](t, resp).Nickname)
}

func TestDashboard(t *testing.T) {
	srv := newTestServer(t)
	resp, err := http.Get(srv.URL + "/api/dashboard")
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var body struct {
		Counts map[string]int `json:"counts"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	_ = resp.Body.Close()
	assert.Contains(t, body.Counts, data.TableAppliances)
}

func TestSettingsRoundTrip(t *testing.T) {
	srv := newTestServer(t)

	resp := doJSON(t, http.MethodPut, srv.URL+"/api/settings",
		`{"currency":"KRW","unit_system":"metric","show_dashboard":true}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var got struct {
		Currency      string `json:"currency"`
		UnitSystem    string `json:"unit_system"`
		ShowDashboard bool   `json:"show_dashboard"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&got))
	_ = resp.Body.Close()
	assert.Equal(t, "KRW", got.Currency)
	assert.Equal(t, "metric", got.UnitSystem)
	assert.True(t, got.ShowDashboard)
}

func TestSearchEmptyQuery(t *testing.T) {
	srv := newTestServer(t)
	resp, err := http.Get(srv.URL + "/api/search?q=")
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var results []map[string]string
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&results))
	_ = resp.Body.Close()
	assert.Empty(t, results)
}

func TestDocumentUploadDownload(t *testing.T) {
	srv := newTestServer(t)

	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	require.NoError(t, mw.WriteField("title", "설명서"))
	part, err := mw.CreateFormFile("file", "manual.txt")
	require.NoError(t, err)
	_, err = part.Write([]byte("wash at 40 degrees"))
	require.NoError(t, err)
	require.NoError(t, mw.Close())

	resp, err := http.Post(srv.URL+"/api/documents", mw.FormDataContentType(), &buf)
	require.NoError(t, err)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	doc := decode[data.Document](t, resp)
	assert.Equal(t, "설명서", doc.Title)
	assert.Equal(t, int64(18), doc.SizeBytes)

	resp, err = http.Get(srv.URL + "/api/documents/" + doc.ID + "/download")
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	payload := new(bytes.Buffer)
	_, err = payload.ReadFrom(resp.Body)
	require.NoError(t, err)
	_ = resp.Body.Close()
	assert.Equal(t, "wash at 40 degrees", payload.String())
}
