package main

import (
	"encoding/json"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type Store struct {
	mu           sync.RWMutex
	users        map[string]*User             // id -> user
	usersByEmail map[string]*User             // email -> user
	sessions     map[string]string            // sessionToken -> userId
	saves        map[string]*CloudSave        // userId -> save
	leaderboards map[string][]*LeaderboardEntry // levelId -> entries
}

func NewStore() *Store {
	return &Store{
		users:        make(map[string]*User),
		usersByEmail: make(map[string]*User),
		sessions:     make(map[string]string),
		saves:        make(map[string]*CloudSave),
		leaderboards: make(map[string][]*LeaderboardEntry),
	}
}

type Server struct {
	store *Store
}

func NewServer() *Server {
	return &Server{store: NewStore()}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()

	// Health
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("GET /health", s.handleHealth)

	// Auth
	mux.HandleFunc("POST /api/auth/register", s.handleRegister)
	mux.HandleFunc("POST /api/auth/login", s.handleLogin)
	mux.HandleFunc("POST /api/auth/guest", s.handleGuest)
	mux.HandleFunc("GET /api/auth/me", s.handleMe)

	// Saves
	mux.HandleFunc("POST /api/saves/sync", s.handleSaveSync)
	mux.HandleFunc("GET /api/saves/load", s.handleSaveLoad)

	// Leaderboards & Verification
	mux.HandleFunc("GET /api/leaderboard/{levelId}", s.handleGetLeaderboard)
	mux.HandleFunc("POST /api/leaderboard/submit", s.handleSubmitScore)
	mux.HandleFunc("POST /api/verify", s.handleVerifyReplay)

	return s.corsMiddleware(mux)
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "autofarm-api"})
}

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"display_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Email == "" || len(body.Password) < 6 {
		writeError(w, http.StatusBadRequest, "Email required and password must be at least 6 characters")
		return
	}

	s.store.mu.Lock()
	defer s.store.mu.Unlock()

	if _, exists := s.store.usersByEmail[body.Email]; exists {
		writeError(w, http.StatusConflict, "Email is already registered")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	name := body.DisplayName
	if name == "" {
		name = strings.Split(body.Email, "@")[0]
	}

	user := &User{
		ID:           uuid.New().String(),
		Email:        body.Email,
		DisplayName:  name,
		PasswordHash: string(hash),
		IsGuest:      false,
		CreatedAt:    time.Now().UTC(),
	}

	s.store.users[user.ID] = user
	s.store.usersByEmail[user.Email] = user

	token := uuid.New().String()
	s.store.sessions[token] = user.ID

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, http.StatusCreated, map[string]interface{}{"user": user, "token": token})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	s.store.mu.Lock()
	defer s.store.mu.Unlock()

	user, exists := s.store.usersByEmail[strings.ToLower(body.Email)]
	if !exists {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(body.Password)); err != nil {
		writeError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token := uuid.New().String()
	s.store.sessions[token] = user.ID

	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	writeJSON(w, http.StatusOK, map[string]interface{}{"user": user, "token": token})
}

func (s *Server) handleGuest(w http.ResponseWriter, _ *http.Request) {
	s.store.mu.Lock()
	defer s.store.mu.Unlock()

	guestID := uuid.New().String()
	user := &User{
		ID:          guestID,
		Email:       "",
		DisplayName: "Guest Operator",
		IsGuest:     true,
		CreatedAt:   time.Now().UTC(),
	}

	s.store.users[user.ID] = user
	token := uuid.New().String()
	s.store.sessions[token] = user.ID

	writeJSON(w, http.StatusCreated, map[string]interface{}{"user": user, "token": token})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	user := s.getUserFromRequest(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleSaveSync(w http.ResponseWriter, r *http.Request) {
	user := s.getUserFromRequest(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	var save CloudSave
	if err := json.NewDecoder(r.Body).Decode(&save); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid save payload")
		return
	}

	save.UserID = user.ID
	save.UpdatedAt = time.Now().UTC()

	s.store.mu.Lock()
	s.store.saves[user.ID] = &save
	s.store.mu.Unlock()

	writeJSON(w, http.StatusOK, map[string]interface{}{"status": "synced", "save": save})
}

func (s *Server) handleSaveLoad(w http.ResponseWriter, r *http.Request) {
	user := s.getUserFromRequest(r)
	if user == nil {
		writeError(w, http.StatusUnauthorized, "Not authenticated")
		return
	}

	s.store.mu.RLock()
	save, exists := s.store.saves[user.ID]
	s.store.mu.RUnlock()

	if !exists {
		writeJSON(w, http.StatusOK, map[string]interface{}{"save": nil})
		return
	}
	writeJSON(w, http.StatusOK, map[string]interface{}{"save": save})
}

func (s *Server) handleGetLeaderboard(w http.ResponseWriter, r *http.Request) {
	levelID := r.PathValue("levelId")
	if levelID == "" {
		writeError(w, http.StatusBadRequest, "Missing level ID")
		return
	}

	s.store.mu.RLock()
	entries := s.store.leaderboards[levelID]
	s.store.mu.RUnlock()

	if entries == nil {
		entries = []*LeaderboardEntry{}
	}

	writeJSON(w, http.StatusOK, map[string]interface{}{"level_id": levelID, "entries": entries})
}

func (s *Server) handleSubmitScore(w http.ResponseWriter, r *http.Request) {
	user := s.getUserFromRequest(r)
	displayName := "Anonymous Drone"
	userID := "anon"
	if user != nil {
		displayName = user.DisplayName
		userID = user.ID
	}

	var req ReplayVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid submission")
		return
	}

	// Server anti-cheat re-verification
	verification := VerifyReplay(req)
	if !verification.Valid {
		writeError(w, http.StatusForbidden, "Score rejected: "+verification.Reason)
		return
	}

	entry := &LeaderboardEntry{
		ID:          uuid.New().String(),
		LevelID:     req.LevelID,
		UserID:      userID,
		DisplayName: displayName,
		Ticks:       req.ClaimedTicks,
		Code:        req.Code,
		Verified:    true,
		CreatedAt:   time.Now().UTC(),
	}

	s.store.mu.Lock()
	board := s.store.leaderboards[req.LevelID]
	board = append(board, entry)

	// Sort ascending by fewest ticks
	sort.Slice(board, func(i, j int) bool {
		return board[i].Ticks < board[j].Ticks
	})

	if len(board) > 100 {
		board = board[:100]
	}
	s.store.leaderboards[req.LevelID] = board
	s.store.mu.Unlock()

	writeJSON(w, http.StatusOK, map[string]interface{}{
		"status":       "accepted",
		"verification": verification,
		"entry":        entry,
	})
}

func (s *Server) handleVerifyReplay(w http.ResponseWriter, r *http.Request) {
	var req ReplayVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	res := VerifyReplay(req)
	writeJSON(w, http.StatusOK, res)
}

func (s *Server) getUserFromRequest(r *http.Request) *User {
	var token string
	if cookie, err := r.Cookie("session_token"); err == nil {
		token = cookie.Value
	}
	if token == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			token = strings.TrimPrefix(authHeader, "Bearer ")
		}
	}
	if token == "" {
		return nil
	}

	s.store.mu.RLock()
	userID, exists := s.store.sessions[token]
	if !exists {
		s.store.mu.RUnlock()
		return nil
	}
	user := s.store.users[userID]
	s.store.mu.RUnlock()
	return user
}

func writeJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
