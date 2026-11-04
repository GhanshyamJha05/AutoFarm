package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func main() {
	log.Println("Autofarm API listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", newHandler()))
}

func newHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	return mux
}
