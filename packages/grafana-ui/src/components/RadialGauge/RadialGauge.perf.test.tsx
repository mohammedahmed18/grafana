import { render } from '@testing-library/react';

import { RadialGaugeExample } from './RadialGauge.story';

interface BenchmarkResult {
  scenario: string;
  renderTimeMs: number;
  domElementCount: number;
  svgPathCount: number;
  foreignObjectCount: number;
  maskCount: number;
}

function countElements(container: HTMLElement) {
  return {
    domElementCount: container.querySelectorAll('*').length,
    svgPathCount: container.querySelectorAll('path').length,
    foreignObjectCount: container.querySelectorAll('foreignObject').length,
    maskCount: container.querySelectorAll('mask').length,
  };
}

function benchmarkRender(
  scenario: string,
  renderFn: () => ReturnType<typeof render>,
  iterations = 5
): BenchmarkResult {
  const times: number[] = [];
  let lastResult: ReturnType<typeof render> | null = null;

  for (let i = 0; i < iterations; i++) {
    // Cleanup previous render
    if (lastResult) {
      lastResult.unmount();
    }

    const start = performance.now();
    lastResult = renderFn();
    const end = performance.now();
    times.push(end - start);
  }

  const elements = countElements(lastResult!.container);
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;

  lastResult!.unmount();

  return {
    scenario,
    renderTimeMs: avgTime,
    ...elements,
  };
}

function renderGaugeGrid(count: number, props: Record<string, unknown>) {
  const gauges: React.ReactNode[] = [];
  for (let i = 0; i < count; i++) {
    gauges.push(<RadialGaugeExample key={i} value={30 + (i * 40) / count} {...props} />);
  }
  return render(<div>{gauges}</div>);
}

describe('RadialGauge Performance Benchmarks', () => {
  const results: BenchmarkResult[] = [];

  afterAll(() => {
    // Print summary table
    // eslint-disable-next-line no-console
    console.log('\n=== PERFORMANCE BENCHMARK RESULTS ===');
    // eslint-disable-next-line no-console
    console.log(
      [
        'Scenario'.padEnd(55),
        'Avg Time (ms)'.padStart(15),
        'DOM Elements'.padStart(14),
        'SVG Paths'.padStart(12),
        'ForeignObj'.padStart(12),
        'Masks'.padStart(8),
      ].join(' | ')
    );
    // eslint-disable-next-line no-console
    console.log('-'.repeat(120));
    for (const r of results) {
      // eslint-disable-next-line no-console
      console.log(
        [
          r.scenario.padEnd(55),
          r.renderTimeMs.toFixed(2).padStart(15),
          String(r.domElementCount).padStart(14),
          String(r.svgPathCount).padStart(12),
          String(r.foreignObjectCount).padStart(12),
          String(r.maskCount).padStart(8),
        ].join(' | ')
      );
    }
    // eslint-disable-next-line no-console
    console.log('='.repeat(120));
  });

  describe('Single gauge comparisons', () => {
    it('non-segmented, no gradient', () => {
      const result = benchmarkRender('1x non-segmented, no gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={0} gradient={false} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('non-segmented, with gradient', () => {
      const result = benchmarkRender('1x non-segmented, with gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={0} gradient={true} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (10), no gradient', () => {
      const result = benchmarkRender('1x segmented(10), no gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={10} gradient={false} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (10), with gradient', () => {
      const result = benchmarkRender('1x segmented(10), with gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={10} gradient={true} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (20), no gradient', () => {
      const result = benchmarkRender('1x segmented(20), no gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={20} gradient={false} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (20), with gradient', () => {
      const result = benchmarkRender('1x segmented(20), with gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={20} gradient={true} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (40), no gradient', () => {
      const result = benchmarkRender('1x segmented(40), no gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={40} gradient={false} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (40), with gradient', () => {
      const result = benchmarkRender('1x segmented(40), with gradient', () =>
        render(<RadialGaugeExample value={70} segmentCount={40} gradient={true} />)
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Grid of 20 gauges', () => {
    it('non-segmented, no gradient', () => {
      const result = benchmarkRender('20x non-segmented, no gradient', () =>
        renderGaugeGrid(20, { segmentCount: 0, gradient: false })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('non-segmented, with gradient', () => {
      const result = benchmarkRender('20x non-segmented, with gradient', () =>
        renderGaugeGrid(20, { segmentCount: 0, gradient: true })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (20), no gradient', () => {
      const result = benchmarkRender('20x segmented(20), no gradient', () =>
        renderGaugeGrid(20, { segmentCount: 20, gradient: false })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (20), with gradient', () => {
      const result = benchmarkRender('20x segmented(20), with gradient', () =>
        renderGaugeGrid(20, { segmentCount: 20, gradient: true })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (40), no gradient', () => {
      const result = benchmarkRender('20x segmented(40), no gradient', () =>
        renderGaugeGrid(20, { segmentCount: 40, gradient: false })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (40), with gradient', () => {
      const result = benchmarkRender('20x segmented(40), with gradient', () =>
        renderGaugeGrid(20, { segmentCount: 40, gradient: true })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Grid of 50 gauges', () => {
    it('non-segmented, no gradient', () => {
      const result = benchmarkRender('50x non-segmented, no gradient', () =>
        renderGaugeGrid(50, { segmentCount: 0, gradient: false })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (20), no gradient', () => {
      const result = benchmarkRender('50x segmented(20), no gradient', () =>
        renderGaugeGrid(50, { segmentCount: 20, gradient: false })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (40), no gradient', () => {
      const result = benchmarkRender('50x segmented(40), no gradient', () =>
        renderGaugeGrid(50, { segmentCount: 40, gradient: false })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });

    it('segmented (40), with gradient', () => {
      const result = benchmarkRender('50x segmented(40), with gradient', () =>
        renderGaugeGrid(50, { segmentCount: 40, gradient: true })
      );
      results.push(result);
      expect(result.renderTimeMs).toBeGreaterThan(0);
    });
  });

  describe('Re-render performance', () => {
    it('re-render segmented (20) gauge with value change', () => {
      // First render
      const { rerender, container, unmount } = render(
        <RadialGaugeExample value={30} segmentCount={20} gradient={false} />
      );

      const rerenderTimes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        rerender(<RadialGaugeExample value={30 + i * 10} segmentCount={20} gradient={false} />);
        const end = performance.now();
        rerenderTimes.push(end - start);
      }

      const avgRerender = rerenderTimes.reduce((a, b) => a + b, 0) / rerenderTimes.length;
      const elements = countElements(container);

      unmount();

      results.push({
        scenario: 'Re-render segmented(20), no gradient',
        renderTimeMs: avgRerender,
        ...elements,
      });

      expect(avgRerender).toBeGreaterThan(0);
    });

    it('re-render segmented (20) gauge with gradient and value change', () => {
      const { rerender, container, unmount } = render(
        <RadialGaugeExample value={30} segmentCount={20} gradient={true} />
      );

      const rerenderTimes: number[] = [];
      for (let i = 0; i < 5; i++) {
        const start = performance.now();
        rerender(<RadialGaugeExample value={30 + i * 10} segmentCount={20} gradient={true} />);
        const end = performance.now();
        rerenderTimes.push(end - start);
      }

      const avgRerender = rerenderTimes.reduce((a, b) => a + b, 0) / rerenderTimes.length;
      const elements = countElements(container);

      unmount();

      results.push({
        scenario: 'Re-render segmented(20), with gradient',
        renderTimeMs: avgRerender,
        ...elements,
      });

      expect(avgRerender).toBeGreaterThan(0);
    });
  });
});
