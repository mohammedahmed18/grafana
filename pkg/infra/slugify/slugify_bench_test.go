package slugify

import (
	"fmt"
	"testing"
)

func BenchmarkSlugify_Short(b *testing.B) {
	input := "My Dashboard"
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		_ = Slugify(input)
	}
}

func BenchmarkSlugify_Medium(b *testing.B) {
	input := "Production Kubernetes Cluster Overview Dashboard"
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		_ = Slugify(input)
	}
}

func BenchmarkSlugify_Long(b *testing.B) {
	input := "This is a very long dashboard title that exceeds fifty characters and will trigger the SHA1 hash path"
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		_ = Slugify(input)
	}
}

func BenchmarkSlugify_Unicode(b *testing.B) {
	input := "Dashboard für Überwachung"
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		_ = Slugify(input)
	}
}

func BenchmarkSlugify_Batch1000(b *testing.B) {
	inputs := make([]string, 1000)
	for i := range 1000 {
		inputs[i] = fmt.Sprintf("Dashboard Title %d for Testing", i)
	}
	b.ResetTimer()
	b.ReportAllocs()
	for range b.N {
		for _, input := range inputs {
			_ = Slugify(input)
		}
	}
}
