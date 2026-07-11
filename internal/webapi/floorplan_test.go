// Copyright 2026 Phillip Cloud
// Licensed under the Apache License, Version 2.0

package webapi_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/micasa-dev/micasa/internal/data"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRoomCRUDAndMarkerDetach(t *testing.T) {
	srv := newTestServer(t)

	resp := doJSON(t, http.MethodPost, srv.URL+"/api/rooms", `{"name":"거실","floor":8}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	room := decode[data.Room](t, resp)

	resp = doJSON(t, http.MethodPost, srv.URL+"/api/floorplans", `{"name":"우리집 8층","floor":8}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	plan := decode[data.FloorPlan](t, resp)

	resp = doJSON(t, http.MethodPost, srv.URL+"/api/floorplans/"+plan.ID+"/markers",
		`{"x":25.5,"y":40,"label":"거실","kind":"room","room_id":"`+room.ID+`"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	marker := decode[data.PlanMarker](t, resp)
	require.NotNil(t, marker.RoomID)

	// Deleting the room detaches the marker instead of orphaning it.
	req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/api/rooms/"+room.ID, nil)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusNoContent, resp.StatusCode)

	resp, err = http.Get(srv.URL + "/api/floorplans/" + plan.ID + "/markers")
	require.NoError(t, err)
	markers := decode[[]data.PlanMarker](t, resp)
	require.Len(t, markers, 1)
	assert.Nil(t, markers[0].RoomID)
	assert.Equal(t, "거실", markers[0].Label)
}

func TestFloorPlanDeleteCascadesMarkers(t *testing.T) {
	srv := newTestServer(t)

	resp := doJSON(t, http.MethodPost, srv.URL+"/api/floorplans", `{"name":"본채"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)
	plan := decode[data.FloorPlan](t, resp)

	resp = doJSON(t, http.MethodPost, srv.URL+"/api/floorplans/"+plan.ID+"/markers",
		`{"x":10,"y":10,"label":"조명","kind":"ha","ha_entity":"light.living"}`)
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	req, _ := http.NewRequest(http.MethodDelete, srv.URL+"/api/floorplans/"+plan.ID, nil)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	require.Equal(t, http.StatusNoContent, resp.StatusCode)

	resp, err = http.Get(srv.URL + "/api/floorplans/" + plan.ID + "/markers")
	require.NoError(t, err)
	assert.Empty(t, decode[[]data.PlanMarker](t, resp))
}

func TestMarkerOnMissingPlan(t *testing.T) {
	srv := newTestServer(t)
	resp := doJSON(t, http.MethodPost, srv.URL+"/api/floorplans/nope/markers",
		`{"x":1,"y":1,"label":"x","kind":"ha"}`)
	assert.Equal(t, http.StatusNotFound, resp.StatusCode)
	_ = resp.Body.Close()
}

func TestHAProxy(t *testing.T) {
	srv := newTestServer(t)

	// Not configured -> 422.
	resp, err := http.Get(srv.URL + "/api/ha/status")
	require.NoError(t, err)
	assert.Equal(t, http.StatusUnprocessableEntity, resp.StatusCode)
	_ = resp.Body.Close()

	// Mock HA that checks the bearer token.
	var toggled string
	ha := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-token" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		switch r.URL.Path {
		case "/api/":
			_, _ = w.Write([]byte(`{"message":"API running."}`))
		case "/api/states":
			_, _ = w.Write([]byte(`[
				{"entity_id":"light.living","state":"on","attributes":{}},
				{"entity_id":"switch.fan","state":"off","attributes":{}},
				{"entity_id":"light.bedroom","state":"off","attributes":{}}
			]`))
		case "/api/services/homeassistant/toggle":
			var body map[string]string
			_ = json.NewDecoder(r.Body).Decode(&body)
			toggled = body["entity_id"]
			_, _ = w.Write([]byte(`[]`))
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ha.Close()

	resp = doJSON(t, http.MethodPut, srv.URL+"/api/settings",
		`{"ha_url":"`+ha.URL+`","ha_token":"test-token"}`)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()

	resp, err = http.Get(srv.URL + "/api/ha/status")
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp.StatusCode)
	_ = resp.Body.Close()

	// Filtered states.
	resp, err = http.Get(srv.URL + "/api/ha/states?ids=light.living,switch.fan")
	require.NoError(t, err)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var states []map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&states))
	_ = resp.Body.Close()
	assert.Len(t, states, 2)

	// Toggle.
	resp = doJSON(t, http.MethodPost, srv.URL+"/api/ha/toggle", `{"entity_id":"light.living"}`)
	assert.Equal(t, http.StatusNoContent, resp.StatusCode)
	_ = resp.Body.Close()
	assert.Equal(t, "light.living", toggled)
}
