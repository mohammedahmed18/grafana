import { memo, useId, useMemo } from 'react';

import { FALLBACK_COLOR, type FieldDisplay } from '@grafana/data';
import { selectors } from '@grafana/e2e-selectors';

import { useTheme2 } from '../../themes/ThemeContext';

import { getGradientCss } from './colors';
import { ARC_END, ARC_START } from './constants';
import { type RadialShape, type RadialGaugeDimensions, type GradientStop } from './types';
import {
  drawRadialArcPath,
  getAngleBetweenSegments,
  getFieldConfigMinMax,
  getFieldDisplayProcessor,
  getOptimalSegmentCount,
  getValuePercentageForValue,
  IS_SAFARI,
} from './utils';

export interface RadialBarSegmentedProps {
  fieldDisplay: FieldDisplay;
  dimensions: RadialGaugeDimensions;
  angleRange: number;
  startAngle: number;
  startValueAngle: number;
  endValueAngle: number;
  glowFilter?: string;
  segmentCount: number;
  segmentSpacing: number;
  shape: RadialShape;
  gradient?: GradientStop[];
}

function degreesToArcLength(degrees: number, radius: number): number {
  return Math.max((degrees * Math.PI * radius) / 180, 0.01);
}

/**
 * Builds a stroke-dasharray string that makes only selected segments visible on a
 * single full-span arc path. Instead of rendering N separate <path> elements, we
 * render one path and use dasharray to "punch holes" for segments we don't want.
 *
 * When invert=false: shows value segments, hides track segments.
 * When invert=true: shows track segments, hides value segments.
 */
function computeSegmentDashArray(
  segmentCount: number,
  segmentArcDeg: number,
  gapDeg: number,
  radius: number,
  fieldDisplay: FieldDisplay,
  min: number,
  max: number,
  angleRange: number,
  startValueAngle: number,
  endValueAngle: number,
  invert: boolean
): string {
  const segmentLen = degreesToArcLength(segmentArcDeg, radius);
  const gapLen = degreesToArcLength(gapDeg, radius);
  const slotLen = segmentLen + gapLen;

  const parts: number[] = [];
  let pendingGap = 0;

  for (let i = 0; i < segmentCount; i++) {
    const value = min + ((max - min) / segmentCount) * i;
    const segmentAngle = getValuePercentageForValue(fieldDisplay, value) * angleRange;
    const isTrack = segmentAngle < startValueAngle || segmentAngle >= startValueAngle + endValueAngle;
    const visible = invert ? isTrack : !isTrack;

    if (visible) {
      if (pendingGap > 0) {
        parts.push(0, pendingGap);
        pendingGap = 0;
      }
      parts.push(segmentLen, gapLen);
    } else {
      pendingGap += slotLen;
    }
  }

  if (pendingGap > 0) {
    parts.push(0, pendingGap);
  }

  return parts.join(' ');
}

/**
 * Builds a conic-gradient with hard color stops that matches the per-segment coloring
 * from the display processor. Each value segment gets its own color band; track
 * segments are transparent. This replaces the old N-element approach while preserving
 * the visual per-segment color variation (e.g. threshold colors).
 */
function buildPerSegmentGradient(
  segmentCount: number,
  angleRange: number,
  fieldDisplay: FieldDisplay,
  min: number,
  max: number,
  startValueAngle: number,
  endValueAngle: number,
  displayProcessor: (value: number) => { color?: string },
  startAngle: number
): string {
  const slotDeg = angleRange / segmentCount;
  const stops: string[] = [];

  for (let i = 0; i < segmentCount; i++) {
    const value = min + ((max - min) / segmentCount) * i;
    const segmentAngle = getValuePercentageForValue(fieldDisplay, value) * angleRange;
    const isTrack = segmentAngle < startValueAngle || segmentAngle >= startValueAngle + endValueAngle;

    if (!isTrack) {
      const color = displayProcessor(value).color ?? FALLBACK_COLOR;
      const segStart = (slotDeg * i).toFixed(2);
      const segEnd = (slotDeg * (i + 1)).toFixed(2);
      stops.push(`${color} ${segStart}deg ${segEnd}deg`);
    }
  }

  if (stops.length === 0) {
    return `conic-gradient(from ${startAngle}deg, transparent 0deg ${angleRange}deg)`;
  }

  return `conic-gradient(from ${startAngle}deg, ${stops.join(', ')})`;
}

export const RadialBarSegmented = memo(
  ({
    fieldDisplay,
    dimensions,
    startAngle,
    angleRange,
    glowFilter,
    gradient,
    segmentCount,
    segmentSpacing,
    shape,
    startValueAngle,
    endValueAngle,
  }: RadialBarSegmentedProps) => {
    const theme = useTheme2();
    const maskId = useId();

    const { radius, centerX, centerY, barWidth, vizHeight, vizWidth } = dimensions;
    const segmentCountAdjusted = getOptimalSegmentCount(dimensions, segmentSpacing, segmentCount, angleRange);
    const [min, max] = getFieldConfigMinMax(fieldDisplay);
    const gapDeg = getAngleBetweenSegments(segmentSpacing, segmentCount, angleRange);
    const segmentArcDeg = angleRange / segmentCountAdjusted - gapDeg;
    const displayProcessor = getFieldDisplayProcessor(fieldDisplay);

    // --- Memoized geometry ---

    const fullArcPath = useMemo(
      () => drawRadialArcPath(startAngle + 0.01, angleRange - 0.01, radius),
      [startAngle, angleRange, radius]
    );

    const dashArrayArgs = [
      segmentCountAdjusted, segmentArcDeg, gapDeg, radius,
      fieldDisplay, min, max, angleRange, startValueAngle, endValueAngle,
    ] as const;

    const valueDashArray = useMemo(
      () => computeSegmentDashArray(...dashArrayArgs, false),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      dashArrayArgs
    );

    const trackDashArray = useMemo(
      () => computeSegmentDashArray(...dashArrayArgs, true),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      dashArrayArgs
    );

    // --- Colors ---

    const trackColor = theme.colors.border.medium;

    const gradientCss = useMemo(() => {
      if (gradient) {
        const vizStartAngle = shape === 'circle' ? 0 : ARC_START;
        const vizEndAngle = shape === 'circle' ? 360 : ARC_END;
        return getGradientCss(gradient, vizStartAngle, vizEndAngle);
      }
      return buildPerSegmentGradient(
        segmentCountAdjusted, angleRange, fieldDisplay, min, max,
        startValueAngle, endValueAngle, displayProcessor, startAngle
      );
    }, [
      gradient, shape, segmentCountAdjusted, angleRange, fieldDisplay,
      min, max, startValueAngle, endValueAngle, displayProcessor, startAngle,
    ]);

    // Safari can't combine glow filters with gradient masks
    const effectiveGlowFilter = IS_SAFARI && !!gradient ? undefined : glowFilter;

    // --- Shared path attributes ---

    const pathTransform = `translate(${centerX}, ${centerY})`;
    const sharedPathProps = {
      d: fullArcPath,
      transform: pathTransform,
      strokeWidth: barWidth,
      strokeLinecap: 'butt' as const,
      fill: 'none',
    };

    // --- Render ---

    const boxX = Math.round(centerX - radius - barWidth);
    const boxY = Math.round(centerY - radius - barWidth);
    const boxSize = Math.ceil((radius + barWidth) * 2);

    const trackPath = (
      <path
        {...sharedPathProps}
        stroke={trackColor}
        strokeDasharray={trackDashArray}
        data-testid={selectors.components.Panels.Visualization.Gauge.Track}
      />
    );

    const valuePath = (
      <>
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
            <rect x={0} y={0} width={vizWidth} height={vizHeight} fill="black" />
            <path {...sharedPathProps} stroke="white" strokeDasharray={valueDashArray} />
          </mask>
        </defs>
        <foreignObject
          x={boxX}
          y={Math.max(boxY, 0)}
          width={Math.max(vizWidth, boxSize)}
          height={Math.max(vizHeight, boxSize)}
          mask={`url(#${maskId})`}
          data-testid={selectors.components.Panels.Visualization.Gauge.Bar}
        >
          <div style={{ width: boxSize, height: boxSize, backgroundImage: gradientCss }} />
        </foreignObject>
      </>
    );

    const inner = (
      <>
        {trackPath}
        {valuePath}
      </>
    );

    return <g>{effectiveGlowFilter ? <g filter={effectiveGlowFilter}>{inner}</g> : inner}</g>;
  }
);

RadialBarSegmented.displayName = 'RadialBarSegmented';
