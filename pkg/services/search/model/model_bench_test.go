package model

import (
	"fmt"
	"sort"
	"testing"
)

func generateHitList(n int) HitList {
	hits := make(HitList, n)
	for i := range n {
		hitType := DashHitDB
		if i%5 == 0 {
			hitType = DashHitFolder
		}
		hits[i] = &Hit{
			ID:          int64(i),
			UID:         fmt.Sprintf("uid-%d", i),
			OrgID:       1,
			Title:       fmt.Sprintf("Dashboard %d with Some Title", n-i),
			URI:         fmt.Sprintf("db/dashboard-%d", i),
			URL:         fmt.Sprintf("/d/uid-%d/dashboard-%d", i, i),
			Type:        hitType,
			Tags:        []string{"monitoring", "grafana", "alerts"},
			FolderUID:   fmt.Sprintf("folder-%d", i%10),
			FolderTitle: fmt.Sprintf("Folder %d", i%10),
		}
	}
	return hits
}

func BenchmarkHitListSort_100(b *testing.B) {
	original := generateHitList(100)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		hits := make(HitList, len(original))
		copy(hits, original)
		sort.Sort(hits)
	}
}

func BenchmarkHitListSort_1000(b *testing.B) {
	original := generateHitList(1000)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		hits := make(HitList, len(original))
		copy(hits, original)
		sort.Sort(hits)
	}
}

func BenchmarkHitListSort_5000(b *testing.B) {
	original := generateHitList(5000)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		hits := make(HitList, len(original))
		copy(hits, original)
		sort.Sort(hits)
	}
}

func BenchmarkHitListSortTags_1000(b *testing.B) {
	hits := generateHitList(1000)
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		for _, hit := range hits {
			sort.Strings(hit.Tags)
		}
	}
}
