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

/**
 * Builds a dasharray that selectively shows only the segments that are "active"
 * (i.e., represent value, not track). The inactive segments are turned into gaps.
 *
 * For each segment i:
 *   - segmentAngle = percentage(value_at_segment_i) * angleRange
 *   - isTrack = segmentAngle < startValueAngle || segmentAngle >= startValueAngle + endValueAngle
 *   - If it's a value segment, dash = segmentArcLength, gap = gapLength
 *   - If it's a track segment, dash = 0, gap = segmentArcLength + gapLength (skip it)
 *
 * Consecutive same-type entries are merged to keep the dasharray compact.
 */
function computeSelectiveDashArray(
  segmentCount: number,
  segmentArcLengthDeg: number,
  angleBetweenSegments: number,
  radius: number,
  fieldDisplay: FieldDisplay,
  min: number,
  max: number,
  angleRange: number,
  startValueAngle: number,
  endValueAngle: number,
  invert: boolean
): string {
  const segmentArcLength = Math.max((segmentArcLengthDeg * Math.PI * radius) / 180, 0.01);
  const gapArcLength = Math.max((angleBetweenSegments * Math.PI * radius) / 180, 0.01);
  const slotLength = segmentArcLength + gapArcLength;

  const parts: number[] = [];
  let pendingDash = 0;
  let pendingGap = 0;

  for (let i = 0; i < segmentCount; i++) {
    const value = min + ((max - min) / segmentCount) * i;
    const segmentAngle = getValuePercentageForValue(fieldDisplay, value) * angleRange;
    const isTrack = segmentAngle < startValueAngle || segmentAngle >= startValueAngle + endValueAngle;
    const showThis = invert ? isTrack : !isTrack;

    if (showThis) {
      // Flush any pending gap before this dash
      if (pendingGap > 0) {
        parts.push(0, pendingGap);
        pendingGap = 0;
      }
      pendingDash += segmentArcLength;
      pendingGap += gapArcLength;
    } else {
      // Flush any pending dash
      if (pendingDash > 0) {
        parts.push(pendingDash, pendingGap);
        pendingDash = 0;
        pendingGap = 0;
      }
      pendingGap += slotLength;
    }
  }

  // Flush remaining
  if (pendingDash > 0) {
    parts.push(pendingDash, pendingGap);
  } else if (pendingGap > 0) {
    parts.push(0, pendingGap);
  }

  return parts.join(' ');
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
    const segmentCountAdjusted = getOptimalSegmentCount(dimensions, segmentSpacing, segmentCount, angleRange);
    const [min, max] = getFieldConfigMinMax(fieldDisplay);
    const angleBetweenSegments = getAngleBetweenSegments(segmentSpacing, segmentCount, angleRange);
    const segmentArcLengthDeg = angleRange / segmentCountAdjusted - angleBetweenSegments;
    const displayProcessor = getFieldDisplayProcessor(fieldDisplay);

    const { radius, centerX, centerY, barWidth, vizHeight, vizWidth } = dimensions;

    // Compute the full arc path spanning the entire angle range
    const fullArcPath = useMemo(
      () => drawRadialArcPath(startAngle + 0.01, angleRange - 0.01, radius),
      [startAngle, angleRange, radius]
    );

    // Selective dasharray: only value segments visible (for value path)
    const valueDashArray = useMemo(
      () =>
        computeSelectiveDashArray(
          segmentCountAdjusted,
          segmentArcLengthDeg,
          angleBetweenSegments,
          radius,
          fieldDisplay,
          min,
          max,
          angleRange,
          startValueAngle,
          endValueAngle,
          false
        ),
      [
        segmentCountAdjusted,
        segmentArcLengthDeg,
        angleBetweenSegments,
        radius,
        fieldDisplay,
        min,
        max,
        angleRange,
        startValueAngle,
        endValueAngle,
      ]
    );

    // Selective dasharray: only track segments visible (for track path)
    const trackDashArray = useMemo(
      () =>
        computeSelectiveDashArray(
          segmentCountAdjusted,
          segmentArcLengthDeg,
          angleBetweenSegments,
          radius,
          fieldDisplay,
          min,
          max,
          angleRange,
          startValueAngle,
          endValueAngle,
          true
        ),
      [
        segmentCountAdjusted,
        segmentArcLengthDeg,
        angleBetweenSegments,
        radius,
        fieldDisplay,
        min,
        max,
        angleRange,
        startValueAngle,
        endValueAngle,
      ]
    );

    // For non-gradient mode, determine the dominant value color.
    // All value segments share the same gradient or a single representative color.
    const valueColor = useMemo(() => {
      if (gradient) {
        return undefined;
      }
      // Use the midpoint value of the active range to pick a representative color
      const midValue = min + ((max - min) * (startValueAngle + endValueAngle / 2)) / angleRange;
      return displayProcessor(midValue).color ?? FALLBACK_COLOR;
    }, [gradient, min, max, startValueAngle, endValueAngle, angleRange, displayProcessor]);

    const trackColor = theme.colors.border.medium;

    // For gradient mode, build the CSS gradient and mask similarly to RadialArcPath
    const isGradient = !!gradient;

    const boxX = Math.round(centerX - radius - barWidth);
    const boxY = Math.round(centerY - radius - barWidth);
    const boxSize = Math.ceil((radius + barWidth) * 2);

    // Apply glow filter, respecting the Safari workaround
    const effectiveGlowFilter = IS_SAFARI && isGradient ? undefined : glowFilter;

    const trackPath = (
      <path
        d={fullArcPath}
        transform={`translate(${centerX}, ${centerY})`}
        strokeWidth={barWidth}
        strokeLinecap="butt"
        fill="none"
        stroke={trackColor}
        strokeDasharray={trackDashArray}
        data-testid={selectors.components.Panels.Visualization.Gauge.Track}
      />
    );

    let valueContent: React.ReactNode;

    if (isGradient) {
      const vizStartAngle = shape === 'circle' ? 0 : ARC_START;
      const vizEndAngle = shape === 'circle' ? 360 : ARC_END;
      const gradientCss = getGradientCss(gradient, vizStartAngle, vizEndAngle);

      const maskPathEl = (
        <path
          d={fullArcPath}
          transform={`translate(${centerX}, ${centerY})`}
          strokeWidth={barWidth}
          strokeLinecap="butt"
          fill="none"
          stroke="white"
          strokeDasharray={valueDashArray}
        />
      );

      valueContent = (
        <>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse">
              <rect x={0} y={0} width={vizWidth} height={vizHeight} fill="black" />
              {maskPathEl}
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
            <div
              style={{
                width: boxSize,
                height: boxSize,
                backgroundImage: gradientCss,
              }}
            />
          </foreignObject>
        </>
      );
    } else {
      valueContent = (
        <path
          d={fullArcPath}
          transform={`translate(${centerX}, ${centerY})`}
          strokeWidth={barWidth}
          strokeLinecap="butt"
          fill="none"
          stroke={valueColor}
          strokeDasharray={valueDashArray}
          data-testid={selectors.components.Panels.Visualization.Gauge.Bar}
        />
      );
    }

    const inner = (
      <>
        {trackPath}
        {valueContent}
      </>
    );

    return <g>{effectiveGlowFilter ? <g filter={effectiveGlowFilter}>{inner}</g> : inner}</g>;
  }
);

RadialBarSegmented.displayName = 'RadialBarSegmented';
