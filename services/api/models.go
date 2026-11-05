package main

import "time"

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	DisplayName  string    `json:"display_name"`
	PasswordHash string    `json:"-"`
	IsGuest      bool      `json:"is_guest"`
	CreatedAt    time.Time `json:"created_at"`
}

type CloudSave struct {
	UserID        string                 `json:"user_id"`
	Code          string                 `json:"code"`
	CurrentLevel  string                 `json:"current_level"`
	UnlockedNodes []string               `json:"unlocked_nodes"`
	Inventory     map[string]int         `json:"inventory"`
	Coins         int                    `json:"coins"`
	Progress      map[string]interface{} `json:"progress"`
	UpdatedAt     time.Time              `json:"updated_at"`
}

type LeaderboardEntry struct {
	ID          string    `json:"id"`
	LevelID     string    `json:"level_id"`
	UserID      string    `json:"user_id"`
	DisplayName string    `json:"display_name"`
	Ticks       int       `json:"ticks"`
	Code        string    `json:"code"`
	Verified    bool      `json:"verified"`
	CreatedAt   time.Time `json:"created_at"`
}

type ReplayVerificationRequest struct {
	LevelID         string         `json:"level_id"`
	Code            string         `json:"code"`
	Seed            int            `json:"seed"`
	ClaimedTicks    int            `json:"claimed_ticks"`
	InitialGridSize int            `json:"initial_grid_size"`
	FinalInventory  map[string]int `json:"final_inventory"`
}

type ReplayVerificationResult struct {
	Valid          bool   `json:"valid"`
	SimulatedTicks int    `json:"simulated_ticks"`
	Reason         string `json:"reason"`
}
