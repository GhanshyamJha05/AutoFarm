package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthEndpoint(t *testing.T) {
	server := NewServer()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()

	server.Routes().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var res map[string]string
	_ = json.NewDecoder(w.Body).Decode(&res)
	if res["status"] != "ok" {
		t.Fatalf("expected status ok, got %s", res["status"])
	}
}

func TestAuthAndCloudSaves(t *testing.T) {
	server := NewServer()

	// 1. Register
	regBody, _ := json.Marshal(map[string]string{
		"email":        "farmer@autofarm.io",
		"password":     "supersecret123",
		"display_name": "AgriDev",
	})
	w := httptest.NewRecorder()
	server.Routes().ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewReader(regBody)))

	if w.Code != http.StatusCreated {
		t.Fatalf("registration failed, got %d", w.Code)
	}

	var authRes struct {
		Token string `json:"token"`
		User  User   `json:"user"`
	}
	_ = json.NewDecoder(w.Body).Decode(&authRes)
	if authRes.Token == "" || authRes.User.DisplayName != "AgriDev" {
		t.Fatalf("invalid auth response: %+v", authRes)
	}

	// 2. Sync Save Slot
	saveBody, _ := json.Marshal(CloudSave{
		Code:          "plant('hay')",
		CurrentLevel:  "lvl_01",
		UnlockedNodes: []string{"t1_grass_harvest"},
		Coins:         100,
	})
	reqSave := httptest.NewRequest(http.MethodPost, "/api/saves/sync", bytes.NewReader(saveBody))
	reqSave.Header.Set("Authorization", "Bearer "+authRes.Token)
	wSave := httptest.NewRecorder()
	server.Routes().ServeHTTP(wSave, reqSave)

	if wSave.Code != http.StatusOK {
		t.Fatalf("save sync failed: %d (%s)", wSave.Code, wSave.Body.String())
	}

	// 3. Load Save Slot
	reqLoad := httptest.NewRequest(http.MethodGet, "/api/saves/load", nil)
	reqLoad.Header.Set("Authorization", "Bearer "+authRes.Token)
	wLoad := httptest.NewRecorder()
	server.Routes().ServeHTTP(wLoad, reqLoad)

	if wLoad.Code != http.StatusOK {
		t.Fatalf("save load failed: %d", wLoad.Code)
	}
	var loaded struct {
		Save CloudSave `json:"save"`
	}
	_ = json.NewDecoder(wLoad.Body).Decode(&loaded)
	if loaded.Save.Coins != 100 || loaded.Save.CurrentLevel != "lvl_01" {
		t.Fatalf("loaded save mismatch: %+v", loaded.Save)
	}
}

func TestAntiCheatReplayVerificationAndLeaderboard(t *testing.T) {
	server := NewServer()

	// Legitimate score submission
	validReq, _ := json.Marshal(ReplayVerificationRequest{
		LevelID:         "lvl_01",
		Code:            "plant('hay')\nmove('east')",
		Seed:            1337,
		ClaimedTicks:    400,
		InitialGridSize: 3,
	})

	w := httptest.NewRecorder()
	server.Routes().ServeHTTP(w, httptest.NewRequest(http.MethodPost, "/api/leaderboard/submit", bytes.NewReader(validReq)))
	if w.Code != http.StatusOK {
		t.Fatalf("score submission failed: %d (%s)", w.Code, w.Body.String())
	}

	// Tampered / Impossible score (claiming 1 tick for 10 movements)
	hackedReq, _ := json.Marshal(ReplayVerificationRequest{
		LevelID: "lvl_01",
		Code: `
move('east')
move('east')
move('east')
move('east')
move('east')
`,
		Seed:            1337,
		ClaimedTicks:    1, // Physically impossible!
		InitialGridSize: 3,
	})

	wHacked := httptest.NewRecorder()
	server.Routes().ServeHTTP(wHacked, httptest.NewRequest(http.MethodPost, "/api/leaderboard/submit", bytes.NewReader(hackedReq)))
	if wHacked.Code != http.StatusForbidden {
		t.Fatalf("expected 403 Forbidden for tampered score, got %d", wHacked.Code)
	}
}
