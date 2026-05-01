package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/grafana/grafana/pkg/web"
)

func BenchmarkGziper(b *testing.B) {
	body := strings.Repeat(`{"id":1,"uid":"abc","title":"Dashboard","tags":["monitoring"]}`, 100)

	m := web.New()
	m.UseMiddleware(Gziper())
	m.Get("/api/search", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(body))
	})

	req := httptest.NewRequest(http.MethodGet, "/api/search", nil)
	req.Header.Set("Accept-Encoding", "gzip")

	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		rec := httptest.NewRecorder()
		m.ServeHTTP(rec, req)
	}
}
