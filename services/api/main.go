package main

import (
	"log"
	"net/http"
	"os"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := NewServer()
	log.Printf("Autofarm API running on port :%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, server.Routes()))
}

func newHandler() http.Handler {
	return NewServer().Routes()
}
