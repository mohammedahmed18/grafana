package response

import (
	"net/http"
	"testing"
	"time"
)

type benchHit struct {
	ID          int64    `json:"id"`
	UID         string   `json:"uid"`
	OrgID       int64    `json:"orgId"`
	Title       string   `json:"title"`
	URI         string   `json:"uri"`
	URL         string   `json:"url"`
	Slug        string   `json:"slug"`
	Type        string   `json:"type"`
	Tags        []string `json:"tags"`
	IsStarred   bool     `json:"isStarred"`
	Description string   `json:"description,omitempty"`
	FolderID    int64    `json:"folderId,omitempty"`
	FolderUID   string   `json:"folderUid,omitempty"`
	FolderTitle string   `json:"folderTitle,omitempty"`
	FolderURL   string   `json:"folderUrl,omitempty"`
	SortMeta    int64    `json:"sortMeta"`
}

func generateHits(n int) []*benchHit {
	hits := make([]*benchHit, n)
	for i := range n {
		hits[i] = &benchHit{
			ID:          int64(i),
			UID:         "dash-uid-" + time.Now().Format("20060102") + "-" + string(rune('a'+i%26)),
			OrgID:       1,
			Title:       "Dashboard Title Number " + string(rune('A'+i%26)),
			URI:         "db/dashboard-" + string(rune('a'+i%26)),
			URL:         "/d/dash-uid/dashboard-title",
			Slug:        "dashboard-title",
			Type:        "dash-db",
			Tags:        []string{"tag1", "tag2", "monitoring"},
			IsStarred:   i%3 == 0,
			FolderUID:   "folder-uid-1",
			FolderTitle: "My Folder",
			FolderURL:   "/dashboards/f/folder-uid-1/my-folder",
		}
	}
	return hits
}

func BenchmarkRespondJSON_SmallPayload(b *testing.B) {
	payload := map[string]any{
		"status":  "success",
		"slug":    "my-dashboard",
		"version": 2,
		"id":      42,
		"uid":     "abc123",
		"url":     "/d/abc123/my-dashboard",
	}
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		resp := JSON(http.StatusOK, payload)
		_ = resp.Body()
	}
}

func BenchmarkRespondJSON_SearchResults100(b *testing.B) {
	hits := generateHits(100)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		resp := JSON(http.StatusOK, hits)
		_ = resp.Body()
	}
}

func BenchmarkRespondJSON_SearchResults1000(b *testing.B) {
	hits := generateHits(1000)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		resp := JSON(http.StatusOK, hits)
		_ = resp.Body()
	}
}

func BenchmarkRespondJSON_SearchResults5000(b *testing.B) {
	hits := generateHits(5000)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		resp := JSON(http.StatusOK, hits)
		_ = resp.Body()
	}
}

func BenchmarkRespond_RawBytes(b *testing.B) {
	data := []byte(`{"status":"success","message":"Dashboard saved"}`)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		resp := Respond(http.StatusOK, data)
		_ = resp.Body()
	}
}
