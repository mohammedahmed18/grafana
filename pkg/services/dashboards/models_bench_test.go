package dashboards

import (
	"testing"
)

func BenchmarkGetDashboardURL(b *testing.B) {
	b.ReportAllocs()
	for range b.N {
		_ = GetDashboardURL("abc123def", "my-production-dashboard")
	}
}

func BenchmarkGetFolderURL(b *testing.B) {
	b.ReportAllocs()
	for range b.N {
		_ = GetFolderURL("folder-uid-1", "my-folder")
	}
}

func BenchmarkGetDashboardFolderURL(b *testing.B) {
	b.ReportAllocs()
	for range b.N {
		_ = GetDashboardFolderURL(false, "abc123def", "my-dashboard")
		_ = GetDashboardFolderURL(true, "folder-uid", "my-folder")
	}
}
